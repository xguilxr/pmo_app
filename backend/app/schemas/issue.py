from pydantic import BaseModel
from datetime import date, datetime


class IssueCreate(BaseModel):
    title: str
    description: str
    type: str  # action, issue, decision
    priority: str  # Alta, Media, Baja
    report_date: date
    commitment_date: date | None = None
    responsible_id: int | None = None


class IssueUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    type: str | None = None
    priority: str | None = None
    status: str | None = None
    resolution: str | None = None
    commitment_date: date | None = None
    responsible_id: int | None = None


class IssueResponse(BaseModel):
    id: int
    folio: str
    title: str
    description: str
    type: str
    priority: str
    status: str
    resolution: str | None
    report_date: date
    commitment_date: date | None
    project_id: int
    responsible_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}
