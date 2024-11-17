import logging
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Literal, Optional

from fastapi import APIRouter, Depends, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import ORJSONResponse
from pydantic import BaseModel, Field, validator

import src.core.services.firebase_driver as firebase_driver
from src.core.dependencies.auth import get_user_id
from src.core.services.firebase_client import FirebaseClient, get_firebase_client

from ._base import BaseJSONSchema

router = APIRouter(prefix='/parameter', tags=['parameter'])
logger = logging.getLogger(__name__)


class Period(BaseJSONSchema):
    year: int = Field(..., description="年度を表す。例: 2024")
    month: int = Field(..., description="月を表す。例: 8")
    quarter: Optional[int] = Field(..., description="四半期を表す。例: 第2四半期なら2")
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

    @validator('quarter')
    def quarter_must_be_valid(cls, v):
        if v is not None and not (1 <= v <= 4):
            raise ValueError("Quarter must be between 1 and 4")
        return v


class ResGetParameterAnalysis(BaseJSONSchema):
    """GET `/explorer/pdf_pages/{uuid}` response schema"""

    period: Period

    # 売上高 Revenue
    revenue_forecast: Decimal | None = Field(..., description='売上高 予測。単位は円')
    revenue_actual: Decimal | None = Field(..., description='売上高 実績。単位は円')

    # 売上総利益 Gross Profit
    gross_profit_forecast: Decimal | None = Field(
        ..., description='売上総利益 予測。単位は円'
    )
    gross_profit_actual: Decimal | None = Field(
        ..., description='売上総利益 実績。単位は円'
    )

    # 売上総利益率
    gross_profit_margin_forecast: Decimal | None = Field(
        ..., description='売上総利益率 予測。単位は円'
    )
    gross_profit_margin_actual: Decimal | None = Field(
        ..., description='売上総利益率 実績。単位は円'
    )


class DataSource(BaseModel):
    value: Optional[float]
    source: str
    url: str


class Quarter(str, Enum):
    Q1 = "Q1"
    Q2 = "Q2"
    Q3 = "Q3"
    Q4 = "Q4"


class QuarterData(BaseModel):
    year: int
    quarter: Quarter
    data: list[DataSource]


class FinancialData(BaseModel):
    key: str
    metric: str
    values: list[QuarterData]
    selected: Optional[dict[str, DataSource]] = None


class FinancialResponse(BaseModel):
    data: list[FinancialData]


SAMPLE_DATA = [
    FinancialData(
        key="1",
        metric="売上高 実績",
        values=[
            QuarterData(
                year=2024,
                quarter=Quarter.Q1,
                data=[
                    DataSource(
                        value=9000000,
                        source="2023年決算説明資料",
                        url="https://placehold.jp/300x200.png",
                    ),
                    DataSource(
                        value=7000000,
                        source="2024年決算説明資料",
                        url="https://placehold.jp/300x200.png",
                    ),
                ],
            ),
            QuarterData(
                year=2024,
                quarter=Quarter.Q3,
                data=[
                    DataSource(
                        value=8500000,
                        source="2024年計画資料",
                        url="https://placehold.jp/300x200.png",
                    ),
                    DataSource(
                        value=8532000,
                        source="2024年Q3説明資料",
                        url="https://placehold.jp/300x200.png",
                    ),
                ],
            ),
        ],
    ),
    FinancialData(
        key="2",
        metric="売上高 予測",
        values=[
            QuarterData(
                year=2024,
                quarter=Quarter.Q1,
                data=[
                    DataSource(
                        value=9030000,
                        source="2023年決算説明資料",
                        url="https://placehold.jp/300x200.png",
                    )
                ],
            ),
            QuarterData(
                year=2024,
                quarter=Quarter.Q3,
                data=[
                    DataSource(
                        value=8300000,
                        source="2024年計画資料",
                        url="https://placehold.jp/300x200.png",
                    ),
                    DataSource(
                        value=8532000,
                        source="2024年Q3説明資料",
                        url="https://placehold.jp/300x200.png",
                    ),
                ],
            ),
        ],
    ),
    FinancialData(
        key="3",
        metric="営業利益 実績",
        values=[
            QuarterData(
                year=2024,
                quarter=Quarter.Q2,
                data=[
                    DataSource(
                        value=9000000,
                        source="2023年決算説明資料",
                        url="https://placehold.jp/300x200.png",
                    ),
                    DataSource(
                        value=7000000,
                        source="2024年決算説明資料",
                        url="https://placehold.jp/300x200.png",
                    ),
                ],
            ),
            QuarterData(
                year=2024,
                quarter=Quarter.Q3,
                data=[
                    DataSource(
                        value=8500000,
                        source="2024年計画資料",
                        url="https://placehold.jp/300x200.png",
                    ),
                    DataSource(
                        value=8532000,
                        source="2024年Q3説明資料",
                        url="https://placehold.jp/300x200.png",
                    ),
                ],
            ),
        ],
    ),
]


