from pydantic import BaseModel


class Item(BaseModel):
    user_id: str
    project_id: str
    file_uuid: str
    file_name: str
    page_number: str
    transcription: str

class Documents(BaseModel):
    items: list[Item]
