import os

class Settings:
    openai_api_key: str = os.environ['OPENAI_API_KEY']
    openai_project_id: str = os.environ['OPENAI_PROJECT_ID']
    openai_organization_id: str = os.environ['OPENAI_ORGANIZATION_ID']

    pdf_storage_path: str = "data/pdf_storage"

    def __init__(self):
        if not os.path.exists(self.pdf_storage_path):
            os.makedirs(self.pdf_storage_path)

settings = Settings()
