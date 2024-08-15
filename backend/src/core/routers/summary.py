import os
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
import openai

from src.dependencies import get_openai_client
from src.core.services.openai_client import generate_summary, generate_strong_point
from src.core.services.pdf_processing import read_pdf_content

router = APIRouter()

@router.get("/get-summary")
async def get_summary(file_name: str = Query(...), client: openai.ChatCompletion = Depends(get_openai_client)):
    content = read_pdf_content(file_name)
    generator = generate_summary(content, client)

    async def stream_wrapper():
        for chunk in generator:
            yield chunk

    return StreamingResponse(stream_wrapper(), media_type="text/plain")

@router.get("/get-strong-point")
async def get_strong_point(file_name: str = Query(...), client: openai.ChatCompletion = Depends(get_openai_client)):
    content = read_pdf_content(file_name)
    generator = generate_strong_point(content, client)

    async def stream_wrapper():
        for chunk in generator:
            yield chunk

    return StreamingResponse(stream_wrapper(), media_type="text/plain")
