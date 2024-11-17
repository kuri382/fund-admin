import asyncio
import logging
import re
import traceback
from decimal import Decimal
from typing import Literal

import openai
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import ORJSONResponse
from pydantic import BaseModel, Field, validator
from pydantic_core import ValidationError

from src.core.dependencies.auth import get_user_id
from src.core.dependencies.external import get_openai_client
from src.core.services.firebase_client import FirebaseClient, get_firebase_client

from ._base import BaseJSONSchema

router = APIRouter(prefix='/image', tags=['image'])
logger = logging.getLogger(__name__)


class ImageURLsResponse(BaseJSONSchema):
    image_urls: list[str]


@router.get(
    "/list",
    response_class=ORJSONResponse,
    responses={
        status.HTTP_200_OK: {
            'description': 'parameters retrieved successfully.',
        }
    },
)
async def get_parameter_list(
    uuid: str,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    user_id: str = Depends(get_user_id),
):
    try:
        storage_client = firebase_client.get_storage()
        blobs = storage_client.list_blobs(prefix=f"{user_id}/image/")

        image_urls: list[str] = []
        blob_with_page_numbers = []

        for blob in blobs:
            if uuid in blob.name:
                url = blob.generate_signed_url(
                    expiration=3600, method='GET', version='v4'
                )
                # image_urls.append(url)

                # page_n を抽出（例: "page_1" -> 1）
                match = re.search(r'page_(\d+)', blob.name)
                page_number = (
                    int(match.group(1)) if match else float('inf')
                )  # page_nがない場合は最後に来るように

                # (page_number, url) のタプルとしてリストに追加
                blob_with_page_numbers.append((page_number, url))

        blob_with_page_numbers.sort(key=lambda x: x[0])
        image_urls = [url for _, url in blob_with_page_numbers]

        if not image_urls:
            return ORJSONResponse(
                content={"message": "No images found."},
                status_code=status.HTTP_404_NOT_FOUND,
            )

        return ORJSONResponse(
            content={"imageUrls": image_urls}, status_code=status.HTTP_200_OK
        )

    except Exception as e:
        logger.error(f"Error retrieving images: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Error retrieving or processing images: {str(e)}"
        )


class Period(BaseModel):
    year: int = Field(..., description="年度を表す。例: 2024")
    month: int = Field(..., description="月を表す。例: 8")
    quarter: int | None = Field(..., description="四半期を表す。例: 第2四半期なら2、該当なしはNone")
    period_type: Literal["年度", "月次", "四半期"] = Field(
        None, description="期間の種類を表す。'期' または '四半期' など"
    )

    @validator('year')
    def year_must_be_four_digits(cls, v):
        if not (1000 <= v <= 9999):
            raise ValueError("Year must be a four-digit integer")
        return v

    @validator('month')
    def month_must_be_valid(cls, v):
        if not (1 <= v <= 12):
            raise ValueError("Month must be between 1 and 12")
        return v

    @validator('quarter', always=True)
    def quarter_must_be_valid(cls, v, values):
        if v is None:
            return v
        if not (1 <= v <= 4):
            raise ValueError("Quarter must be between 1 and 4")
        return v


class BusinessSummary(BaseModel):
    period: Period

    # 売上高 Revenue
    revenue_forecast: Decimal | None = Field(..., description='売上高 予測。単位は円')
    revenue_actual: Decimal | None = Field(..., description='売上高 実績。単位は円')

    # 売上総利益 Gross Profit
    gross_profit_forecast: Decimal | None = Field(..., description='売上総利益 予測。単位は円')
    gross_profit_actual: Decimal | None = Field(..., description='売上総利益 実績。単位は円')

    # 売上総利益率
    gross_profit_margin_forecast: Decimal | None = Field(
        ..., description='売上総利益率 予測。単位は円'
    )
    gross_profit_margin_actual: Decimal | None = Field(
        ..., description='売上総利益率 実績。単位は円'
    )

    def has_non_none_fields(self) -> bool:
        """period以外のフィールドが全てNoneならFalse、少なくとも1つでもNoneでないフィールドがあればTrueを返す"""
        return any(
            value is not None for field, value in self.dict(exclude={'period'}).items()
        )


class Step(BaseModel):
    explanation: str
    output: str


class CustomResponse(BaseModel):
    steps: list[Step]
    # opinion: str = Field(..., description='アナリスト視点での分析。リスク要素や異常値の確認を相対的・トレンド分析を交えながら行う')
    business_summaries: list[BusinessSummary] = Field(..., description='期間ごとに整理したデータ')


async def send_to_analysis_api(openai_client, image_url, max_retries=3):
    """OpenAI APIにリクエストを送信し、パースされたレスポンスを取得する。リトライ機能付き"""
    retry_count = 0
    while retry_count < max_retries:
        logger.info(f'OpenAI API retry: {retry_count}/{max_retries}')
        try:
            response = openai_client.beta.chat.completions.parse(
                model='gpt-4o-2024-08-06',
                messages=[
                    {
                        "role": "system",
                        "content": "あなたはバイサイドアナリストです。厳しい目線で経営・事業の状況を解説します。日本語で回答します。",
                    },
                    {
                        "role": "system",
                        "content": "接頭語に気をつけながら、かならず単位を円で計算しなさい。「百万円」や「億円」をすべて「円」に統一する",
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "次のデータに含まれる情報を、集計期間に気をつけながら段階的に整理します。",
                            },
                            {"type": "image_url", "image_url": {"url": image_url}},
                        ],
                    },
                ],
                temperature=0.3,
                response_format=CustomResponse,
            )
            return response.choices[0].message.parsed

        except ValidationError as e:
            retry_count += 1
            logger.warning(
                f'Validation error occurred: {e}. Retrying {retry_count}/{max_retries}'
            )
            if retry_count >= max_retries:
                logger.error("Max retries reached. Exiting the retry loop.")
                raise e
            await asyncio.sleep(2)


@router.get(
    "/analyze",
    response_class=ORJSONResponse,
    responses={
        status.HTTP_200_OK: {
            'description': 'Image analysis completed successfully.',
        }
    },
)
async def get_parameter_analyze(
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    openai_client: openai.ChatCompletion = Depends(get_openai_client),
    # user_id: str = Depends(get_user_id),
):
    try:
        user_id = '36n89vb4JpNwBGiuboq6BjvoY3G2'
        storage_client = firebase_client.get_storage()

        # 7 cpa や顧客ARPUなど
        file_title = (
            '0c504cb0-5c8f-4440-9237-1ddcb7e9d4c0_2024年8月度月次業績報告資料 copy.pdf+page_7'
        )
        # 5 セグメント売上抽出
        file_title = (
            '0c504cb0-5c8f-4440-9237-1ddcb7e9d4c0_2024年8月度月次業績報告資料 copy.pdf+page_5'
        )
        blobs = storage_client.list_blobs(prefix=f"{user_id}/image/")

        url = None
        for blob in blobs:
            if file_title in blob.name:
                url = blob.generate_signed_url(
                    expiration=3600, method='GET', version='v4'
                )

        # Send encoded images to an external API for analysis
        analysis_result = await send_to_analysis_api(openai_client, url)
        print(analysis_result)

        return None

    except Exception as e:
        logger.error(f"Error retrieving or analyzing images: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while retrieving or analyzing images.",
        )
