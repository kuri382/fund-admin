import logging

import openai
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from google.cloud import tasks_v2
from pydantic_core import ValidationError

from src.core.dependencies.cloud_tasks import get_cloud_tasks_client, get_queue_path
import src.core.services.firebase_driver as firebase_driver
from src.core.dependencies.external import get_openai_client
from src.core.services.endpoints import projection
from src.core.services.firebase_client import FirebaseClient, get_firebase_client
from src.core.services.openai_client import extract_document_information
from src.core.services.upload import generate_summary, pdf_processor
from src.core.services.worker import models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix='/worker', tags=['worker'])


@router.post('/summary:analyze')
async def worker_summary_analyze(
    request: Request,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    openai_client: openai.ChatCompletion = Depends(get_openai_client),
):
    """
    Cloud Tasks からPOSTされる
    Summaryを出力する
    """
    firestore_client = firebase_client.get_firestore()

    raw_body = await request.body()

    if not raw_body:
        logger.error("No data received. Skipping processing.")
        return {"message": "No data received, processing skipped."}

    metadata = models.SummaryMetadata.parse_raw(raw_body)
    analysis_result = extract_document_information(openai_client=openai_client, content_text=metadata.summary_text)

    try:
        firebase_driver.save_analysis_result(
            firestore_client=firestore_client,
            user_id=metadata.user_id,
            file_uuid=metadata.file_uuid,
            file_name=metadata.file_name,
            analysis_result=analysis_result,
            target_collection='documents',
        )
        logger.info(f'Summary result saved: {metadata.file_name}')

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving project: {str(e)}")

    return JSONResponse({"status": "success"}, status_code=200)


@router.post('/page:analyze')
async def worker_page_analyze(
    request: Request,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    openai_client: openai.ChatCompletion = Depends(get_openai_client),
):
    """
    Cloud Tasks からPOSTされる個別のページを分析する
    """
    logger.info("start page analysis worker")

    # Firestore, Storageのクライアント取得
    firestore_client = firebase_client.get_firestore()
    storage_client = firebase_client.get_storage()

    # リクエストボディを読み込み。なければログを出して終了
    raw_body = await request.body()
    if not raw_body:
        logger.error("No data received. Skipping processing.")
        return {"message": "No data received, processing skipped."}

    # metadataのパース。ValidationErrorやJSONデコードエラーを別々にハンドリングする
    try:
        metadata = models.PageMetadata.parse_raw(raw_body)

    except ValidationError as e:
        # フィールドが足りない、型が合わないなどPydanticでのバリデーション失敗
        logger.error(f"Failed to parse metadata: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid metadata: {e}"
        )

    except Exception as e:
        # JSONデコード失敗など、Pydantic以外の部分で起こりうる例外
        logger.error(f"Unexpected error while parsing metadata: {e}")
        raise HTTPException(
            status_code=400,
            detail="Unable to parse metadata"
        )

    # project_idを取得する
    try:
        project_id = firebase_driver.get_project_id(metadata.user_id, firestore_client)

    except Exception as e:
        detail = f'error loading project id: {str(e)}'
        raise HTTPException(status_code=400, detail=detail)


    logger.info(f'page number: {metadata.page_number}')

    try:
        signed_url = await pdf_processor.generate_signed_url(
            metadata.user_id, project_id, metadata.page_number, metadata.file_uuid, storage_client
        )
        image_base64 = generate_summary.get_encoded_image(signed_url)

    except ValueError as e:
        logger.error(f"Failed to generate signed URL for page {metadata.page_number}: {e}")
        return {"message": f"Skipping page {metadata.page_number} because signed_url is not available."}

    try:
        # GPTでの抽出処理
        # ページからわかる情報を抽出する
        analyst_report = await generate_summary.get_analyst_report(openai_client, image_base64, max_retries=3)
        # ページからわかる転写（直訳に近い情報抽出）を行う
        transcription_report = await generate_summary.get_transcription(openai_client, image_base64, max_retries=3)

    except Exception as e:
        logger.error(f"Failed to create summary {metadata.page_number}: {e}")
        return {"message": f"Skipping page {metadata.page_number} because gpt error"}

    try:
        firebase_driver.save_page_analyst_report(
            firestore_client=firestore_client,
            user_id=metadata.user_id,
            file_uuid=metadata.file_uuid,
            file_name=metadata.file_name,
            page_number=metadata.page_number,
            analyst_report=analyst_report,
            transcription_report=transcription_report,
        )
        logger.info(f'result saved for page_number: {metadata.page_number}')

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving project: {str(e)}")

    return JSONResponse({"status": "success", "received": metadata.page_number}, status_code=200)



@router.post('/projection:analyze')
async def worker_projection_analyze(
    request: Request,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    openai_client: openai.ChatCompletion = Depends(get_openai_client),
):
    """
    Cloud Tasks からPOSTされる個別のページを分析する
    """
    logger.info("start page analysis worker")

    # Firestore, Storageのクライアント取得
    firestore_client = firebase_client.get_firestore()
    storage_client = firebase_client.get_storage()

    # リクエストボディを読み込み。なければログを出して終了
    raw_body = await request.body()
    if not raw_body:
        logger.error("No data received. Skipping processing.")
        return {"message": "No data received, processing skipped."}

    # metadataのパース。ValidationErrorやJSONデコードエラーを別々にハンドリングする
    try:
        metadata = models.PageMetadata.parse_raw(raw_body)

    except ValidationError as e:
        # フィールドが足りない、型が合わないなどPydanticでのバリデーション失敗
        logger.error(f"Failed to parse metadata: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid metadata: {e}"
        )

    except Exception as e:
        # JSONデコード失敗など、Pydantic以外の部分で起こりうる例外
        logger.error(f"Unexpected error while parsing metadata: {e}")
        raise HTTPException(
            status_code=400,
            detail="Unable to parse metadata"
        )

    logger.info(f'page number: {metadata.page_number}')

    try:
        # Projectionの作成
        await projection.process_single_page_profit_and_loss(
            metadata.user_id,
            metadata.file_uuid,
            firestore_client,
            storage_client,
            openai_client,
            metadata.page_number,
        )

        logger.info('projection has been saved')

    except Exception as e:
        logger.error(f"Failed to create summary {metadata.page_number}: {e}")
        return {"message": f"Skipping page {metadata.page_number} because gpt error"}

    return JSONResponse({"status": "success", "received": metadata.page_number}, status_code=200)


@router.get("/count")
async def get_worker_count(
    cloud_tasks_client: tasks_v2.CloudTasksClient = Depends(get_cloud_tasks_client),
    queue_path: str = Depends(get_queue_path)
):
    """
    Cloud Tasksの指定されたキューにあるタスクの数を取得する
    """
    try:
        # キューに登録されているタスクの一覧を取得
        tasks = cloud_tasks_client.list_tasks(parent=queue_path)

        # タスクの数を数える
        task_count = sum(1 for _ in tasks)
        return {"queue": queue_path, "task_count": task_count}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve task count: {str(e)}")
