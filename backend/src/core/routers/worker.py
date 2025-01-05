import logging
import uuid

from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import JSONResponse
import openai

from src.core.services.worker import models
from src.core.dependencies.external import get_openai_client
from src.core.services.firebase_client import FirebaseClient, get_firebase_client
import src.core.services.firebase_driver as firebase_driver
from src.core.services.upload import generate_summary
from src.core.services.openai_client import extract_document_information



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
        logger.info(f'Summary result saved: {metadata.file_name} ==========')

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
    Cloud Tasks からPOSTされる
    個別のページを分析する
    """
    firestore_client = firebase_client.get_firestore()

    raw_body = await request.body()

    if not raw_body:
        logger.error("No data received. Skipping processing.")
        return {"message": "No data received, processing skipped."}

    metadata = models.PageMetadata.parse_raw(raw_body)
    logger.info(f'page number: {metadata.page_number}')

    image_base64 = generate_summary.get_encoded_image(metadata.page_url)
    result = await generate_summary.get_page_summary(openai_client, image_base64, max_retries=3)
    page_uuid = uuid.uuid4()

    try:
        firebase_driver.save_page_image_analysis(
            firestore_client=firestore_client,
            user_id=metadata.user_id,
            file_uuid=metadata.file_uuid,
            file_name=metadata.file_name,
            page_uuid=page_uuid,
            page_number=metadata.page_number,
            business_summary=result.business_summary,
            explanation="".join([step.explanation for step in result.steps]),
            output="".join([step.output for step in result.steps]),
            opinion=result.opinion,
        )
        logger.info(f'result saved for page_number: {metadata.page_number}')

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving project: {str(e)}")

    return JSONResponse({"status": "success", "received": metadata.page_number}, status_code=200)
