import logging
import uuid

import openai
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import ORJSONResponse
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from pydantic import BaseModel, Field

from src.core.dependencies.auth import get_user_id
from src.core.dependencies.external import get_openai_client
from src.core.models.plan import Step, TempSaaSMetrics, all_fields_are_none
from src.core.services.firebase_client import FirebaseClient, get_firebase_client
from src.settings import Settings

logger = logging.getLogger(__name__)
router = APIRouter()


class TempCustomResponse(BaseModel):
    steps: list[Step]
    business_summaries: list[TempSaaSMetrics] = Field(..., description='期間ごとに整理したデータ')


def send_to_analysis_api(openai_client, image_url, max_retries=3):
    """OpenAI APIにリクエストを送信し、パースされたレスポンスを取得する。リトライ機能付き"""
    retry_count = 0
    while retry_count < max_retries:
        logger.info(f'OpenAI API retry: {retry_count+1}/{max_retries}')
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
                        "content": "- かならず単位を円で計算しなさい。「百万円」や「億円」をすべて「円」に統一する。 - 範囲の値がある場合には最大値を採用せよ",
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
                'saas_revenue_metrics': (
                    {
                        'revenue': str(summary.saas_revenue_metrics.revenue) if summary.saas_revenue_metrics else None,
                        'mrr': str(summary.saas_revenue_metrics.mrr) if summary.saas_revenue_metrics else None,
                        'arr': str(summary.saas_revenue_metrics.arr) if summary.saas_revenue_metrics else None,
                        'arpu': str(summary.saas_revenue_metrics.arpu) if summary.saas_revenue_metrics else None,
                        'expansion_revenue': (
                            str(summary.saas_revenue_metrics.expansion_revenue)
                            if summary.saas_revenue_metrics
                            else None
                        ),
                        'new_customer_revenue': (
                            str(summary.saas_revenue_metrics.new_customer_revenue)
                            if summary.saas_revenue_metrics
                            else None
                        ),
                    }
                    if summary.saas_revenue_metrics
                    else None
                ),
                'saas_customer_metrics': (
                    {
                        'churn_rate': (
                            str(summary.saas_customer_metrics.churn_rate) if summary.saas_customer_metrics else None
                        ),
                        'retention_rate': (
                            str(summary.saas_customer_metrics.retention_rate)
                            if summary.saas_customer_metrics
                            else None
                        ),
                        'active_users': (
                            str(summary.saas_customer_metrics.active_users) if summary.saas_customer_metrics else None
                        ),
                        'trial_conversion_rate': (
                            str(summary.saas_customer_metrics.trial_conversion_rate)
                            if summary.saas_customer_metrics
                            else None
                        ),
                        'average_contract_value': (
                            str(summary.saas_customer_metrics.average_contract_value)
                            if summary.saas_customer_metrics
                            else None
                        ),
                        'nrr': str(summary.saas_customer_metrics.nrr) if summary.saas_customer_metrics else None,
                    }
                    if summary.saas_customer_metrics
                    else None
                ),
            }
        )
        return

    except Exception as e:
        raise HTTPException(status_code=500, detail=e)


def process_customer_revenue_analysis(
    file_uuid: str,
    firebase_client: FirebaseClient,
    openai_client: openai.ChatCompletion,
    user_id: str,
):
    try:
        storage_client = firebase_client.get_storage()
        firestore_client = firebase_client.get_firestore()

        max_pages_to_parse = Settings.max_pages_to_parse
        pages_to_parse = range(1, max_pages_to_parse + 1)

        for page_number in pages_to_parse:
            logger.info(f'page_number: {page_number}')

            blobs = list(storage_client.list_blobs(prefix=f"{user_id}/image/{file_uuid}/{page_number}"))
            if not blobs:
                logger.info(f"No blobs found for page {page_number}")
                continue

            for blob in blobs:
                url = blob.generate_signed_url(expiration=3600, method='GET', version='v4')
                if not url:
                    logger.warning("URL の生成に失敗しました。スキップします。")
                    continue

                data = send_to_analysis_api(openai_client, url)
                if not data.business_summaries:
                    logger.info(f"No business summaries found in page {page_number}")
                    continue

                for summary in data.business_summaries:
                    if summary is None:
                        logger.warning("Summary が None のためスキップします。")
                        continue

                    # 各フィールドの None チェック
                    if summary.saas_revenue_metrics is None and summary.saas_customer_metrics is None:
                        logger.warning("Revenue metrics と Customer metrics がどちらも None のためスキップします。")
                        continue

                    try:
                        logger.info('正常データを保存します')
                        save_parameters(
                            firestore_client,
                            user_id,
                            file_uuid,
                            page_number,
                            summary=summary,
                        )
                    except AttributeError as e:
                        logger.error(f"Error accessing dict for metrics: {e}. Skipping this summary.")
                        continue

    except Exception as e:
        logger.error(f"Error during background analysis: {str(e)}")


@router.post(
    "/customer_revenue",
    response_class=ORJSONResponse,
    responses={
        status.HTTP_200_OK: {
            'description': 'Request accepted. Image analysis will be processed in the background.',
        }
    },
)
async def post_projection_customer_revenue(
    file_uuid: str,
    background_tasks: BackgroundTasks,
    firebase_client: FirebaseClient = Depends(get_firebase_client),
    openai_client: openai.ChatCompletion = Depends(get_openai_client),
    user_id: str = Depends(get_user_id),
):
    try:
        # バックグラウンドで実行する関数を登録
        background_tasks.add_task(
            process_customer_revenue_analysis,
            file_uuid,
            firebase_client,
            openai_client,
            user_id,
        )

        return {"message": "Request accepted. Processing will continue in the background."}

    except Exception as e:
        logger.error(f"Error initiating background task: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while initiating background task.",
        )
