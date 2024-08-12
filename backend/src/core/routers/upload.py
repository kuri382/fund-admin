import os
from fastapi import APIRouter, UploadFile, BackgroundTasks

from src.settings import settings
from src.core.services.pdf_processing import extract_text_from_pdf

router = APIRouter()

@router.post("/upload")
async def upload_file(file: UploadFile):
    pdf_text = extract_text_from_pdf(file)
    file_name = os.path.join(settings.pdf_storage_path, f"{file.filename}.txt")

    with open(file_name, 'w') as f:
        f.write(pdf_text)

    return {"filename": file.filename, "status": "保存完了"}


@router.get("/uploaded-files")
async def get_uploaded_files():
    # ディレクトリ内のファイル名を取得
    files = os.listdir(settings.pdf_storage_path)
    # 拡張子を削除してファイル名を返す
    file_names = [os.path.splitext(file)[0] for file in files if file.endswith('.txt')]
    return {"files": file_names}