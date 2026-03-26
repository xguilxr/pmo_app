from pydantic import BaseModel
from datetime import date, datetime


class RiskCreate(BaseModel):
    title: str
    description: str
    category: str | None = None
    probability: int  # 1-5
    impact: int  # 1-5
    mitigation_strategy: str | None = None
    identification_date: date
    deadline: date | None = None
    responsible_id: int | None = None


class RiskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    probability: int | None = None
    impact: int | None = None
    mitigation_strategy: str | None = None
    status: str | None = None
    deadline: date | None = None
    responsible_id: int | None = None


class RiskResponse(BaseModel):
    id: int
    folio: str
    title: str
    description: str
    category: str | None
    probability: int
    impact: int
    severity: int
    mitigation_strategy: str | None
    status: str
    identification_date: date
    deadline: date | None
    project_id: int
    responsible_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}
