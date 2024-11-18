import asyncio
import logging
import uuid

import openai
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import ORJSONResponse
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from pydantic import BaseModel, Field
from pydantic_core import ValidationError

from src.core.dependencies.external import get_openai_client
from src.core.models.plan import Step, TempSaaSMetrics, all_fields_are_none
from src.core.services.firebase_client import FirebaseClient, get_firebase_client

logger = logging.getLogger(__name__)
router = APIRouter()


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
    "/customer_revenue",
    response_class=ORJSONResponse,
    responses={
        status.HTTP_200_OK: {
            'description': 'Image analysis completed successfully.',
        }
    },
)
async def post_projection_customer_revenue(
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
