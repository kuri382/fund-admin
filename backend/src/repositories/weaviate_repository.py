import logging
import weaviate
from src.repositories.abstract import DocumentRepository
from src.schemas.documents import Documents
from weaviate.classes.query import Filter

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
                    "project_id":    item.project_id,
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


    def search_documents(
        self,
        query: str,
        user_id: str,
        project_id: str,
        file_uuid_list: list[str] = None,
        limit: int = 8,
    ):
        documents_collection = self.client.collections.get("Documents")

        if file_uuid_list:
            response = documents_collection.query.hybrid(
                query=query,
                limit=limit,
                filters=(
                    Filter.by_property("project_id").equal(project_id) &
                    Filter.by_property("user_id").equal(user_id) &
                    Filter.by_property("file_uuid").contains_any(file_uuid_list)
                ),
                query_properties=["transcription"],
            )
            return response

        else:
            response = documents_collection.query.hybrid(
                query=query,
                limit=limit,
                filters=(
                    Filter.by_property("project_id").equal(project_id) &
                    Filter.by_property("user_id").equal(user_id)
                ),
                query_properties=["transcription"],
            )
            return response

    def search_documents_and_generate_response(
        self,
        query: str,
        user_id: str,
        project_id: str,
        grouped_task: str,
        file_uuid_list: list[str] = None,
        limit: int = 5,
    ):
        documents_collection = self.client.collections.get("Documents")

        if file_uuid_list:
            response = documents_collection.generate.near_text(
                query=query,
                limit=limit,
                filters=(
                    Filter.by_property("project_id").equal(project_id) &
                    Filter.by_property("user_id").equal(user_id) &
                    Filter.by_property("file_uuid").contains_any(file_uuid_list)
                ),
                grouped_properties=["transcription"],
                grouped_task=grouped_task,
            )
            return response

        else:
            response = documents_collection.generate.near_text(
                query=query,
                limit=limit,
                filters=(
                    Filter.by_property("project_id").equal(project_id) &
                    Filter.by_property("user_id").equal(user_id)
                ),
                grouped_properties=["transcription"],
                grouped_task=grouped_task,
            )
            return response
