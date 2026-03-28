from pydantic import BaseModel
from datetime import datetime


class AreaCreate(BaseModel):
    name: str
    description: str | None = None
    role_in_project: str | None = None
    responsible_id: int | None = None
    responsible_name: str | None = None  # text-only fallback when no user ID


class AreaUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    role_in_project: str | None = None
    responsible_id: int | None = None
    responsible_name: str | None = None


class AreaResponse(BaseModel):
    id: int
    name: str
    description: str | None
    role_in_project: str | None
    responsible_id: int | None
    responsible_name: str | None = None
    project_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
