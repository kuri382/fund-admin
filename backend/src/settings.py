import os

class Settings:
    openai_api_key: str = os.environ['OPENAI_API_KEY']
    openai_project_id: str = os.environ['OPENAI_PROJECT_ID']
    openai_organization_id: str = os.environ['OPENAI_ORGANIZATION_ID']

    pdf_storage_path: str = "data/pdf"
    table_storage_path: str = "data/table"

    def __init__(self):
        if not os.path.exists(self.pdf_storage_path):
            os.makedirs(self.pdf_storage_path)
        if not os.path.exists(self.table_storage_path):
            os.makedirs(self.table_storage_path)

settings = Settings()
