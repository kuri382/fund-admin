from io import BytesIO
from google.cloud import firestore
from fastapi import UploadFile
from google.cloud.firestore_v1.base_query import FieldFilter
from fastapi import HTTPException
from pydantic import BaseModel

from openpyxl import load_workbook


async def upload_to_firebase(file: UploadFile, filename: str, storage_client):
    blob = storage_client.blob(filename)
    file_content = await file.read()
    blob.upload_from_string(file_content, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    blob.make_public()
    return blob.public_url


async def parse_excel_file(file: UploadFile):
    file_content = await file.read()
    workbook = load_workbook(BytesIO(file_content), read_only=True)
    sheet = workbook.active
    data = [row for row in sheet.iter_rows(values_only=True)]
    workbook.close()
    return data


class AnalysisResult(BaseModel):
    abstract: str
    feature: str
    extractable_info: list[str]
    year_info: str
    period_type: str
    category: str
    category_ir: str


def save_analysis_result(
    firestore_client: firestore.Client,
    user_id: str,
    file_name: str,
    file_uuid: str,
    analysis_result: AnalysisResult,
    target_collection: str,
) -> None:
    projects_ref = firestore_client.collection('users').document(user_id).collection('projects')
    is_selected_filter = FieldFilter("is_selected", "==", True)
    query = projects_ref.where(filter=is_selected_filter).limit(1)
    selected_project = query.get()

    if not selected_project:
        raise ValueError("No project selected for the user")

    selected_project_id = selected_project[0].id
    doc_ref = firestore_client.collection('users').document(user_id).collection('projects').document(selected_project_id).collection(target_collection).document(str(file_uuid))

    try:
        doc_ref.set({
            "file_name": file_name,
            "file_uuid": str(file_uuid),
            "abstract": analysis_result.abstract,
            "feature": analysis_result.feature,
            "extractable_info": analysis_result.extractable_info,
            "year_info": analysis_result.year_info,
            "period_type": analysis_result.period_type,
            "category": analysis_result.category,
            "category_ir": analysis_result.category_ir
        })
        return

    except Exception as e:
        raise HTTPException(status_code=500, detail=e)
