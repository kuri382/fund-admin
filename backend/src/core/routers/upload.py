import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, HTTPException
import openai

from src.core.services.pdf_processing import extract_text_from_pdf
from src.core.services.openai_client import send_xlsx_content_to_openai
from src.dependencies import get_openai_client
from src.settings import settings

router = APIRouter()

@router.post("/upload")
async def upload_file(
    file: UploadFile,
    client: openai.ChatCompletion = Depends(get_openai_client)
):
    # ファイルの拡張子を取得
    file_extension = os.path.splitext(file.filename)[1].lower()

    match file_extension:

        case ".xlsx":
            file_name = os.path.join(settings.table_storage_path, file.filename)
            title, sentence = send_xlsx_content_to_openai(file_name, client)
            new_file_name = os.path.join(settings.table_storage_path, title)
            with open(new_file_name, "wb") as f:
                shutil.copyfileobj(file.file, f)
            return {"filename": file.filename, "status": f"概要：{sentence} {title}.xlsxとしてリネームし整形・保存しました"}

        case ".pdf":
            pdf_text = extract_text_from_pdf(file)
            file_name = os.path.join(settings.pdf_storage_path, f"{file.filename}.txt")
            with open(file_name, 'w') as f:
                f.write(pdf_text)
            return {"filename": file.filename, "status": "PDFからテキスト抽出保存完了"}

        case _:
            raise HTTPException(status_code=400, detail="サポートされていないファイル形式です")


@router.get("/uploaded-files")
async def get_uploaded_files():
    # ディレクトリ内のファイル名を取得
    files = os.listdir(settings.pdf_storage_path)
    # 拡張子を削除してファイル名を返す
    file_names = [os.path.splitext(file)[0] for file in files if file.endswith('.txt')]
    return {"files": file_names}


@router.get("/uploaded-table-data")
async def get_uploaded_table_data():
    files = os.listdir(settings.table_storage_path)
    file_names = [os.path.splitext(file)[0] for file in files if file.endswith('.txt')]
    return {"files": file_names}