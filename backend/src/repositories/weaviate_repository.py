import logging
import weaviate
from src.repositories.abstract import DocumentRepository
from src.schemas.documents import Documents


logger = logging.getLogger(__name__)

class WeaviateDocumentRepository(DocumentRepository):
    def __init__(self, client: weaviate.Client):
        self.client = client
        self.class_name = "Documents"

    def add_documents(self, docs: Documents) -> None:

        # クラス名が "Documents" のコレクションオブジェクトを取得
        documents_collection = self.client.collections.get("Documents")
        with documents_collection.batch.dynamic() as batch:
            for item in docs.items:
                batch.add_object({
                    "user_id":       item.user_id,
                    "file_uuid":     item.file_uuid,
                    "file_name":     item.file_name,
                    "page_number":   item.page_number,
                    "transcription": item.transcription,
                })

        failed_objects = documents_collection.batch.failed_objects
        if failed_objects:
            logger.error(f"Number of failed imports: {len(failed_objects)}")
            logger.error(f"First failed object: {failed_objects[0]}")
        else:
            logger.info("Successfully added weaviate documents")
