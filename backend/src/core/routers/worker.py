import logging

import fitz
import openai
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from google.cloud import tasks_v2
from pydantic import Field
from pydantic_core import ValidationError

from src.dependencies.cloud_tasks import get_cloud_tasks_client, get_queue_path
import src.core.services.firebase_driver as firebase_driver
from src.dependencies.external import get_openai_client
from src.core.services.endpoints import projection
from src.core.services.firebase_client import FirebaseClient, get_firebase_client
from src.core.services.openai_client import extract_document_information
from src.core.services.upload import generate_summary, pdf_processor
from src.core.services.worker import cloud_tasks, models, chat_client
from src.settings import Settings
from src.schemas.documents import Documents, Item
from src.repositories.abstract import DocumentRepository
from src.dependencies.document_repository import get_document_repository

from ._base import BaseJSONSchema


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix='/worker', tags=['worker'])


def extract_headding_text(
    pdf_document: fitz.Document,
    text_length: int = 2000,
) -> str:
    full_text_list = []
    for page in pdf_document:
        full_text_list.append(page.get_text())

    full_text = "".join(full_text_list)
    extracted_text = full_text[:text_length]
    return extracted_text


@router.post('/file:separate')
async def worker_file_separate(
    request: Request,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    cloud_tasks_client: tasks_v2.CloudTasksClient = Depends(get_cloud_tasks_client),
    queue_path: str = Depends(get_queue_path),
):
    """
    upload/taskが完了した時点でファイルのURLが取得できるようになっている状態。
    このタスクでは、ファイル分割と画像化をして保存し、それが終わったら画像ごとの処理を実行するようにする。
    """
    raw_body = await request.body()
    if not raw_body:
        logger.error("No data received. Skipping processing.")
        return {"message": "No data received, processing skipped."}

    metadata = models.SingedUrlMetadata.model_validate_json(raw_body)

    # GCS から PDF をダウンロード
    storage_client = firebase_client.get_storage()
    blob = storage_client.blob(metadata.gcs_path)

    try:
        pdf_binary = blob.download_as_bytes()
    except Exception as e:
        logger.exception(f"Failed to download PDF from GCS. GCS Path: {metadata.gcs_path}")
        raise HTTPException(status_code=500, detail="Failed to download PDF from GCS.")

    # PDFを開いてページ数を取得し、画像化
    max_pages = 0

    try:
        with fitz.open(stream=pdf_binary, filetype="pdf") as pdf_document:
            total_pages = len(pdf_document)
            max_pages = min(Settings.max_pages_to_parse, total_pages)
            logger.info(f"PDF opened. total_pages={total_pages}, max_pages_to_parse={Settings.max_pages_to_parse}")
            extracted_text = extract_headding_text(pdf_document)

            for page_number in range(max_pages):
                #logger.info(f"Converting page {page_number+1}/{max_pages} to image...")
                image_bytes = pdf_processor.convert_pdf_page_to_image(pdf_document, page_number)

                # 画像を GCS にアップロード
                await pdf_processor.upload_image_to_firebase(
                    image_bytes=image_bytes,
                    user_id=metadata.user_id,
                    project_id=metadata.project_id,
                    page_number=page_number,
                    file_uuid=metadata.file_uuid,
                    storage_client=storage_client
                )
                #logger.info(f"Page {page_number+1} upload completed.")

        logger.info("All pages successfully converted and uploaded.")

    except Exception as e:
        logger.exception("Error occurred while splitting PDF.")
        raise HTTPException(status_code=500, detail="Failed to split PDF into images.")

    # 2. サマリーデータを解析する処理（ファイル一覧に表示するための基本情報）
    payload_summary = models.SummaryMetadata(
        user_id=metadata.user_id,
        file_uuid=metadata.file_uuid,
        file_name=metadata.filename,
        summary_text=extracted_text,
    )
    worker_summary_url = f'{Settings.google_cloud.api_base_url}/worker/summary:analyze'
    task = cloud_tasks.create_task_payload(worker_summary_url, payload_summary)

    try:
        response = cloud_tasks_client.create_task(parent=queue_path, task=task)
        eta = response.schedule_time.strftime("%m/%d/%Y, %H:%M:%S")
        logger.info(f"Task created successfully: {response.name}, {eta}")

    except Exception as e:
        logger.error(f"Error occurred while creating a task: {e}")

    try:
        # pageごとの解析
        for page_number in range(max_pages):
            # page要素の抽出
            payload_page = models.PageMetadata(
                user_id=metadata.user_id,
                project_id=metadata.project_id,
                file_uuid=metadata.file_uuid,
                file_name=metadata.filename,
                page_number=str(page_number),
                max_page_number=str(max_pages),
            )

            # 3. 画像ごと文章情報を解析する処理
            worker_page_analyze_url = f'{Settings.google_cloud.api_base_url}/worker/page:analyze'
            task_page = cloud_tasks.create_task_payload(worker_page_analyze_url, payload_page)
            response = cloud_tasks_client.create_task(parent=queue_path, task=task_page)
            eta = response.schedule_time.strftime("%m/%d/%Y, %H:%M:%S")
            #logger.info(f"Page analyze task created successfully: {response.name}, {eta}")

            # 4. 画像ごと数値情報を解析する処理（事業計画用）
            worker_projection_url = f'{Settings.google_cloud.api_base_url}/worker/projection:analyze'
            task_projection = cloud_tasks.create_task_payload(worker_projection_url, payload_page)
            response = cloud_tasks_client.create_task(parent=queue_path, task=task_projection)
            eta = response.schedule_time.strftime("%m/%d/%Y, %H:%M:%S")
            #logger.info(f"Projection analyze task created successfully: {response.name}, {eta}")

    except Exception as e:
        logger.error(f"Error occurred while creating a task for each page: {e}")

    return {"message": "PDF splitting and image upload completed successfully."}


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

    metadata = models.SummaryMetadata.model_validate_json(raw_body)

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

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving project: {str(e)}")

    return JSONResponse({"status": "success"}, status_code=200)


