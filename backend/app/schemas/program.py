from pydantic import BaseModel
from datetime import date, datetime


class ProgramCreate(BaseModel):
    name: str
    description: str | None = None
    status: str = "active"
    start_date: date | None = None
    end_date: date | None = None
    organization_id: int
    responsible_id: int | None = None


class ProgramUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    responsible_id: int | None = None


class ProgramResponse(BaseModel):
    id: int
    name: str
    description: str | None
    status: str
    start_date: date | None
    end_date: date | None
    organization_id: int
    responsible_id: int | None
    created_at: datetime
    project_count: int = 0

    model_config = {"from_attributes": True}


class ProgramDetailResponse(ProgramResponse):
    organization_name: str = ""
