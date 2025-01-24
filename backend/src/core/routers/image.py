import logging
import traceback

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import ORJSONResponse

from src.core.dependencies.auth import get_user_id
from src.core.services.firebase_client import FirebaseClient, get_firebase_client

from ._base import BaseJSONSchema

router = APIRouter(prefix='/image', tags=['image'])
logger = logging.getLogger(__name__)


class ResImageList(BaseJSONSchema):
    image_urls: list[str]
    page_numbers: list[int]


class ImageURLsResponse(BaseJSONSchema):
    image_urls: list[str]
    page_numbers: list[int]


@router.get(
    "/list",
    response_class=ORJSONResponse,
    responses={
        status.HTTP_200_OK: {
            'description': 'images retrieved successfully.',
        }
    },
)
async def get_image_list(
    file_uuid: str,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    user_id: str = Depends(get_user_id),
):
    try:
        storage_client = firebase_client.get_storage()
        blobs = storage_client.list_blobs(prefix=f"{user_id}/image/{file_uuid}")

        blob_with_page_numbers = []

        for blob in blobs:
            if file_uuid in blob.name:
                url = blob.generate_signed_url(expiration=3600, method='GET', version='v4')
                page_number = int(blob.name.split('/')[-1])  # ファイル名からページ番号を抽出
                blob_with_page_numbers.append((page_number, url))

        blob_with_page_numbers.sort(key=lambda x: x[0])  # ページ番号でソート
        page_numbers = [page for page, _ in blob_with_page_numbers]
        image_urls = [url for _, url in blob_with_page_numbers]

        if not image_urls:
            return ORJSONResponse(
                content=None,
                status_code=status.HTTP_404_NOT_FOUND,
            )
        result = ImageURLsResponse(
            image_urls=image_urls,
            page_numbers=page_numbers
        )

        return ORJSONResponse(content=jsonable_encoder(result), status_code=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error retrieving images: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error retrieving or processing images: {str(e)}")
