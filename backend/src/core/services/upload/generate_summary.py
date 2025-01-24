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


async def get_analyst_report(openai_client, image_base64, max_retries=3):
    """
    OpenAI APIにリクエストを送信し、パースされたレスポンスを取得する。
    型に合わない場合リトライを行う
    """

    prompt = '''これから提示する資料について、企業が公表している事実関係や業績データを客観的にまとめる。
                あえて触れられていないかもしれないリスク要因や経営課題を推測して指摘する。
                財務情報の整合性や事業戦略の実現可能性だけでなく、経営陣が認識しているはずの懸念点（市場競合、法規制上の問題、継続的なキャッシュフロー確保の難易度など）が見え隠れする箇所がないかを探り、根拠となる情報や思考プロセスも簡潔に示してください。
                リスクについて精緻に予測すべく、追加で確認すべき事項があれば述べてください。
            '''

    retry_count = 0
    while retry_count < max_retries:
        try:
            response = openai_client.beta.chat.completions.parse(
                model='gpt-4o-2024-08-06',
                messages=[
                    {
                        "role": "system",
                        "content": "- 日本語で回答せよ。- 回答の際には「です、ます」ではなく「だ、である」を使用せよ。- 日本の資料の「▲」はマイナスを意味する。 - ロジカルに、そして丁寧に詳しく説明すること。",
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt,
                            },
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
                            },
                        ],
                    },
                ],
                response_format=firebase_driver.AnalystReport,
            )
            parsed_response = response.choices[0].message.parsed
            return parsed_response

        except (ValidationError, ValueError) as e:
            retry_count += 1
            logger.warning(f'Error occurred: {e}. Retrying {retry_count}/{max_retries}')
            if retry_count >= max_retries:
                logger.error("Max retries reached. Exiting the retry loop.")
                raise e
            await asyncio.sleep(2)



async def get_transcription(openai_client, image_base64, max_retries=3):
    """
    OpenAI APIにリクエストを送信し、画像ファイルに記述された内容を正確に表現された文章を返す
    """

    prompt = '''次のビジネスで用いられるファイルについて、記述されたすべての内容を正確かつ丁寧に抽出して、日本語で文章化してください。
            固有名詞以外は日本語に翻訳して、人間が読みやすい状態にしてください。
            '''

    retry_count = 0
    while retry_count < max_retries:
        try:
            response = openai_client.beta.chat.completions.parse(
                model='gpt-4o-2024-08-06',
                messages=[
                    {
                        "role": "system",
                        "content": "- 日本語で回答せよ。- 回答の際には「です、ます」ではなく「だ、である」を使用せよ。",
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt,
                            },
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
                            },
                        ],
                    },
                ],
                response_format=firebase_driver.TranscriptionReport,
            )
            parsed_response = response.choices[0].message.parsed
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
