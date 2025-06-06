import asyncio
import base64
import io
import logging
import uuid

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.responses import ORJSONResponse
from google.cloud import tasks_v2
from pydantic import BaseModel, Field
from pydantic_core import ValidationError

import src.core.services.firebase_driver as firebase_driver
from src.dependencies.auth import get_user_id
from src.dependencies.cloud_tasks import get_cloud_tasks_client, get_queue_path
from src.core.services.endpoints import projection
from src.core.services.firebase_client import FirebaseClient, get_firebase_client
from src.core.services.upload import generate_summary, pdf_processor
from src.core.services.worker import cloud_tasks, models
from src.settings import Settings

from ._base import BaseJSONSchema


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


class ReqPostUploadCreateTask(BaseJSONSchema):
    gcs_path: str
    content_type: str
    filename: str
    file_uuid: str


@router.post("/task")
async def create_task(
    request: ReqPostUploadCreateTask,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    user_id: str = Depends(get_user_id),
    cloud_tasks_client: tasks_v2.CloudTasksClient = Depends(get_cloud_tasks_client),
    queue_path: str = Depends(get_queue_path),
):
    """
    Singned URLによりファイルがアップロードされる
    その後、フロントエンド側からこのエンドポイントに対してタスク開始が指示される
    """
    firestore_client = firebase_client.get_firestore()
    project_id = firebase_driver.get_project_id(user_id, firestore_client)

    match request.content_type:
        case "application/pdf":
            payload_summary = models.SingedUrlMetadata(
                user_id=user_id,
                project_id=project_id,
                gcs_path=request.gcs_path,
                filename=request.filename,
                file_uuid=request.file_uuid,
            )
            worker_url = f'{Settings.google_cloud.api_base_url}/worker/file:separate'
            task = cloud_tasks.create_task_payload(worker_url, payload_summary)

            try:
                logger.info("Creating a new task in Cloud Tasks...")
                response = cloud_tasks_client.create_task(parent=queue_path, task=task)
                eta = response.schedule_time.strftime("%m/%d/%Y, %H:%M:%S")
                logger.info(f"Task created successfully: {response.name}, {eta}")

            except Exception as e:
                logger.error(f"Error occurred while creating a task: {e}")

    return {"filename": request.filename, "status": "解析を始めます"}


class SignedUrlRequest(BaseModel):
    filename: str
    content_type: str


class ResPostGenerateSignedUrl(BaseJSONSchema):
    upload_url: str
    gcs_path: str
    filename: str
    file_uuid: str


@router.post("/signed_url")
def generate_signed_url(
    request: SignedUrlRequest,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    user_id: str = Depends(get_user_id),
):
    """
    指定されたファイル名で Cloud Storage への書き込み用署名付きURLを生成して返す
    """
    filename = request.filename
    content_type = request.content_type

    file_uuid = str(uuid.uuid4())
    unique_filename = f'{file_uuid}_{filename}'
    firestore_client = firebase_client.get_firestore()
    project_id = firebase_driver.get_project_id(user_id, firestore_client)

    try:
        storage_client = firebase_client.get_storage()
        gcs_path = f"{user_id}/projects/{project_id}/documents/{unique_filename}"
        blob = storage_client.blob(gcs_path)
        expiration = timedelta(minutes=15)
        url = blob.generate_signed_url(
            version="v4",
            expiration=expiration,
            method="PUT",
            content_type=content_type,
        )

        content = ResPostGenerateSignedUrl(
            upload_url=url,
            gcs_path=gcs_path,
            filename=filename,
            file_uuid=file_uuid,
        )

        return ORJSONResponse(content=jsonable_encoder(content))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate signed URL: {str(e)}")
