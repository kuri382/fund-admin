import logging

import openai
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import ORJSONResponse
from pydantic import  Field

from src.core.dependencies.auth import get_user_id
from src.core.dependencies.external import get_openai_client
from src.core.routers._base import BaseJSONSchema
from src.core.services.endpoints.projection import process_profit_and_loss_metrics
from src.core.services.firebase_client import FirebaseClient, get_firebase_client
from src.core.services.query import profit_and_loss

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/metrics",
    response_class=ORJSONResponse,
    responses={
        status.HTTP_200_OK: {
            'description': 'Profit and loss data retrieval request accepted.',
        }
    },
)
async def post_projection_profit_and_loss_metrics(
    file_uuid: str,
    background_tasks: BackgroundTasks,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    openai_client: openai.ChatCompletion = Depends(get_openai_client),
    user_id: str = Depends(get_user_id),
):
    try:
        # バックグラウンドタスクを登録
        background_tasks.add_task(
            process_profit_and_loss_metrics,
            file_uuid,
            firebase_client,
            openai_client,
            user_id,
        )

        # 即時レスポンス
        return {"message": "Request accepted. Processing will continue in the background."}

    except Exception as e:
        logger.error(f"Error initiating background task: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while initiating the background task.",
        )


class Items(BaseJSONSchema):
    value: str
    url: str


class Params(BaseJSONSchema):
    key: str
    title: str
    values: list[Items]


class ResPeriod(BaseJSONSchema):
    year: int = Field(..., description="年度を表す。例: 2024")
    month: int = Field(..., description="月を表す。例: 8")


class GetPLMetrics(BaseJSONSchema):
    period: ResPeriod
    page_number: int
    items: list[Params]


class ResGetPLMetrics(BaseJSONSchema):
    """GET `/parameter/saas_metrics` request schema."""

    rows: list[GetPLMetrics] = Field(None, description='月ごとのデータ')


def get_image_url(storage_client, user_id: str, file_uuid: str, page_number: int):
    blobs = storage_client.list_blobs(prefix=f"{user_id}/image/{file_uuid}/{page_number}")
    for blob in blobs:
        url = blob.generate_signed_url(expiration=3600, method='GET', version='v4')
    return url


def add_or_update_monthly_data(
    storage_client,
    user_id: str,
    monthly_data: dict,
    summary: dict,
    year: int,
    data_key: str,
):
    """月ごとのデータを追加または更新する"""
    month = summary["month"]
    url = get_image_url(storage_client, user_id, summary["file_uuid"], int(summary["page_number"]))

    # 初期データの作成
    if month not in monthly_data:
        monthly_data[month] = GetPLMetrics(
            period=ResPeriod(year=year, month=month), page_number=summary["page_number"], items=[]
        )

    keys_and_titles = [
        ("revenue", "売上高"),
        ("cogs", "売上原価"),
        ("gross_profit_margin", "売上総利益率"),
        ("sg_and_a", "販売費・一般管理費"),
        ("operating_income", "営業利益"),
        ("operating_income_margin", "営業利益率"),
        ("non_operating_income", "営業外収益"),
        ("non_operating_expenses", "営業外費用"),
        ("ordinary_income", "経常利益"),
        ("extraordinary_income", "特別利益"),
        ("extraordinary_losses", "特別損失"),
        ("profit_before_tax", "税引前当期純利益"),
        ("corporate_taxes", "法人税等"),
        ("net_income", "当期純利益"),
        ("ebitda", "EBITDA"),
        ("psr", "株価収益率 (PSR)"),
        ("ev_to_ebitda", "企業価値倍率 (EV/EBITDA)"),
        ("arpu", "ARPU(ユーザー1人あたりの平均収益)"),
        ("mrr", "MRR"),
        ("arr", "ARR"),
        ("expansion_revenue", "既存顧客からの追加収益（アップセル・クロスセル）"),
        ("new_customer_revenue", "新規顧客からの収益"),
        ("churn_rate", "解約率"),
        ("retention_rate", "継続率"),
        ("active_users", "アクティブユーザー数"),
        ("trial_conversion_rate", "無料トライアルから有料プランへの転換率"),
        ("average_contract_value", "顧客1件あたりの平均契約額"),
    ]

    for key, title in keys_and_titles:
        value = None
        if isinstance(summary, dict) and isinstance(summary.get(data_key), dict):
            value = summary.get(data_key, {}).get(key)

        if value is not None:
            # 既存データの確認
            existing_param = next((param for param in monthly_data[month].items if param.key == key), None)
            if not existing_param:
                # 新規追加
                monthly_data[month].items.append(
                    Params(key=key, title=title, values=[Items(value=str(value), url=url)])
                )
            else:
                # 既存項目への追加
                existing_values = [item.value for item in existing_param.values]
                if str(value) not in existing_values:
                    existing_param.values.append(Items(value=str(value), url=url))


def process_summaries(storage_client, user_id: str, summaries: list[dict], year: int) -> ResGetPLMetrics:
    """すべてのサマリーを処理して月ごとのデータを生成する"""
    monthly_data = {}

    for summary in summaries:
        if summary["business_scope"]["scope_type"] == "company":
            data_key = 'profit_and_loss'
            add_or_update_monthly_data(storage_client, user_id, monthly_data, summary, year, data_key)
        else:
            data_key = 'saas_customer_metrics'
            add_or_update_monthly_data(storage_client, user_id, monthly_data, summary, year, data_key)
            data_key = 'saas_revenue_metrics'
            add_or_update_monthly_data(storage_client, user_id, monthly_data, summary, year, data_key)

    return ResGetPLMetrics(rows=list(monthly_data.values()))


@router.get(
    "/metrics",
    response_class=ORJSONResponse,
    responses={
        status.HTTP_200_OK: {
            'description': 'profit and loss metrics retrieved successfully.',
        }
    },
)
async def get_projection_profit_and_loss_metrics(
    year: int,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    user_id: str = Depends(get_user_id),
):
    firestore_client = firebase_client.get_firestore()
    storage_client = firebase_client.get_storage()

    try:
        summaries = profit_and_loss.fetch_metrics_by_year(
            firestore_client,
            user_id,
            year,
        )
        content = process_summaries(storage_client, user_id, summaries, year)

        return ORJSONResponse(content=jsonable_encoder(content))

    except Exception as e:
        logger.error(f'error: {e}')
