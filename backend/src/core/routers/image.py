import logging
import re
import traceback

from fastapi.responses import ORJSONResponse
from fastapi import APIRouter, Request, HTTPException, Depends, status

from src.core.services.firebase_client import FirebaseClient, get_firebase_client
from src.core.services import auth_service
import src.core.services.firebase_driver as firebase_driver
from ._base import BaseJSONSchema


router = APIRouter(prefix='/image', tags=['image'])
logger = logging.getLogger(__name__)


class ImageURLsResponse(BaseJSONSchema):
    image_urls: list[str]


@router.get(
    "/list",
    response_class=ORJSONResponse,
    responses={status.HTTP_200_OK: {
        'description': 'parameters retrieved successfully.',
    }},
)
async def get_parameter_list(
    request: Request,
    uuid: str,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
):
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    user_id = auth_service.verify_token(authorization)

    try:
        storage_client = firebase_client.get_storage()
        blobs = storage_client.list_blobs(prefix=f"{user_id}/image/")

        image_urls: list[str] = []
        blob_with_page_numbers = []

        for blob in blobs:
            if uuid in blob.name:
                url = blob.generate_signed_url(
                    expiration=3600,
                    method='GET',
                    version='v4'
                )
                #image_urls.append(url)

                # page_n を抽出（例: "page_1" -> 1）
                match = re.search(r'page_(\d+)', blob.name)
                page_number = int(match.group(1)) if match else float('inf')  # page_nがない場合は最後に来るように

                # (page_number, url) のタプルとしてリストに追加
                blob_with_page_numbers.append((page_number, url))

        blob_with_page_numbers.sort(key=lambda x: x[0])
        image_urls = [url for _, url in blob_with_page_numbers]

        if not image_urls:
            return ORJSONResponse(content={"message": "No images found."}, status_code=status.HTTP_404_NOT_FOUND)

        return ORJSONResponse(content={"imageUrls": image_urls}, status_code=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error retrieving images: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving or processing images: {str(e)}"
        )
