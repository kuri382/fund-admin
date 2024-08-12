from fastapi import APIRouter
from src.core.services.openai_client import generate_financial_status

router = APIRouter()

@router.get("/get-financial-status")
async def get_financial_status():
    financial_status = generate_financial_status(pdf_text)
    return {"financial_status": financial_status}
