import base64
from io import BytesIO
from datetime import timedelta
import logging
import traceback
import requests
import time
from typing import Optional

import fitz
import openai
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import ORJSONResponse
from fastapi.encoders import jsonable_encoder
from google.cloud.firestore_v1.base_query import FieldFilter
from pydantic import Field

from src.dependencies import get_openai_client
from src.core.services.firebase_client import FirebaseClient, get_firebase_client
from src.core.services import auth_service
from src.core.models.financial import CategoryIR
from ._base import BaseJSONSchema


router = APIRouter(prefix='/explorer', tags=['explorer'])

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FinancialStatement(BaseJSONSchema):
    """rows of `/explorer/financial_statements` request schema.
    """

    uuid: str = Field(...)
    name: str = Field(...)
    url: str = Field(...)
    category_ir: str = Field(...)


class ResGetFinancialStatements(BaseJSONSchema):
    """GET `/explorer/financial_statements` request schema.
    """

    financial_statements: list[FinancialStatement] = Field(..., description='IRファイル情報一覧')


def verify_auth(request: Request) -> str:
    """認証情報を検証しユーザーIDを返す"""
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    return auth_service.verify_token(authorization)


def get_selected_project_id(firestore_client, user_id: str) -> str:
    """選択中のプロジェクトIDを取得"""
    projects_ref = firestore_client.collection('users').document(user_id).collection('projects')
    selected_project = projects_ref.where(
        filter=FieldFilter("is_selected", "==", True)
    ).limit(1).get()

    if not selected_project:
        raise HTTPException(status_code=404, detail="No selected project.")
    return selected_project[0].id


def get_financial_documents(firestore_client, user_id: str, project_id: str):
    """財務諸表ドキュメントの一覧を取得"""
    tables_ref = firestore_client.collection('users').document(user_id)\
        .collection('projects').document(project_id)\
        .collection('documents')

    category_ir_filter = FieldFilter(
        "category_ir",
        "==",
        CategoryIR.EARNINGS_REPORT.value
    )
    return tables_ref.where(filter=category_ir_filter).stream()


def pdf_page_to_base64(pdf_bytes: bytes, page_number: int) -> str:
    """PDFの特定ページを画像としてBase64エンコードする"""
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page = doc.load_page(page_number)
        pix = page.get_pixmap()
        img_buffer = BytesIO(pix.tobytes())
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
        doc.close()
        return img_base64
    except Exception as e:
        logger.error(f"Error converting PDF page to base64: {str(e)}")
        raise


def generate_file_url(storage_client, user_id: str, file_uuid: str, file_name: str) -> Optional[str]:
    """ファイルの署名付きURLを生成"""
    blob_path = f"{user_id}/{file_uuid}_{file_name}"
    blob = storage_client.blob(blob_path)

    if not blob.exists():
        return None

    return blob.generate_signed_url(
        version="v4",
        expiration=timedelta(hours=1),
        method="GET",
        response_type="application/pdf",
    )


def create_financial_statement(
    doc_id: str,
    doc_dict: dict,
    url: str
) -> FinancialStatement:
    """財務諸表情報オブジェクトを作成"""
    return FinancialStatement(
        uuid=doc_id,
        name=doc_dict.get('file_name', 'Unnamed'),
        url=url,
        category_ir=doc_dict['category_ir'],
    )


class FinancialStatement(BaseJSONSchema):
    """rows of `/explorer/financial_statements` request schema.
    """

    uuid: str = Field(...)
    name: str = Field(...)
    url: str = Field(...)
    category_ir: str = Field(...)


class ResGetFinancialStatements(BaseJSONSchema):
    """GET `/explorer/financial_statements` request schema.
    """

    financial_statements: list[FinancialStatement] = Field(..., description='IRファイル情報一覧')


@router.get(
    "/financial_statements",
    response_class=ORJSONResponse,
    responses={status.HTTP_200_OK: {
        'model': ResGetFinancialStatements,
        'description': 'Dates retrieved successfully.',
        },
    },
)
async def get_financial_statements(
    request: Request,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
):
    try:
        # 認証とクライアントの取得
        #user_id = verify_auth(request)
        user_id = '36n89vb4JpNwBGiuboq6BjvoY3G2'
        storage_client = firebase_client.get_storage()
        firestore_client = firebase_client.get_firestore()

        # プロジェクトの取得
        project_id = get_selected_project_id(firestore_client, user_id)

        # 財務諸表ドキュメントの取得と処理
        financial_statements = []
        for doc in get_financial_documents(firestore_client, user_id, project_id):
            file_info = doc.to_dict()
            file_uuid = doc.id
            file_name = file_info.get('file_name', 'Unnamed')

            # URLの生成
            url = generate_file_url(
                storage_client,
                user_id,
                file_uuid,
                file_name
            )
            if not url:
                continue

            # 財務諸表情報の作成
            statement = create_financial_statement(file_uuid, file_info, url)
            financial_statements.append(statement)

        result = ResGetFinancialStatements(
            financial_statements=financial_statements
        )
        return ORJSONResponse(content=jsonable_encoder(result))

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error retrieving financial statements: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving or processing files: {str(e)}"
        )


