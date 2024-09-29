from typing import Generator
import openai
from openpyxl import load_workbook

from src.settings import settings


openai.api_key = settings.openai_api_key


def send_xlsx_content_to_openai(file_path: str, client: openai.ChatCompletion) -> list[str]:
    workbook = load_workbook(file_path)
    sheet = workbook.active
    content = []

    for row in sheet.iter_rows(values_only=True):
        content.append("\t".join([str(cell) for cell in row if cell is not None]))
    text_content = "\n".join(content)

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": f"次のビジネスで用いられる表の内容に基づいて適切な英語ファイル名のみを回答せよ。拡張子は不要。:\n\n{text_content}"}],
        stream=False,
    )
    title = response.choices[0].message.content

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": f"次のビジネスで用いられる表の概要を1行で短く簡潔説明してください:\n\n{text_content}"}],
        stream=False,
    )
    sentence = response.choices[0].message.content

    return title, sentence


def generate_summary(content: str, client: openai.ChatCompletion) -> Generator[str, None, None]:
    prompt = f"以下の内容を基にデューデリジェンス向けのエグゼクティブサマリーを作成してください。日本語でお願いします：\n\n{content}"
    stream = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )

    for chunk in stream:
        if chunk.choices[0].delta.content is not None:
            yield chunk.choices[0].delta.content


def generate_market_status(content: str, client: openai.ChatCompletion) -> Generator[str, None, None]:
    prompt = f"以下の内容を基に、市場の状況に関する分析を行ってください。# 市場に対する社内の動向、# 市場に対する社外の動向という二つのセクションから続く形でお願いします。日本語でお願いします。：\n\n{content}"
    stream = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )

    for chunk in stream:
        if chunk.choices[0].delta.content is not None:
            yield chunk.choices[0].delta.content


def generate_financial_status(content: str, client: openai.ChatCompletion) -> Generator[str, None, None]:
    prompt = f"以下の内容を基に、財務状況に関する分析を行ってください。日本語でお願いします。：\n\n{content}"
    stream = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )

    for chunk in stream:
        if chunk.choices[0].delta.content is not None:
            yield chunk.choices[0].delta.content


def generate_services_status(content: str, client: openai.ChatCompletion) -> Generator[str, None, None]:
    prompt = f"以下の内容を基に、会社の主なサービスや事業に関するレポートを作成してください。会社概要は不要です。日本語でお願いします。：\n\n{content}"
    stream = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )

    for chunk in stream:
        if chunk.choices[0].delta.content is not None:
            yield chunk.choices[0].delta.content


def generate_strong_point(content: str, client: openai.ChatCompletion) -> Generator[str, None, None]:
    prompt = f"以下の内容を基にデューデリジェンス資料を作成します。この会社の強みおよびリスクについて、客観的にかつなるべく洞察に富んだ分析をお願いします。IR資料内部の綺麗な表現だけでなく実際に市場で評価されるものなのか分析してください。日本語でお願いします。：\n\n{content}"
    stream = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )

    for chunk in stream:
        if chunk.choices[0].delta.content is not None:
            yield chunk.choices[0].delta.content


def generate_file_analysis(content: str, openai_client: openai.ChatCompletion) -> Generator[str, None, None]:

    system_prompt = ("次のビジネスに関するテーブルデータを分析してください\
        全ての情報を整理して引き出せるように日本語でまとめてください。回答はJSON形式でしてください。\
        abstract: 参照したデータの概要を日本語でまとめてください。一般的な用語説明は不要です\
        extractable_info: このデータから抽出可能な情報の一覧\
        feature: このデータにおいて特徴的な傾向を詳細にまとめてください\
        category:財務会計/管理会計(売上)/管理会計(コスト)/その他 \
        ")

    response = openai_client.chat.completions.create(
        model="gpt-4o-2024-08-06",
        messages=[
            {'role': 'system', 'content': system_prompt},
            {"role": "user", "content": content}
        ],

        response_format = {
            "type": "json_schema",
            "json_schema": {
                "name": "file_analysis",
                "schema": {
                    "type": "object",
                    "properties": {
                        "abstract": {"type": "string"},
                        "feature": {"type": "string"},
                        "extractable_info": {"type": "string"},
                        "category": {"type": "string"},
                    },
                    "required": ["abstract", "feature", "extractable_info", "category"],
                    "additionalProperties": False
                },
                "strict": True
            }
        }

    )
    result_raw_abstracts = response.choices[0].message.content
    return result_raw_abstracts



def generate_pdf_analysis(content: str, openai_client: openai.ChatCompletion) -> Generator[str, None, None]:

    system_prompt = ("次のIRに関わるPDFデータについて分析し日本語でまとめてください。\
        回答はJSON形式でしてください。\
        abstract: 参照したデータの概要を日本語でまとめてください。一般的な用語説明は不要です\
        extractable_info: この資料から抽出可能な情報の一覧\
        feature: このデータにおいて特徴的な傾向を詳細にまとめてください\
        category:ドキュメントの種類について \
        ")

    response = openai_client.chat.completions.create(
        model="gpt-4o-2024-08-06",
        messages=[
            {'role': 'system', 'content': system_prompt},
            {"role": "user", "content": content}
        ],

        response_format = {
            "type": "json_schema",
            "json_schema": {
                "name": "file_analysis",
                "schema": {
                    "type": "object",
                    "properties": {
                        "abstract": {"type": "string"},
                        "feature": {"type": "string"},
                        "extractable_info": {"type": "string"},
                        "category": {"type": "string"},
                    },
                    "required": ["abstract", "feature", "extractable_info", "category"],
                    "additionalProperties": False
                },
                "strict": True
            }
        }
    )
    result_raw_abstracts = response.choices[0].message.content
    return result_raw_abstracts