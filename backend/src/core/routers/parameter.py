import asyncio
import logging
import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Literal, Optional

import openai
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import ORJSONResponse
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from pydantic import BaseModel, Field, validator
from pydantic_core import ValidationError

import src.core.services.firebase_driver as firebase_driver
from src.core.dependencies.auth import get_user_id
from src.core.dependencies.external import get_openai_client
from src.core.models.plan import Step, TempSaaSMetrics, all_fields_are_none
from src.core.services.firebase_client import FirebaseClient, get_firebase_client
from src.core.services.query import fetch_saas_metrics

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
    gross_profit_forecast: Decimal | None = Field(..., description='売上総利益 予測。単位は円')
    gross_profit_actual: Decimal | None = Field(..., description='売上総利益 実績。単位は円')

    # 売上総利益率
    gross_profit_margin_forecast: Decimal | None = Field(..., description='売上総利益率 予測。単位は円')
    gross_profit_margin_actual: Decimal | None = Field(..., description='売上総利益率 実績。単位は円')


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

    def create_quarter_data(summary: firebase_driver.BusinessSummary, metric_key: str) -> QuarterData:
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
            if summary.has_non_none_fields() and summary.period.quarter:  # summryの中に有効データがある場合
                quarter_data = create_quarter_data(summary, metric["key"])
                if quarter_data is not None:
                    values.append(quarter_data)

        if values:  # 値が存在する場合のみFinancialDataを作成
            financial_data.append(FinancialData(key=metric['key'], metric=f"{metric['name']}", values=values))
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
    gross_profit_margin_forecast: Decimal | None = Field(..., description='売上総利益率 予測。単位は円')
    gross_profit_margin_actual: Decimal | None = Field(..., description='売上総利益率 実績。単位は円')

    def has_non_none_fields(self) -> bool:
        """period以外のフィールドが全てNoneならFalse、少なくとも1つでもNoneでないフィールドがあればTrueを返す"""
        return any(value is not None for field, value in self.dict(exclude={'period'}).items())


class TempCustomResponse(BaseModel):
    steps: list[Step]
    business_summaries: list[TempSaaSMetrics] = Field(..., description='期間ごとに整理したデータ')


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
                response_format=TempCustomResponse,
            )
            return response.choices[0].message.parsed

        except ValidationError as e:
            retry_count += 1
            logger.warning(f'Validation error occurred: {e}. Retrying {retry_count}/{max_retries}')
            if retry_count >= max_retries:
                logger.error("Max retries reached. Exiting the retry loop.")
                raise e
            await asyncio.sleep(2)


def save_parameters(
    firestore_client: firestore.Client,
    user_id: str,
    file_uuid: str,
    page_number: int,
    summary: TempCustomResponse,
) -> None:
    projects_ref = firestore_client.collection('users').document(user_id).collection('projects')
    is_selected_filter = FieldFilter("is_selected", "==", True)
    query = projects_ref.where(filter=is_selected_filter).limit(1)
    selected_project = query.get()

    if not selected_project:
        raise ValueError("No project selected for the user")

    selected_project_id = selected_project[0].id
    doc_ref = (
        firestore_client.collection('users')
        .document(user_id)
        .collection('projects')
        .document(selected_project_id)
        .collection('projection')
        .document('period')
        .collection('year')
        .document(str(summary.period.year))
        .collection('month')
        .document(str(summary.period.month))
        .collection('option')
        .document(str(uuid.uuid4()))
    )

    try:
        doc_ref.set(
            {
                'file_uuid': str(file_uuid),
                'page_number': page_number,
                'business_scope': {
                    'scope_type': summary.business_scope.scope_type,
                    'company_name': summary.business_scope.company_name,
                    'department_name': summary.business_scope.department_name,
                    'product_name': summary.business_scope.product_name,
                },
                'saas_revenue_metrics': {
                    'revenue': str(summary.saas_revenue_metrics.revenue),
                    'mrr': str(summary.saas_revenue_metrics.mrr),
                    'arr': str(summary.saas_revenue_metrics.arr),
                    'arpu': str(summary.saas_revenue_metrics.arpu),
                    'arpu': str(summary.saas_revenue_metrics.arpu),
                    'expansion_revenue': str(summary.saas_revenue_metrics.expansion_revenue),
                    'new_customer_revenue': str(summary.saas_revenue_metrics.new_customer_revenue),
                },
                'saas_customer_metrics': {
                    'churn_rate': str(summary.saas_customer_metrics.churn_rate),
                    'retention_rate': str(summary.saas_customer_metrics.retention_rate),
                    'active_users': str(summary.saas_customer_metrics.active_users),
                    'trial_conversion_rate': str(summary.saas_customer_metrics.trial_conversion_rate),
                    'average_contract_value': str(summary.saas_customer_metrics.average_contract_value),
                    'nrr': str(summary.saas_customer_metrics.nrr),
                },
            }
        )
        return

    except Exception as e:
        raise HTTPException(status_code=500, detail=e)


@router.post(
    "/analyze/saas_metrics",
    response_class=ORJSONResponse,
    responses={
        status.HTTP_200_OK: {
            'description': 'Image analysis completed successfully.',
        }
    },
)
async def post_analyze_saas_metrics(
    file_uuid: str,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    openai_client: openai.ChatCompletion = Depends(get_openai_client),
    # user_id: str = Depends(get_user_id),
):
    try:
        user_id = '36n89vb4JpNwBGiuboq6BjvoY3G2'
        storage_client = firebase_client.get_storage()
        firestore_client = firebase_client.get_firestore()

        page_number = 6
        blobs = storage_client.list_blobs(prefix=f"{user_id}/image/{file_uuid}/{page_number}")

        url = None
        for blob in blobs:
            url = blob.generate_signed_url(expiration=3600, method='GET', version='v4')
        data = await send_to_analysis_api(openai_client, url)
        # data = TempCustomResponse(steps = [Step(explanation='', output='')], business_summaries = [sample_temp_saas_metrics, sample_temp_saas_metrics])

        for summary in data.business_summaries:
            if not all(
                [
                    all_fields_are_none(summary.business_scope),
                    all_fields_are_none(summary.saas_customer_metrics),
                    all_fields_are_none(summary.saas_revenue_metrics),
                ]
            ):
                # 少なくとも1つ以上の有効データが存在する場合
                save_parameters(firestore_client, user_id, file_uuid, page_number, summary=summary)
            else:
                logger.info("すべてのデータがNoneです。処理をスキップします。")
        return

    except Exception as e:
        logger.error(f"Error retrieving or analyzing images: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while retrieving or analyzing images.",
        )


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
    file_uuid: str,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    user_id: str = Depends(get_user_id),
):
    firestore_client = firebase_client.get_firestore()

    try:
        data = firebase_driver.fetch_page_summary(
            firestore_client,
            user_id,
            file_uuid,
        )
        result = convert_to_res_get_parameter_summary(data)
        return ORJSONResponse(content=jsonable_encoder(result))

    except Exception as e:
        print(f'error: {e}')
