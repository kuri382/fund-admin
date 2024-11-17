import openai
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from firebase_admin import firestore
from pydantic import BaseModel

from src.core.dependencies.external import get_openai_client
from src.core.services.firebase_client import get_firestore
from src.core.services.openai_client import generate_strong_point, generate_summary
from src.core.services.pdf_processing import read_pdf_content

router = APIRouter()


@router.get("/get-summary")
async def get_summary(
    file_name: str = Query(...),
    client: openai.ChatCompletion = Depends(get_openai_client),
):
    content = read_pdf_content(file_name)
    generator = generate_summary(content, client)

    async def stream_wrapper():
        for chunk in generator:
            yield chunk

    return StreamingResponse(stream_wrapper(), media_type="text/plain")


@router.get("/get-strong-point")
async def get_strong_point(
    file_name: str = Query(...),
    client: openai.ChatCompletion = Depends(get_openai_client),
):
    content = read_pdf_content(file_name)
    generator = generate_strong_point(content, client)

    async def stream_wrapper():
        for chunk in generator:
            yield chunk

    return StreamingResponse(stream_wrapper(), media_type="text/plain")


@router.get("/sales_data/{user_uid}")
async def get_sales_data(user_uid: str, db=Depends(get_firestore)):
    user_doc_ref = db.collection('users').document(user_uid)
    user_doc = user_doc_ref.get()

    if user_doc.exists:
        company_id = user_doc.to_dict().get('company_id')
        if company_id:
            docs = (
                db.collection('users')
                .document(user_uid)
                .collection('companies')
                .document(company_id)
                .collection('sales_data')
                .stream()
            )

            data = [doc.to_dict() for doc in docs]
            return {"sales_data": data}
        else:
            return {"error": "No company_id linked to user"}
    else:
        return {"error": "User does not exist"}


class ExtractableInfo(BaseModel):
    category: str
    entity_abstract: str
    information: str
    data: list[dict[str, str]]  # 'time' と 'value' を含むリスト


class SourceData(BaseModel):
    source_id: str
    source_filename: str
    source_abstract: str
    source_sheet_name: str
    source_level: str
    source_label: str
    source_extractable_info: list[ExtractableInfo]


class SourceResponse(BaseModel):
    sources: list[SourceData]


@router.get("/companies/{company_id}/sources", response_model=SourceResponse)
async def get_sources(
    company_id: str,
    db: firestore.client = Depends(get_firestore),
):
    try:
        # Firestoreから該当するcompany_idのデータを取得
        user_id = 'user_123'
        sources_ref = (
            db.collection('users')
            .document(user_id)
            .collection('companies')
            .document(company_id)
            .collection('sources')
        )
        sources = sources_ref.stream()

        result = []
        for source in sources:
            result.append(source.to_dict())

        if not result:
            raise HTTPException(
                status_code=404, detail="No data found for the given user and company."
            )

        return SourceResponse(sources=result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving data: {e}")
