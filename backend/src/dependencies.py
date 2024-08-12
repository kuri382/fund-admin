from fastapi import Depends
from openai import OpenAI
from .settings import settings

'''
def get_openai_client():
    openai.api_key = settings.openai_api_key
    return openai.ChatCompletion()
'''


def get_openai_client():
    openai_client = OpenAI(
        organization = settings.openai_organization_id,
        project      = settings.openai_project_id,
        api_key      = settings.openai_api_key,
    )
    return openai_client

