import io
import logging

import fitz
from fastapi import HTTPException
from firebase_admin import exceptions
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


def convert_pdf_page_to_image(
    pdf_document: fitz.Document, page_number: int
) -> io.BytesIO:
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
    # resize_width: int = 800
    # image = image.resize((resize_width, int((resize_width / image.width) * image.height)), Image.ANTIALIAS)

    # 画像をバイナリストリームに変換
    image_bytes = io.BytesIO()
    image.save(image_bytes, format="PNG", optimize=True, quality=70)
    image_bytes.seek(0)
    return image_bytes


async def upload_image_to_firebase(
    image_bytes: io.BytesIO,
    user_id: str,
    page_number: int,
    unique_filename: str,
    storage_client,
) -> None:
    """
    画像をFirebase Storageにアップロードする関数
    :param image_bytes: 画像データのバイナリストリーム
    :param user_id: ユーザーID
    :param page_number: ページ番号
    :param storage_client: Firebase StorageのBucketクライアント
    """
    blob = storage_client.blob(
        f"{user_id}/image/{unique_filename}+page_{page_number + 1}"
    )

    try:
        blob.upload_from_file(image_bytes, content_type='image/png')
        logger.info(f"Uploaded {unique_filename} to Firebase Storage.")

    except exceptions.FirebaseError as e:
        logger.error(
            f"Failed to upload {unique_filename} to Firebase Storage. Error: {e}"
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload page {page_number + 1} to storage.",
        )

    except Exception as e:
        logger.error(
            f"An unexpected error occurred while uploading {unique_filename}. Error: {e}"
        )
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during the upload process.",
        )
