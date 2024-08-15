from typing import Generator
import openai
from src.settings import settings

openai.api_key = settings.openai_api_key

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