def convert_business_summary_to_financial_response(
    summaries: list[firebase_driver.BusinessSummary],
) -> dict:
    """
    BusinessSummaryのリストをFinancialResponseの形式に変換する

    Args:
        summaries (List[BusinessSummary]): BusinessSummaryのリスト

    Returns:
        dict: FinancialResponse形式のデータ
    """

    def get_quarter_string(quarter: int) -> str | None:
        if 1 <= int(quarter) <= 4:
            return f"Q{quarter}"
        return None

    def create_data_source(value: Decimal | None, is_forecast: bool) -> dict:
        if value is None:
            return None

        source_type = "予測" if is_forecast else "実績"
        return DataSource(
            value=float(value),
            source=f"{datetime.now().year}年 {source_type}データ",
            url="https://placehold.jp/300x200.png",
        )

    def create_quarter_data(
        summary: firebase_driver.BusinessSummary, metric_key: str
    ) -> QuarterData:
        forecast_value = getattr(summary, f"{metric_key}_forecast")
        actual_value = getattr(summary, f"{metric_key}_actual")

        if forecast_value is None and actual_value is None:
            return None

        data_sources = []
        if forecast_value is not None:
            forecast_source = create_data_source(forecast_value, True)
            if forecast_source:
                data_sources.append(forecast_source)

        if actual_value is not None:
            actual_source = create_data_source(actual_value, False)
            if actual_source:
                data_sources.append(actual_source)

        # `QuarterData`の作成と返却
        quarter_str = get_quarter_string(summary.period.quarter)
        quarter_data = QuarterData(
            year=summary.period.year,
            quarter=quarter_str,
            data=data_sources,
        )
        return quarter_data

    # メトリクスの定義
    metrics = [
        {"key": "revenue", "name": "売上高"},
        {"key": "gross_profit", "name": "売上総利益"},
        {"key": "gross_profit_margin", "name": "売上総利益率"},
    ]

    financial_data = []

    # 各メトリクスについてデータを生成

    for metric in metrics:
        values = []
        for summary in summaries:
            if (
                summary.has_non_none_fields() and summary.period.quarter
            ):  # summryの中に有効データがある場合
                quarter_data = create_quarter_data(summary, metric["key"])
                if quarter_data is not None:
                    values.append(quarter_data)

        if values:  # 値が存在する場合のみFinancialDataを作成
            financial_data.append(
                FinancialData(
                    key=metric['key'], metric=f"{metric['name']}", values=values
                )
            )
    return financial_data


@router.get(
    "/sales",
    response_class=ORJSONResponse,
    responses={
        status.HTTP_200_OK: {
            'description': 'Images retrieved successfully.',
        }
    },
)
async def get_parameter_sales(
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    user_id: str = Depends(get_user_id),
):
    firestore_client = firebase_client.get_firestore()

    try:
        data = firebase_driver.fetch_page_parameter_analysis(
            firestore_client,
            user_id,
        )
        result = convert_business_summary_to_financial_response(data)

        return FinancialResponse(data=result)
    except Exception as e:
        logger.error(f'error: {e}')


class ParameterSummaries(BaseJSONSchema):
    page_number: int
    output: str
    explanation: str
    opinion: str


class ResGetParameterSummary(BaseJSONSchema):
    """GET `/parameter/summary` request schema."""

    data: list[ParameterSummaries] = Field(None, description='ページごとの分析結果')


def convert_to_res_get_parameter_summary(
    items: list[firebase_driver.ParameterSummary],
) -> ResGetParameterSummary:
    summaries = [
        ParameterSummaries(
            page_number=item.page_number,
            output=item.output,
            explanation=item.explanation,
            opinion=item.opinion,
        )
        for item in items
    ]
    return ResGetParameterSummary(data=summaries)


@router.get(
    '/summary',
    response_class=ORJSONResponse,
    responses={
        status.HTTP_200_OK: {
            'description': 'Images retrieved successfully.',
        }
    },
)
async def get_parameter_summary(
    uuid: str,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    user_id: str = Depends(get_user_id),
):
    # user_id = '36n89vb4JpNwBGiuboq6BjvoY3G2'
    # file_uuid = '63961f2f-a852-4206-a5eb-2c6d6ed696cb'

    firestore_client = firebase_client.get_firestore()

    try:
        data = firebase_driver.fetch_page_summary(
            firestore_client,
            user_id,
            uuid,
        )
        result = convert_to_res_get_parameter_summary(data)
        return ORJSONResponse(content=jsonable_encoder(result))

    except Exception as e:
        print(f'error: {e}')
