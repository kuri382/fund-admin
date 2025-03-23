import io
import logging
import traceback

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse, Response, ORJSONResponse
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

from src.core.services import auth_service
import src.core.services.firebase_driver as firebase_driver
from src.core.services.firebase_client import FirebaseClient, get_firebase_client
from src.dependencies.auth import get_user_id

from ._base import BaseJSONSchema


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/data/table")
async def list_excel_files_by_project(
    request: Request,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
):
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    user_id = auth_service.verify_token(authorization)

    try:
        storage_client = firebase_client.get_storage()
        firestore_client = firebase_client.get_firestore()

        # Firestoreから選択中のプロジェクトを取得
        projects_ref = firestore_client.collection('users').document(user_id).collection('projects')
        is_selected_filter = FieldFilter("is_selected", "==", True)
        query = projects_ref.where(filter=is_selected_filter).limit(1)
        selected_project = query.get()

        if not selected_project:
            raise HTTPException(status_code=404, detail="No selected project.")

        selected_project_id = selected_project[0].id

        tables_ref = (
            firestore_client.collection('users')
            .document(user_id)
            .collection('projects')
            .document(selected_project_id)
            .collection('tables')
        )
        tables_docs = tables_ref.stream()  # 複数のファイル情報を取得

        file_data_list = []

        for doc in tables_docs:
            file_info = doc.to_dict()
            file_uuid = doc.id  # FirestoreのドキュメントIDを使用（ファイルUUID）
            file_name = file_info.get('file_name', 'Unknown File')  # Firestoreに保存されているファイル名
            file_extension = file_name.split('.')[-1].lower()
            # ストレージからファイルを取得 (file_uuidをキーとして使用)
            blob_path = f"{user_id}/documents/{file_uuid}_{file_name}"
            blob = storage_client.blob(blob_path)
            if not blob.exists():
                continue  # ファイルがストレージに存在しない場合はスキップ

            file_bytes = blob.download_as_bytes()
            file_io = io.BytesIO(file_bytes)

            if file_extension == 'xlsx':
                df = pd.read_excel(file_io, engine="openpyxl")
            elif file_extension == 'csv':
                df = pd.read_csv(file_io)
            else:
                continue

            df = df.replace('^Unnamed.*', '', regex=True)
            df = df.fillna('')
            output = df.head(100)  # 必要に応じて表示行数を調整

            output = output.astype(str)
            json_data = output.to_dict(orient="records")

            # ファイル情報をリストに追加
            file_data_list.append(
                {
                    "file_name": file_name,
                    "data": json_data,
                    "feature": file_info.get("feature", ""),
                    "abstract": file_info.get("abstract", ""),
                    "extractable_info": file_info.get("extractable_info", {}),
                    "category": file_info.get("category", ""),
                }
            )

        if not file_data_list:
            return Response(status_code=204)

        return JSONResponse(content={"files": file_data_list})

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error retrieving or processing files: {str(e)}")


@router.get("/data/document")
async def list_document_files(
    request: Request,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
):
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    user_id = auth_service.verify_token(authorization)

    try:
        storage_client = firebase_client.get_storage()
        firestore_client = firebase_client.get_firestore()

        project_id = firebase_driver.get_project_id(user_id, firestore_client)

        prefix = f'{user_id}/projects/{project_id}/documents/'
        blobs = storage_client.list_blobs(prefix=prefix)
        file_names = [blob.name.replace(prefix, "") for blob in blobs if blob.name != prefix]

        if not file_names:
            return Response(status_code=204)

        documents_ref = (
            firestore_client.collection('users')
            .document(user_id)
            .collection('projects')
            .document(project_id)
            .collection('documents')
        )

        file_data_list = []
        for file_name in file_names:
            # ファイル名 (file_uuid) に対応するFirestoreのドキュメントを取得
            file_uuid = file_name.split("_")[0]  # ファイル名からfile_uuidを抽出
            file_title = file_name.split('_',1)[1]  # ファイル名からfile_uuidを抽出
            doc = documents_ref.document(file_uuid).get()

            if not doc.exists:
                continue  # Firestoreに該当するドキュメントがない場合はスキップ

            doc_data = doc.to_dict()

            # Firestoreの情報を抽出
            abstract = doc_data.get("abstract", "")
            extractable_info = doc_data.get("extractable_info", {})
            category = doc_data.get("category", "")
            feature = doc_data.get("feature", "")

            file_data_list.append(
                {
                    "file_name": file_title,
                    "file_uuid": file_uuid,
                    "feature": feature,
                    "abstract": abstract,
                    "extractable_info": extractable_info,
                    "category": category,
                }
            )

        if not file_data_list:
            return Response(status_code=204)

        return JSONResponse(content={"files": file_data_list}, status_code=200)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving or processing files: {str(e)}")


def fetch_summary_doc(
    firestore_client: firestore.Client,
    user_id: str,
    project_id: str,
    file_uuid: str
) -> dict:
    try:
        doc_ref = (
            firestore_client.collection("users")
            .document(user_id)
            .collection("projects")
            .document(project_id)
            .collection("documents")
            .document(file_uuid)
            .collection("analyst_report")
            .document("summary")
        )

        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail="Analyst report not found.")

        data = doc.to_dict()

        return data.get("analyst_summary", "")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ResGetDataReport(BaseJSONSchema):
    summary: str


@router.get(
    "/data/report",
    response_class=ORJSONResponse,
    responses={
        status.HTTP_200_OK: {
            'description': 'images retrieved successfully.',
        }
    },
)
async def get_data_report(
    file_uuid: str,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    user_id: str = Depends(get_user_id),
):
    firestore_client = firebase_client.get_firestore()
    project_id = firebase_driver.get_project_id(user_id, firestore_client)
    result = fetch_summary_doc(firestore_client, user_id, project_id, file_uuid)
    content = ResGetDataReport(summary=result)
    return ORJSONResponse(content=jsonable_encoder(content), status_code=status.HTTP_200_OK)
