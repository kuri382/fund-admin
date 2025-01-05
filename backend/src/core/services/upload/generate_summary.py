import asyncio
import base64
import logging
import requests

from pydantic import BaseModel, Field
from pydantic_core import ValidationError

import src.core.services.firebase_driver as firebase_driver


logger = logging.getLogger(__name__)


class Step(BaseModel):
    explanation: str
    output: str


class CustomResponse(BaseModel):
    steps: list[Step]
    opinion: str = Field(
        ...,
        description='アナリスト視点での分析を行う。リスク要素や異常値の確認を相対的・トレンド分析を交えながら行う',
    )
    business_summary: firebase_driver.BusinessSummary


async def get_page_summary(openai_client, image_base64, max_retries=3):
    """OpenAI APIにリクエストを送信し、パースされたレスポンスを取得する。リトライ機能付き"""
    retry_count = 0
    while retry_count < max_retries:
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
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
                            },
                        ],
                    },
                ],
                response_format=CustomResponse,
            )
            parsed_response = response.choices[0].message.parsed

            # opinionの文字数チェック
            if len(parsed_response.opinion) > 2000:
                raise ValueError("opinion length exceeds 2000 characters. Retrying...")

            return parsed_response

        except (ValidationError, ValueError) as e:
            retry_count += 1
            logger.warning(f'Error occurred: {e}. Retrying {retry_count}/{max_retries}')
            if retry_count >= max_retries:
                logger.error("Max retries reached. Exiting the retry loop.")
                raise e
            await asyncio.sleep(2)


def get_encoded_image(url: str) -> str:
    """
    URL先の画像を取得してBase64エンコードする
    :param url: 画像のURL
    :return: Base64エンコードされた画像データ
    """
    try:
        response = requests.get(url)
        response.raise_for_status()
        encoded_image = base64.b64encode(response.content).decode('utf-8')
        return encoded_image

    except requests.exceptions.RequestException as e:
        raise ValueError(f"Failed to fetch image from URL: {e}")
