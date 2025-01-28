import asyncio
import base64
import io
import logging
import os
import uuid

import openai
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from google.cloud import tasks_v2
from pydantic import BaseModel, Field
from pydantic_core import ValidationError

import src.core.services.firebase_driver as firebase_driver
from src.core.dependencies.auth import get_user_id
from src.core.dependencies.cloud_tasks import get_cloud_tasks_client, get_queue_path
from src.core.dependencies.external import get_openai_client
from src.core.services.endpoints import projection
from src.core.services.firebase_client import FirebaseClient, get_firebase_client
from src.core.services.openai_client import extract_document_information
from src.core.services.pdf_processing import extract_text_from_pdf
from src.core.services.upload import generate_summary, pdf_processor, table_processor
from src.core.services.worker import cloud_tasks, models
from src.settings import Settings

router = APIRouter(prefix='/upload', tags=['upload'])
logger = logging.getLogger(__name__)


class Step(BaseModel):
    explanation: str
    output: str


class CustomResponse(BaseModel):
    steps: list[Step]
    opinion: str = Field(
        ...,
        description='アナリスト視点での分析。リスク要素や異常値の確認を相対的・トレンド分析を交えながら行う',
    )
    business_summary: firebase_driver.BusinessSummary


def encode_binaryio_to_base64(image_binary: io.BytesIO) -> str:
    """
    Convert BinaryIO data to a Base64-encoded string.
    Args:
        binary_data (BinaryIO): The binary data to encode.

    Returns:
        str: Base64-encoded string of the binary data.
    """
    image_binary.seek(0)
    binary_content = image_binary.read()
    if not binary_content:
        raise ValueError("Binary data is empty or not readable")
    base64_encoded = base64.b64encode(binary_content).decode('utf-8')
    return base64_encoded


def create_chat_completion_message(system_prompt, prompt, image_base64):
    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": f'{prompt}',
                },
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
                },
            ],
        },
    ]
    return messages


async def upload_image_and_get_base64(pdf_document, user_id, page_number, file_uuid, storage_client):
    """PDFページを画像に変換してFirebaseにアップロードする"""
    image_bytes = pdf_processor.convert_pdf_page_to_image(pdf_document, page_number)
    await pdf_processor.upload_image_to_firebase(image_bytes, user_id, page_number, file_uuid, storage_client)
    return encode_binaryio_to_base64(image_bytes)


async def upload_image(pdf_document, user_id, page_number, file_uuid, storage_client):
    """PDFページを画像に変換してFirebaseにアップロードする"""
    image_bytes = pdf_processor.convert_pdf_page_to_image(pdf_document, page_number)
    await pdf_processor.upload_image_to_firebase(image_bytes, user_id, page_number, file_uuid, storage_client)
    return


async def fetch_and_parse_response(openai_client, image_base64, max_retries=3) -> CustomResponse:
    """OpenAI APIにリクエストを送信し、パースされたレスポンスを取得する。リトライ機能付き"""
    retry_count = 0
    while retry_count < max_retries:
        try:
            response = openai_client.beta.chat.completions.parse(
                model='gpt-4o-2024-08-06',
                messages=[
                    {
                        "role": "system",
                        "content": "あなたはバイサイドアナリストです。厳しい目線で経営・事業の状況を解説します。日本語で回答します。",
                    },
                    {
                        "role": "system",
                        "content": "接頭語に気をつけながら、かならず単位を円で計算しなさい。「百万円」や「億円」をすべて「円」に統一する",
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "次のデータに含まれる情報を、集計期間に気をつけながら段階的に整理します。",
                            },
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
                            },
                        ],
                    },
                ],
                response_format=CustomResponse,
            )
            return response.choices[0].message.parsed

        except ValidationError as e:
            retry_count += 1
            logger.warning(f'Validation error occurred: {e}. Retrying {retry_count}/{max_retries}')
            if retry_count >= max_retries:
                logger.error("Max retries reached. Exiting the retry loop.")
                raise e
            await asyncio.sleep(2)


