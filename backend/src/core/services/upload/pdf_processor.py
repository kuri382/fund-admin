import io
import logging
from datetime import datetime, timedelta

import fitz
from fastapi import HTTPException
from firebase_admin import exceptions
from google.cloud import storage
from PIL import Image

logger = logging.getLogger(__name__)


async def read_pdf_file(contents: bytes) -> fitz.Document:
    """
    FastAPIのUploadFileオブジェクトからPDFドキュメントを作成する関数
    :param file: FastAPIのUploadFileオブジェクト
    :return: PyMuPDFのDocumentオブジェクト
    """
    pdf_document = fitz.open(stream=contents, filetype="pdf")
    return pdf_document


def convert_pdf_page_to_image(pdf_document: fitz.Document, page_number: int) -> io.BytesIO:
    """
    PyMuPDFのDocumentオブジェクトから特定のページを画像化する関数
    :param pdf_document: PyMuPDFのDocumentオブジェクト
    :param page_number: ページ番号
    :return: 画像データをバイナリストリームとして返す
    """
    if page_number >= len(pdf_document):
        raise HTTPException(status_code=400, detail="Invalid page number")

    page = pdf_document.load_page(page_number)
    pix = page.get_pixmap()
    image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

    image_bytes = io.BytesIO()
    image.save(image_bytes, format="PNG", optimize=True, quality=70)
    image_bytes.seek(0)
    return image_bytes


async def upload_image_to_firebase(
    image_bytes: io.BytesIO,
    user_id: str,
    project_id: str,
    page_number: int,
    file_uuid: str,
    storage_client: storage.Client,
) -> None:
    """
    画像をFirebase Storageにアップロードする関数
    :param image_bytes: 画像データのバイナリストリーム
    :param user_id: ユーザーID
    :param page_number: ページ番号
    :param storage_client: Firebase StorageのBucketクライアント
    """
    blob = storage_client.blob(f"{user_id}/projects/{project_id}/image/{file_uuid}/{page_number}")

    try:
        blob.upload_from_file(image_bytes, content_type='image/png')

    except exceptions.FirebaseError as e:
        logger.error(f"Failed to upload {file_uuid} to Firebase Storage. Error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload page {page_number + 1} to storage.",
        )

    except Exception as e:
        logger.error(f"An unexpected error occurred while uploading {file_uuid}. Error: {e}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during the upload process.",
        )


async def generate_signed_url(
    user_id: str,
    project_id: str,
    page_number: int,
    file_uuid: str,
    storage_client: storage.Client,
    expiration_minutes: int = 60
) -> str:
    """
    Firebase Storageの署名付きURLを生成する関数
    :param user_id: ユーザーID
    :param page_number: ページ番号
    :param file_uuid: ファイルUUID
    :param storage_client: Firebase Storageのクライアント
    :param expiration_minutes: URLの有効期限（分単位）
    :return: 署名付きURL
    """
    blob_path = f"{user_id}/projects/{project_id}/image/{file_uuid}/{page_number}"
    blob = storage_client.blob(blob_path)

    expiration_time = datetime.utcnow() + timedelta(minutes=expiration_minutes)

    try:
        signed_url = blob.generate_signed_url(expiration=expiration_time, method="GET", version="v4")
        return signed_url

    except Exception as e:
        raise ValueError(f"Failed to generate signed URL for {blob_path}. Error: {e}")
