import weaviate
from weaviate.classes.init import Auth
from src.settings import settings

def get_weaviate_client():
    """
    FastAPI の依存性注入で使用するための Weaviate クライアントを生成し返す関数
    """
    client = weaviate.connect_to_weaviate_cloud(
        cluster_url=settings.weaviate_url,
        auth_credentials=Auth.api_key(settings.weaviate_api_key),
        headers={
            "X-OpenAI-Api-Key": settings.openai_api_key
        }
    )
    try:
        yield client
    finally:
        client.close()
