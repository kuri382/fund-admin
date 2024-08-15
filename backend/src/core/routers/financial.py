from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
import openai

from src.dependencies import get_openai_client
from src.core.services.openai_client import generate_financial_status
from src.core.services.pdf_processing import read_pdf_content

router = APIRouter()

@router.get("/get-financial-status")
async def get_summary(file_name: str = Query(...), client: openai.ChatCompletion = Depends(get_openai_client)):
    content = read_pdf_content(file_name)
    generator = generate_financial_status(content, client)

    async def stream_wrapper():
        for chunk in generator:
            yield chunk

    return StreamingResponse(stream_wrapper(), media_type="text/plain")
