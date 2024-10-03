import csv
import io
import os
import json
import uuid
from fastapi import APIRouter, Depends, UploadFile, HTTPException, Request
import openai
from openpyxl import load_workbook
import traceback
from typing import TypedDict

from src.core.services.pdf_processing import extract_text_from_pdf
from src.core.services.openai_client import generate_pdf_analysis, generate_table_analysis
from src.core.services.firebase_client import FirebaseClient, get_firebase_client
from src.core.services import auth_service
from src.dependencies import get_openai_client
from src.settings import settings


router = APIRouter()

class AnalysisResult(TypedDict):
    abstract: str
    extractable_info: dict
    category: str


def process_csv(contents: bytes, openai_client):
    try:
        file_stream = io.StringIO(contents.decode("utf-8"))
        reader = csv.reader(file_stream)

        csv_content = []
        for row in reader:
            csv_content.append("\t".join(row))
        text_content = "\n".join(csv_content)

        analysis_result = generate_table_analysis(text_content, openai_client)
        return json.loads(analysis_result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV processing error: {str(e)}")


def save_analysis_result(
    user_id: str,
    file_name: str,
    file_uuid: uuid.UUID,
    analysis_result: AnalysisResult,
    firebase_client: FirebaseClient,
):
    firestore_client = firebase_client.get_firestore()

    projects_ref = firestore_client.collection('users').document(user_id).collection('projects')
    selected_project = projects_ref.where('is_selected', '==', True).limit(1).get()
    if not selected_project:
        raise ValueError("No project selected for the user")
    selected_project_id = selected_project[0].id
    doc_ref = firestore_client.collection('users').document(user_id).collection('projects').document(selected_project_id).collection('tables').document(str(file_uuid))
    #doc_ref = firestore_client.collection('users').document(user_id).collection('files_excel').document(str(file_uuid))

    doc_ref.set({
        "file_name": file_name,
        "file_uuid": str(file_uuid),
        "abstract": analysis_result['abstract'],
        "feature": analysis_result['feature'],
        "extractable_info": analysis_result['extractable_info'],
        "category": analysis_result['category']
    })

@router.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    openai_client: openai.ChatCompletion = Depends(get_openai_client),
):
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    user_id = auth_service.verify_token(authorization)
    file_extension = os.path.splitext(file.filename)[1].lower()

    try:
        contents = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File read error: {str(e)}")

    file_uuid = uuid.uuid4()
    unique_filename = f"{file_uuid}_{file.filename}"

    try:
        storage_client = firebase_client.get_storage()
        blob = storage_client.blob(f"{user_id}/{unique_filename}")
        blob.upload_from_string(contents, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    except Exception as e:
        detail = f'error uploading file: {str(e)}'
        raise HTTPException(status_code=400, detail=detail)

    match file_extension:
        case ".xlsx":
            try:
                def generate_information(contents, openai_client):
                    file_stream = io.BytesIO(contents)
                    workbook = load_workbook(file_stream)
                    sheet = workbook.active

                    sheet_content = []
                    for row in sheet.iter_rows(values_only=True):
                        sheet_content.append("\t".join([str(cell) for cell in row if cell is not None]))
                    text_content = "\n".join(sheet_content)
                    analysis_result = generate_table_analysis(text_content, openai_client)
                    return json.loads(analysis_result)

                analysis_result = generate_information(contents, openai_client)
                save_analysis_result(user_id, file.filename, file_uuid, analysis_result, firebase_client)

            except Exception as e:
                print(f"Error: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error uploading Excel file: {str(e)}")

        case ".csv":
            try:
                analysis_result = process_csv(contents, openai_client)
                save_analysis_result(user_id, file.filename, file_uuid, analysis_result, firebase_client)

            except Exception as e:
                print(f"Error: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error uploading Excel file: {str(e)}")

        case ".pdf":
            try:
                pdf_text = extract_text_from_pdf(file)
                analysis_result = generate_pdf_analysis(pdf_text, openai_client)

                def save_pdf_analysis_result(user_id: str, file_name: str, analysis_result: AnalysisResult):
                    firestore_client = firebase_client.get_firestore()

                    projects_ref = firestore_client.collection('users').document(user_id).collection('projects')
                    selected_project = projects_ref.where('is_selected', '==', True).limit(1).get()
                    if not selected_project:
                        raise ValueError("No project selected for the user")
                    selected_project_id = selected_project[0].id
                    doc_ref = firestore_client.collection('users').document(user_id).collection('projects').document(selected_project_id).collection('documents').document(str(file_uuid))

                    doc_ref.set({
                        "file_name": file_name,
                        "file_uuid": str(file_uuid),
                        "abstract": analysis_result['abstract'],
                        "feature": analysis_result['feature'],
                        "extractable_info": analysis_result['extractable_info'],
                        "category": analysis_result['category']
                    })

                save_pdf_analysis_result(user_id, file.filename, analysis_result)

            except Exception as e:
                traceback.print_exc()
                raise HTTPException(status_code=500, detail=f"error")

        case _:
            raise HTTPException(status_code=400, detail="サポートされていないファイル形式です")

    return {"filename": file.filename, "status": f"ファイルを解析し保存しました"}


@router.get("/upload/description")
async def list_excel_files(
    request: Request,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
):
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    user_id = auth_service.verify_token(authorization)

    try:
        firestore_client = firebase_client.get_firestore()

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error retrieving or processing files: {str(e)}")
