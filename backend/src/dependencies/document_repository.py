from fastapi import Depends
from src.dependencies.weaviate_client import get_weaviate_client
from src.repositories.weaviate_repository import WeaviateDocumentRepository
from src.repositories.abstract import DocumentRepository


def get_document_repository(
    client = Depends(get_weaviate_client),
) -> DocumentRepository:
    """
    Repository の抽象クラスを返す。
    実際には WeaviateDocumentRepository を生成して使う。
    """
    return WeaviateDocumentRepository(client)
