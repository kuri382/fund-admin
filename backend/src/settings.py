import os

class Settings:
    openai_api_key: str = os.environ['OPENAI_API_KEY']
    openai_project_id: str = os.environ['OPENAI_PROJECT_ID']
    openai_organization_id: str = os.environ['OPENAI_ORGANIZATION_ID']

    firebase_auth_secret_key: str = os.environ['FIREBASE_AUTH_SECRET_KEY']
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    algorithm: str = str(os.getenv("ALGORITHM", "HS256"))

    pdf_storage_path: str = "data/pdf"
    table_storage_path: str = "data/table"

    def __init__(self):
        if not os.path.exists(self.pdf_storage_path):
            os.makedirs(self.pdf_storage_path)
        if not os.path.exists(self.table_storage_path):
            os.makedirs(self.table_storage_path)

settings = Settings()
