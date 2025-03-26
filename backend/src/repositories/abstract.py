from abc import ABC, abstractmethod
from src.schemas.documents import Documents


class DocumentRepository(ABC):
    @abstractmethod
    def add_documents(self, docs: Documents) -> None:
        """
        Pydantic の Documents オブジェクトを受け取り、ストレージに保存する
        """
        pass
