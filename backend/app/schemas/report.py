from pydantic import BaseModel
from datetime import date, datetime


class ReportCreate(BaseModel):
    title: str
    period_start: date | None = None
    period_end: date | None = None
    status: str = "draft"


class ReportUpdate(BaseModel):
    title: str | None = None
    content_html: str | None = None
    period_start: date | None = None
    period_end: date | None = None
    status: str | None = None
    recipients: str | None = None


class ReportResponse(BaseModel):
    id: int
    title: str
    content_html: str | None
    period_start: date | None
    period_end: date | None
    status: str
    recipients: str | None
    sent_date: date | None
    ai_model_used: str | None
    project_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
