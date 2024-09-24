from io import BytesIO
from fastapi import UploadFile
import asyncio
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


async def process_uploaded_file(file: UploadFile, firestore_client, storage_client, openai_client: OpenAI):
    try:
        filename = f"uploads/{file.filename}"
        public_url = await upload_to_firebase(file, filename, storage_client)
        file.seek(0)
        parsed_data = await parse_excel_file(file)

        print(parsed_data)
        '''
        # OpenAIを使用したデータ処理（仮の実装）
        prompt = f"Analyze this Excel data: {parsed_data[:5]}"  # 最初の5行だけを使用
        response = await openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}]
        )
        analysis = response.choices[0].message.content

        # Firestoreにメタデータを保存
        doc_ref = firestore_client.collection('excel_files').document()
        doc_ref.set({
            'filename': file.filename,
            'storage_url': public_url,
            'analysis': analysis
        })

        return {
            "filename": file.filename,
            "status": f"ファイルをFirebase Cloud Storageに保存し、分析しました。",
            "url": public_url,
            "analysis": analysis
        }
        '''
        return

    except Exception as e:
        return {"error": str(e)}