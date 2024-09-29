import io
import os

from fastapi import UploadFile, HTTPException
import PyPDF2

from src.settings import settings


def extract_text_from_pdf(file: UploadFile) -> str:
    """
    PDFファイルからテキストを抽出する関数
    """
    file.file.seek(0) # ポインタを先頭に戻す
    contents = file.file.read()

    pdf_reader = PyPDF2.PdfReader(io.BytesIO(contents))
    text = ""
    for page in pdf_reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text
    return text


def read_pdf_content(file_name: str) -> str:
    file_path = os.path.join(settings.pdf_storage_path, f"{file_name}.txt")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="ファイルが見つかりません")

    with open(file_path, 'r') as f:
        return f.read()