class PDFPageContent(BaseJSONSchema):
    """PDF content response schema"""
    page_number: int = Field(..., description='ページ番号')
    content: str = Field(..., description='Base64エンコードされたPDFページの画像')


class ResGetPDFPages(BaseJSONSchema):
    """GET `/explorer/pdf_pages/{uuid}` response schema"""
    uuid: str = Field(..., description='ファイルUUID')
    name: str = Field(..., description='ファイル名')
    total_pages: int = Field(..., description='PDFの総ページ数')
    pages: list[PDFPageContent] = Field(..., description='ページ画像一覧')


def get_document_info(
    firestore_client,
    user_id: str,
    project_id: str,
    file_uuid: str
) -> tuple[str, dict]:
    """ドキュメント情報を取得"""
    doc_ref = (firestore_client.collection('users').document(user_id)
               .collection('projects').document(project_id)
               .collection('documents').document(file_uuid))
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="File not found")

    file_info = doc.to_dict()
    file_name = file_info.get('file_name', 'Unnamed')
    return file_name, file_info


def get_pdf_bytes(storage_client, user_id: str, file_uuid: str, file_name: str) -> bytes:
    """PDFのバイトデータを取得"""
    blob_path = f"{user_id}/{file_uuid}_{file_name}"
    blob = storage_client.blob(blob_path)

    if not blob.exists():
        raise HTTPException(status_code=404, detail="File not found in storage")

    return blob.download_as_bytes()


def process_pdf_pages(pdf_bytes: bytes, max_pages: int = 10) -> tuple[int, list]:
    """PDFページを処理してBase64エンコードされたページ情報を返す"""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    total_pages = len(doc)
    pages_to_process = min(max_pages, total_pages)

    encoded_pages = []

    try:
        for page_num in range(pages_to_process):
            page = doc.load_page(page_num)
            pix = page.get_pixmap()
            img_buffer = BytesIO(pix.tobytes())
            img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
            encoded_pages.append({
                "page_number": page_num + 1,
                "content": img_base64
            })
    finally:
        doc.close()

    return total_pages, encoded_pages


def create_chat_completion_message(system_prompt, prompt, image_file):
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
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{image_file}"
                    }
                }
            ]
        }
    ]
    return messages

@router.get(
    "/financial_statements",
    response_class=ORJSONResponse,
    responses={status.HTTP_200_OK: {
        'model': ResGetFinancialStatements,
        'description': 'Dates retrieved successfully.',
        },
    },
)

@router.get(
    "/financial_statements/{uuid}",
    response_class=ORJSONResponse,
    responses={
        status.HTTP_200_OK: {
            'model': ResGetPDFPages,
            'description': 'PDF pages retrieved successfully.',
        },
    },
)
async def get_financial_statements_by_uuid(
    uuid: str,
    request: Request,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    openai_client: openai.ChatCompletion = Depends(get_openai_client),
):
    """指定されたPDFファイルの最初の10ページまでを画像としてBase64エンコードして返す"""
    try:
        # 認証とクライアントの取得
        #user_id = '36n89vb4JpNwBGiuboq6BjvoY3G2'
        #file_uuid='d009fd66-e138-40cb-acec-63de4703018b'
        user_id = verify_auth(request)
        storage_client = firebase_client.get_storage()
        firestore_client = firebase_client.get_firestore()

        # プロジェクトとドキュメント情報の取得
        project_id = get_selected_project_id(firestore_client, user_id)
        file_name, file_info = get_document_info(firestore_client, user_id, project_id, uuid)
        # PDFデータの取得と処理
        pdf_bytes = get_pdf_bytes(storage_client, user_id, uuid, file_name)
        total_pages, encoded_pages = process_pdf_pages(pdf_bytes)

        for base64_image in encoded_pages:
            system_prompt = 'まず始めに結論を書いてください。その後それを捕捉するように文章を構成すること。 「### スライド概要、### 結論」'
            prompt = '画像はIR資料です。このスライドから読み取れる内容を詳細かつ丁寧に文章でまとめてください。'
            messages = create_chat_completion_message(system_prompt, prompt, base64_image['content'])
            response = openai_client.chat.completions.create(
                model='gpt-4o-mini',
                messages = messages
            )
            answer = response.choices[0].message.content
            time.sleep(2)
        return
        # レスポンスの作成
        result = ResGetPDFPages(
            uuid=file_uuid,
            name=file_name,
            total_pages=total_pages,
            pages=encoded_pages
        )
        return ORJSONResponse(content=jsonable_encoder(result))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error processing PDF: {str(e)}"
        )