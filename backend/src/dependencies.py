from functools import lru_cache
from firebase_admin import credentials, initialize_app, firestore, storage, get_app, _apps
from openai import OpenAI

from .settings import settings

def get_openai_client():
    openai_client = OpenAI(
        organization = settings.openai_organization_id,
        project      = settings.openai_project_id,
        api_key      = settings.openai_api_key,
    )
    return openai_client

