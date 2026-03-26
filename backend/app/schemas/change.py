from pydantic import BaseModel
from datetime import date, datetime


class ChangeCreate(BaseModel):
    title: str
    description: str
    change_type: str  # scope, time, cost, resource
    impact: str | None = None
    requested_by: str | None = None
    request_date: date


class ChangeUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    change_type: str | None = None
    impact: str | None = None
    status: str | None = None
    comments: str | None = None


class ChangeResponse(BaseModel):
    id: int
    folio: str
    title: str
    description: str
    change_type: str
    impact: str | None
    requested_by: str | None
    request_date: date
    status: str
    approved_by_id: int | None
    approval_date: date | None
    comments: str | None
    project_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
