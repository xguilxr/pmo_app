from pydantic import BaseModel
from datetime import date, datetime


class GenerateMinutesRequest(BaseModel):
    transcript: str
    project_id: int
    title: str | None = None
    meeting_date: date | None = None
    language: str = "es"


class MinuteResponse(BaseModel):
    id: int
    folio: str
    title: str
    meeting_date: date | None
    topics: str | None
    agreements: str | None
    participants: str | None
    source: str
    ai_model_used: str | None
    ai_generation_time_ms: int | None
    project_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class GenerateMinutesResponse(BaseModel):
    minute: MinuteResponse
    generated_text: str
    model_used: str
    engine: str
    generation_time_ms: int
