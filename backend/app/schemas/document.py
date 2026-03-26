from pydantic import BaseModel
from datetime import datetime


class DocumentCreate(BaseModel):
    name: str
    description: str | None = None
    category: str | None = None  # plan, report, contract, other
    file_path: str
    file_type: str | None = None
    file_size: int | None = None


class DocumentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    version: int | None = None


class DocumentResponse(BaseModel):
    id: int
    folio: str
    name: str
    description: str | None
    category: str | None
    file_path: str
    file_type: str | None
    file_size: int | None
    version: int
    project_id: int
    uploaded_by_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}
