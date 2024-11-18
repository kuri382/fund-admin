import asyncio
import logging
import uuid

import openai
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import ORJSONResponse
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from pydantic import BaseModel, Field, validator
from pydantic_core import ValidationError

import src.core.services.firebase_driver as firebase_driver
from src.core.dependencies.auth import get_user_id
from src.core.dependencies.external import get_openai_client
from src.core.models.plan import Step, SummaryProfitAndLoss, all_fields_are_none
from src.core.routers._base import BaseJSONSchema
from src.core.services.firebase_client import FirebaseClient, get_firebase_client
from src.core.services.query import profit_and_loss
from src.settings import Settings

logger = logging.getLogger(__name__)
router = APIRouter()


class TempCustomResponse(BaseModel):
    steps: list[Step]
    business_summaries: list[SummaryProfitAndLoss] = Field(..., description='期間ごとに整理したデータ')


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

        except Exception as e:
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
                'profit_and_loss': {
                    'revenue': str(summary.profit_and_loss.revenue),
                    'cogs': str(summary.profit_and_loss.cogs),
                    'gross_profit_margin': str(summary.profit_and_loss.gross_profit_margin),
                    'sg_and_a': str(summary.profit_and_loss.sg_and_a),
                    'operating_income': str(summary.profit_and_loss.operating_income),
                    'operating_income_margin': str(summary.profit_and_loss.operating_income_margin),
                    'non_operating_income': str(summary.profit_and_loss.non_operating_income),
                    'non_operating_expenses': str(summary.profit_and_loss.non_operating_expenses),
                    'ordinary_income': str(summary.profit_and_loss.ordinary_income),
                    'extraordinary_income': str(summary.profit_and_loss.extraordinary_income),
                    'extraordinary_losses': str(summary.profit_and_loss.extraordinary_losses),
                    'profit_before_tax': str(summary.profit_and_loss.profit_before_tax),
                    'corporate_taxes': str(summary.profit_and_loss.corporate_taxes),
                    'net_income': str(summary.profit_and_loss.net_income),
                    'ebitda': str(summary.profit_and_loss.ebitda),
                    'psr': str(summary.profit_and_loss.psr),
                    'ev_to_ebitda': str(summary.profit_and_loss.ev_to_ebitda),
                },
            }
        )
        return

    except Exception as e:
        raise HTTPException(status_code=500, detail=e)


@router.post(
    "/metrics",
    response_class=ORJSONResponse,
    responses={
        status.HTTP_200_OK: {
            'description': 'profit and loss data retrieved successfully.',
        }
    },
)
async def post_projection_profit_and_loss_metrics(
    file_uuid: str,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    openai_client: openai.ChatCompletion = Depends(get_openai_client),
    user_id: str = Depends(get_user_id),
):
    try:
        storage_client = firebase_client.get_storage()
        firestore_client = firebase_client.get_firestore()

        max_pages_to_parse = Settings.max_pages_to_parse
        pages_to_parse = range(1, max_pages_to_parse + 1)

        for page_number in pages_to_parse:
            blobs = storage_client.list_blobs(prefix=f"{user_id}/image/{file_uuid}/{page_number}")

            url = None
            for blob in blobs:
                url = blob.generate_signed_url(expiration=3600, method='GET', version='v4')

            if url:
                data = await send_to_analysis_api(openai_client, url)

                for summary in data.business_summaries:
                    if not all(
                        [
                            all_fields_are_none(summary.profit_and_loss),
                        ]
                    ):
                        save_parameters(firestore_client, user_id, file_uuid, page_number, summary=summary)
                    else:
                        logger.info("すべてのデータがNoneです。処理をスキップします。")
            else:
                logger.info(f"No blobs found for page {page_number}")

        return {"message": "Processing completed."}

    except Exception as e:
        logger.error(f"Error retrieving or analyzing images: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while retrieving or analyzing images.",
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
        value = summary.get(data_key, {}).get(key)  # 動的に指定されたキーを使用

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
