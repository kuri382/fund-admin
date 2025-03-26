import logging
import uuid

import openai
from fastapi import APIRouter, HTTPException
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from pydantic import BaseModel, Field

from src.core.models.plan import Step, SummaryProfitAndLoss, all_fields_are_none
from src.settings import Settings
import src.core.services.firebase_driver as firebase_driver

logger = logging.getLogger(__name__)
router = APIRouter()


class TempCustomResponse(BaseModel):
    steps: list[Step]
    business_summaries: list[SummaryProfitAndLoss] = Field(..., description='期間ごとに整理したデータ')


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


def send_to_analysis_api(openai_client, image_url, max_retries=3):
    """OpenAI APIにリクエストを送信し、パースされたレスポンスを取得する。リトライ機能付き"""
    retry_count = 0
    while retry_count < max_retries:
        #logger.info(f'OpenAI API retry: {retry_count+1}/{max_retries}')
        try:
            response = openai_client.beta.chat.completions.parse(
                model='gpt-4o-2024-08-06',
                messages=[
                    {
                        "role": "system",
                        "content": "接頭語に気をつけながら、かならず単位を円で計算しなさい。「百万円」や「億円」をすべて「円」に統一する - 範囲の値がある場合には最大値を採用せよ",
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



async def process_profit_and_loss_metrics(
    user_id: str,
    file_uuid: str,
    firestore_client,
    storage_client,
    openai_client: openai.ChatCompletion,
):
    try:
        max_pages_to_parse = Settings.max_pages_to_parse
        pages_to_parse = range(1, max_pages_to_parse + 1)

        for page_number in pages_to_parse:
            blobs = storage_client.list_blobs(prefix=f"{user_id}/image/{file_uuid}/{page_number}")

            url = None
            for blob in blobs:
                url = blob.generate_signed_url(expiration=3600, method='GET', version='v4')
            if url:
                data = send_to_analysis_api(openai_client, url)
                if data.business_summaries:
                    for summary in data.business_summaries:
                        if summary is None or summary.profit_and_loss is None:
                            logger.warning("Summary または Profit and Loss が None のためスキップ")
                            continue

                        if all_fields_are_none(summary.profit_and_loss):
                            logger.warning("Profit and Loss の全フィールドが None のためスキップ")
                            continue

                        logger.info('正常データがあるため保存')
                        save_parameters(firestore_client, user_id, file_uuid, page_number, summary=summary)

            else:
                logger.info(f"No blobs found for page {page_number}")

    except Exception as e:
        logger.error(f"Error during background analysis: {str(e)}")


async def process_single_page_profit_and_loss(
    user_id: str,
    file_uuid: str,
    firestore_client,
    storage_client,
    openai_client: openai.ChatCompletion,
    page_number: int,
):
    """
    特定のページ番号についてProfit and Lossメトリクスを処理する関数。

    Args:
        user_id (str): ユーザーID。
        file_uuid (str): ファイルのUUID。
        firestore_client: Firestoreクライアント。
        storage_client: ストレージクライアント。
        openai_client (openai.ChatCompletion): OpenAIクライアント。
        page_number (int): 処理するページ番号。

    Returns:
        None
    """
    # project_idを取得する
    try:
        project_id = firebase_driver.get_project_id(user_id, firestore_client)

    except Exception as e:
        detail = f'error loading project id: {str(e)}'
        raise HTTPException(status_code=400, detail=detail)

    try:
        # ページ番号に基づいてストレージ内のBlobを検索
        blobs = storage_client.list_blobs(prefix=f"{user_id}/projects/{project_id}/image/{file_uuid}/{page_number}")

        # 署名付きURLを生成
        url = None
        for blob in blobs:
            url = blob.generate_signed_url(expiration=3600, method='GET', version='v4')

        if url:
            data = send_to_analysis_api(openai_client, url)

            if data.business_summaries:
                for summary in data.business_summaries:
                    if summary is None or summary.profit_and_loss is None:
                        logger.warning(f"[Page {page_number}] Summary または Profit and Loss が None のためスキップ")
                        continue

                    if all_fields_are_none(summary.profit_and_loss):
                        logger.warning(f"[Page {page_number}] Profit and Loss の全フィールドが None のためスキップ")
                        continue

                    logger.info(f"[Page {page_number}] Valid data found, saving to Firestore")

                    # Firestoreにデータ保存
                    save_parameters(firestore_client, user_id, file_uuid, page_number, summary=summary)

        else:
            logger.info(f"[Page {page_number}] No blobs found for processing")

    except Exception as e:
        logger.error(f"Error processing page {page_number}: {str(e)}", exc_info=True)

