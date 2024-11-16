import os

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings:
    openai_api_key: str = os.environ['OPENAI_API_KEY']
    openai_project_id: str = os.environ['OPENAI_PROJECT_ID']
    openai_organization_id: str = os.environ['OPENAI_ORGANIZATION_ID']

    firebase_auth_secret_key: str = os.environ['FIREBASE_AUTH_SECRET_KEY']
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    algorithm: str = str(os.getenv("ALGORITHM", "HS256"))
    firebase_credentials: str = str(os.getenv("FIREBASE_CREDENTIALS", "env.bak/granite-dev-2024-firebase-adminsdk-77135-c8b037965d.json"))


    class APIDocs(BaseSettings):
        """APIDocs settings.
        """

        enable_docs: bool = Field(True, env='ENABLE_DOCS')
        enable_redoc: bool = Field(True, env='ENABLE_REDOC')


    api_docs = APIDocs()

settings = Settings()
