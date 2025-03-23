from pydantic import BaseModel


class SummaryMetadata(BaseModel):
    user_id: str
    file_uuid: str
    file_name: str
    summary_text: str


class PageMetadata(BaseModel):
    user_id: str
    project_id: str
    file_uuid: str
    file_name: str
    page_number: str
    max_page_number: str


class SingedUrlMetadata(BaseModel):
    user_id: str
    project_id: str
    gcs_path: str
    filename: str
    file_uuid: str
