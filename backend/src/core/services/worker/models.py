from pydantic import BaseModel


class SummaryMetadata(BaseModel):
    user_id: str
    file_uuid: str
    file_name: str
    summary_text: str


class PageMetadata(BaseModel):
    user_id: str
    file_uuid: str
    file_name: str
    page_number: str