@router.post('/page:analyze')
async def worker_page_analyze(
    request: Request,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    openai_client: openai.ChatCompletion = Depends(get_openai_client),
    cloud_tasks_client: tasks_v2.CloudTasksClient = Depends(get_cloud_tasks_client),
    queue_path: str = Depends(get_queue_path),
    doc_repository: DocumentRepository = Depends(get_document_repository),
):
    """
    Cloud Tasks からPOSTされる個別のページを分析する
    """
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
        metadata = models.PageMetadata.model_validate_json(raw_body)

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

    #logger.info(f'page number: {metadata.page_number}')

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
        #logger.info(f'result saved for page_number: {metadata.page_number}')

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving project: {str(e)}")

    # ベクトルDB Weaviateへの保存
    try:
        #logger.info(f'started uploading to weaviate, client status:{doc_repository.client.is_ready()}')
        items = Item(
            user_id=metadata.user_id,
            project_id=project_id,
            file_uuid=metadata.file_uuid,
            file_name=metadata.file_name,
            page_number=str(metadata.page_number),
            transcription=transcription_report.transcription,
        )
        documents = Documents(items=[items])
        doc_repository.add_documents(documents)

    except Exception as e:
        logger.error(f'failed to upload data to weaviate cloud{e}', exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error saving to weaviate cloud: {str(e)}")

    finally:
        doc_repository.client.close()

    # 最終ページの処理だった場合、タスクに追加する
    if int(metadata.page_number) == (int(metadata.max_page_number)-1):
        logger.info(f'final page processing: {metadata.page_number}, {metadata.max_page_number}')
        payload = models.PageMetadata(
            user_id=metadata.user_id,
            project_id=metadata.project_id,
            file_uuid=metadata.file_uuid,
            file_name=metadata.file_name,
            page_number=str(metadata.page_number),
            max_page_number=str(metadata.max_page_number),
        )
        worker_page_analyze_url = f'{Settings.google_cloud.api_base_url}/worker/analyst:analyze'
        task_page = cloud_tasks.create_task_payload(worker_page_analyze_url, payload)
        response = cloud_tasks_client.create_task(parent=queue_path, task=task_page)
        eta = response.schedule_time.strftime("%m/%d/%Y, %H:%M:%S")
        logger.info(f"analyst view analyze task created successfully: {response.name}, {eta}")

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
        metadata = models.PageMetadata.model_validate_json(raw_body)

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

    except Exception as e:
        logger.error(f"Failed to create summary {metadata.page_number}: {e}")
        return {"message": f"Skipping page {metadata.page_number} because gpt error"}

    return JSONResponse({"status": "success", "received": metadata.page_number}, status_code=200)


class ParameterSummaries(BaseJSONSchema):
    page_number: int
    facts: str
    issues: str
    rationale: str
    forecast: str
    investigation: str
    transcription: str


class ResGetParameterSummary(BaseJSONSchema):
    """GET `/parameter/summary` request schema."""

    data: list[ParameterSummaries] = Field(None, description='ページごとの分析結果')


def get_conbined_transcription(
    items: list[firebase_driver.ResAnalystReportItem],
) -> str:
    combined_transcription = "\n".join(item.transcription for item in items if item.transcription)
    return combined_transcription


@router.post('/analyst:analyze')
async def worker_analyst_analyze(
    request: Request,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    openai_client: openai.ChatCompletion = Depends(get_openai_client),
):
    """
    Cloud Tasks からPOSTされる全ての文章をもとに、analyst viewで分析をする
    全ての処理が終わった後に実行される
    """
    # Firestore, Storageのクライアント取得
    firestore_client = firebase_client.get_firestore()

    # リクエストボディを読み込み。なければログを出して終了
    raw_body = await request.body()
    if not raw_body:
        logger.error("No data received. Skipping processing.")
        return {"message": "No data received, processing skipped."}
    metadata = models.PageMetadata.model_validate_json(raw_body)

    data = firebase_driver.fetch_page_summary(
        firestore_client,
        metadata.user_id,
        metadata.file_uuid,
    )
    conbined_transcription = get_conbined_transcription(data)
    result_sentence = chat_client.create_response(openai_client, conbined_transcription)

    try:
        firebase_driver.save_worker_analyst_report(
            firestore_client=firestore_client,
            user_id=metadata.user_id,
            project_id=metadata.project_id,
            file_uuid=metadata.file_uuid,
            result_sentence=result_sentence,
        )

    except Exception as e:
        logger.error(f"Failed to create analyst summary {metadata.page_number}: {e}")
        return {"message": f"Skipping page {metadata.page_number} because gpt error"}

    logger.info(f'worker/analyst:analyze analyst resport successfully created')
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
