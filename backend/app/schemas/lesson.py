from pydantic import BaseModel
from datetime import datetime


class LessonCreate(BaseModel):
    title: str
    description: str
    category: str | None = None  # success, improvement, error
    project_phase: str | None = None
    recommendation: str | None = None


class LessonUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    project_phase: str | None = None
    recommendation: str | None = None


class LessonResponse(BaseModel):
    id: int
    folio: str
    title: str
    description: str
    category: str | None
    project_phase: str | None
    recommendation: str | None
    project_id: int
    recorded_by_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}
