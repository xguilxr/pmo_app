from pydantic import BaseModel
from datetime import datetime


class ObjectiveCreate(BaseModel):
    description: str
    type: str = "general"  # general, specific, kpi
    target_value: str | None = None
    current_value: str | None = None


class ObjectiveUpdate(BaseModel):
    description: str | None = None
    type: str | None = None
    target_value: str | None = None
    current_value: str | None = None
    progress: float | None = None
    status: str | None = None


class ObjectiveResponse(BaseModel):
    id: int
    description: str
    type: str
    target_value: str | None
    current_value: str | None
    progress: float
    status: str
    project_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