async def process_pdf_background(
    contents: bytes,
    user_id: str,
    file_uuid: str,
    unique_filename: str,
    storage_client,
    openai_client,
    firestore_client,
    max_pages=Settings.max_pages_to_parse,
):
    """PDFを処理し、各ページを画像化、アップロード、解析を行うメイン関数"""
    pdf_document = await pdf_processor.read_pdf_file(contents)
    max_pages = min(max_pages, len(pdf_document))

    for page_number in range(max_pages):
        logger.info(f"[Page {page_number}/{max_pages}] Start processing.")

        # 画像のBase64エンコード部分
        try:
            logger.debug(f"[Page {page_number}] Starting image upload and encoding.")
            image_base64 = await upload_image_and_get_base64(
                pdf_document, user_id, page_number, file_uuid, storage_client
            )
        except Exception as e:
            logger.error(f"[Page {page_number}] Image upload/encoding failed: {e}", exc_info=True)
            continue

        # 情報抽出部分
        try:
            logger.debug(f"[Page {page_number}] Starting data extraction.")
            analyst_report = await generate_summary.get_analyst_report(openai_client, image_base64)
            transcription_report = await generate_summary.get_transcription(openai_client, image_base64)
            await projection.process_single_page_profit_and_loss(user_id, file_uuid, firestore_client, storage_client, openai_client, page_number)
            logger.info(f"[Page {page_number}] Data extraction completed successfully.")

            if analyst_report is None:
                logger.warning(f"[Page {page_number}] Analyst report is None. Skipping due to validation errors.")
                continue
        except Exception as e:
            logger.error(f"[Page {page_number}] Data extraction failed: {e}", exc_info=True)
            continue

        # Firebase保存部分
        try:
            logger.debug(f"[Page {page_number}] Saving extracted data to Firebase.")
            firebase_driver.save_page_analyst_report(
                firestore_client=firestore_client,
                user_id=user_id,
                file_uuid=file_uuid,
                file_name=unique_filename,
                page_number=page_number,
                analyst_report=analyst_report,
                transcription_report=transcription_report,
            )
            logger.info(f"[Page {page_number}] Data saved to Firebase successfully.")
        except Exception as e:
            logger.error(f"[Page {page_number}] Firebase save failed: {e}", exc_info=True)
            continue

    logger.info("Processing completed for all pages.")



@router.post("")
async def upload_file(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    openai_client: openai.ChatCompletion = Depends(get_openai_client),
    user_id: str = Depends(get_user_id),
):
    try:
        contents = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File read error: {str(e)}")

    file_uuid = uuid.uuid4()
    unique_filename = f"{file_uuid}_{file.filename}"

    try:
        storage_client = firebase_client.get_storage()
        blob = storage_client.blob(f"{user_id}/documents/{unique_filename}")
        blob.upload_from_string(
            contents,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )

    except Exception as e:
        detail = f'error uploading file: {str(e)}'
        raise HTTPException(status_code=400, detail=detail)

    firestore_client = firebase_client.get_firestore()

    file_extension = os.path.splitext(file.filename)[1].lower()
    match file_extension:
        case ".xlsx":
            try:
                content_text = table_processor.convert_xlsx_row_to_text(contents)
                analysis_result = extract_document_information(openai_client=openai_client, content_text=content_text)

            except Exception as e:
                logger.error(f"Error: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error analyzing Excel file: {str(e)}")

            try:
                firebase_driver.save_analysis_result(
                    firestore_client=firestore_client,
                    user_id=user_id,
                    file_name=file.filename,
                    file_uuid=file_uuid,
                    analysis_result=analysis_result,
                    target_collection='tables',
                )

            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error saving csv result: {str(e)}")

        case ".csv":
            try:
                content_text = table_processor.analyze_csv_content(contents)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error converting csv file: {str(e)}")

            try:
                analysis_result = extract_document_information(openai_client=openai_client, content_text=content_text)

            except Exception as e:
                if "rate_limit_exceeded" in str(e) or "Too Many Requests" in str(e):
                    raise HTTPException(
                        status_code=429,
                        detail="Token limit exceeded or too many requests. Please try again later.",
                    )
                raise HTTPException(status_code=500, detail=f"Error analyizing csv file: {str(e)}")

            try:
                firebase_driver.save_analysis_result(
                    firestore_client=firestore_client,
                    user_id=user_id,
                    file_name=file.filename,
                    file_uuid=file_uuid,
                    analysis_result=analysis_result,
                    target_collection='tables',
                )
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error uploading csv file: {str(e)}")

        case ".pdf":
            try:
                pdf_text = extract_text_from_pdf(file)
                pdf_text = pdf_text[:3000] # token数の関係上小さめに
                analysis_result = extract_document_information(openai_client=openai_client, content_text=pdf_text)

            except Exception as e:
                if "rate_limit_exceeded" in str(e) or "Too Many Requests" in str(e):
                    raise HTTPException(
                        status_code=429,
                        detail="Token limit exceeded or too many requests. Please try again later.",
                    )
                raise HTTPException(status_code=500, detail=f"Error analyizing csv file: {str(e)}")

            try:
                firebase_driver.save_analysis_result(
                    firestore_client=firestore_client,
                    user_id=user_id,
                    file_name=file.filename,
                    file_uuid=file_uuid,
                    analysis_result=analysis_result,
                    target_collection='documents',
                )

            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error saving pdf result: {str(e)}")

            try:
                background_tasks.add_task(
                    process_pdf_background,
                    contents,
                    user_id,
                    file_uuid,
                    unique_filename,
                    storage_client,
                    openai_client,
                    firestore_client,
                )
                logger.info('upload finished')

            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Error saving pdf image to storage: {str(e)}",
                )

        case _:
            raise HTTPException(status_code=400, detail="サポートされていないファイル形式です")

    return {"filename": file.filename, "status": "ファイルを解析し保存しました"}


