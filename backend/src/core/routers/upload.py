import os
import json
import logging
import uuid
from fastapi import APIRouter, Depends, UploadFile, HTTPException, Request
import openai


import src.core.services.firebase_driver as firebase_driver
from src.core.services.pdf_processing import extract_text_from_pdf
from src.core.services.openai_client import extract_document_information
from src.core.services.firebase_client import FirebaseClient, get_firebase_client
from src.core.services import auth_service
from src.core.services.upload import table_processor
from src.dependencies import get_openai_client

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    openai_client: openai.ChatCompletion = Depends(get_openai_client),
):
    # get authorization information
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    user_id = auth_service.verify_token(authorization)

    try:
        contents = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File read error: {str(e)}")

    file_uuid = uuid.uuid4()
    unique_filename = f"{file_uuid}_{file.filename}"

    # save file to firebase cloud storage
    try:
        storage_client = firebase_client.get_storage()
        blob = storage_client.blob(f"{user_id}/{unique_filename}")
        blob.upload_from_string(contents, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    except Exception as e:
        detail = f'error uploading file: {str(e)}'
        raise HTTPException(status_code=400, detail=detail)

    firestore_client = firebase_client.get_firestore()

    # get file_extension
    file_extension = os.path.splitext(file.filename)[1].lower()
    match file_extension:
        case ".xlsx":
            try:
                content_text = table_processor.convert_xlsx_row_to_text(contents)
                analysis_result = extract_document_information(openai_client=openai_client, content_text=content_text)

            except Exception as e:
                print(f"Error: {str(e)}")
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
                    raise HTTPException(status_code=429, detail="Token limit exceeded or too many requests. Please try again later.")
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
                analysis_result = extract_document_information(openai_client=openai_client, content_text=pdf_text)

            except Exception as e:
                if "rate_limit_exceeded" in str(e) or "Too Many Requests" in str(e):
                    raise HTTPException(status_code=429, detail="Token limit exceeded or too many requests. Please try again later.")
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
                raise HTTPException(status_code=500, detail=f"Error saving csv result: {str(e)}")

        case _:
            raise HTTPException(status_code=400, detail="サポートされていないファイル形式です")

    return {"filename": file.filename, "status": f"ファイルを解析し保存しました"}
