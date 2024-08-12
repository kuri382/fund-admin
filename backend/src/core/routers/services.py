from fastapi import APIRouter
from src.core.services.openai_client import generate_services_status

router = APIRouter()

@router.get("/get-services-status")
async def get_services_status():
    services_status = generate_services_status(pdf_text)
    return {"services_status": services_status}