@router.post("/task")
async def create_task(
    file: UploadFile,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    user_id: str = Depends(get_user_id),
    cloud_tasks_client: tasks_v2.CloudTasksClient = Depends(get_cloud_tasks_client),
    queue_path: str = Depends(get_queue_path),
):
    """
    Cloud Tasks にタスクを登録
    """
    # ファイルを読み込む
    # PDFファイルだった場合それぞれのページを分析する
    # 元ファイルはストレージに保存
    # 元ファイルを画像化し、1画像ごとに保存
    # 1画像ごとの解析を行う

    try:
        contents = await file.read()

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File read error: {str(e)}")

    file_uuid = uuid.uuid4()
    unique_filename = f"{file_uuid}_{file.filename}"

    try:
        storage_client = firebase_client.get_storage()
        blob = storage_client.blob(f"{user_id}/documents/{unique_filename}")
        blob.upload_from_string(
            contents,
            content_type='application/pdf',
        )

    except Exception as e:
        detail = f'error uploading file: {str(e)}'
        raise HTTPException(status_code=400, detail=detail)

    file_extension = os.path.splitext(file.filename)[1].lower()

    match file_extension:
        case ".pdf":
            try:
                # pdfのサマリーを分析するタスクを投げる
                pdf_text = extract_text_from_pdf(file)
                max_length = 3000 # token数の関係上文章を短縮
                extracted_text = pdf_text[:max_length]
                payload_summary = models.SummaryMetadata(
                    user_id=user_id,
                    file_uuid=str(file_uuid),
                    file_name=file.filename,
                    summary_text=extracted_text,
                )
                worker_url = f'{Settings.google_cloud.api_base_url}/worker/summary:analyze'
                task = cloud_tasks.create_task_payload(worker_url, payload_summary)

                try:
                    logger.info("Creating a new task in Cloud Tasks...")
                    response = cloud_tasks_client.create_task(parent=queue_path, task=task)
                    eta = response.schedule_time.strftime("%m/%d/%Y, %H:%M:%S")
                    logger.info(f"Task created successfully: {response.name}, {eta}")

                except Exception as e:
                    logger.error(f"Error occurred while creating a task: {e}")

            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error saving pdf result: {str(e)}")

            pdf_document = await pdf_processor.read_pdf_file(contents)
            max_pages = min(Settings.max_pages_to_parse, len(pdf_document))

            for page_number in range(max_pages):
                logger.info(f'page number: {page_number}, max pages: {max_pages}')
                image_bytes = pdf_processor.convert_pdf_page_to_image(pdf_document, page_number)
                await pdf_processor.upload_image_to_firebase(
                    image_bytes, user_id, page_number, file_uuid, storage_client
                )

                # 1ページごとの内容の解析
                payload_page = models.PageMetadata(
                    user_id=user_id,
                    file_uuid=str(file_uuid),
                    file_name=unique_filename,
                    page_number=str(page_number),
                )
                worker_url = f'{Settings.google_cloud.api_base_url}/worker/page:analyze'
                task_page = cloud_tasks.create_task_payload(worker_url, payload_page)
                response = cloud_tasks_client.create_task(parent=queue_path, task=task_page)
                eta = response.schedule_time.strftime("%m/%d/%Y, %H:%M:%S")
                logger.info(f"Page analyze task created successfully: {response.name}, {eta}")

                # projection内容の解析（時間のかかる処理）
                worker_projection_url = f'{Settings.google_cloud.api_base_url}/worker/projection:analyze'
                task_projection = cloud_tasks.create_task_payload(worker_projection_url, payload_page)
                response = cloud_tasks_client.create_task(parent=queue_path, task=task_projection)
                eta = response.schedule_time.strftime("%m/%d/%Y, %H:%M:%S")
                logger.info(f"Projection analyze task created successfully: {response.name}, {eta}")

    return {"filename": file.filename, "status": "ファイルを解析し保存しました"}
