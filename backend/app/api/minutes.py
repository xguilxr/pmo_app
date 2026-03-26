from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.modules import Minute
from app.models.project import Project
from app.schemas.minutes import GenerateMinutesRequest, MinuteResponse, GenerateMinutesResponse
from app.auth.security import get_current_user
from app.services.folio import generate_folio
from app.services.ai_engine import generate_minutes

router = APIRouter(prefix="/minutes", tags=["Minutes"])


@router.get("", response_model=list[MinuteResponse])
def list_minutes(
    project_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Minute).filter(Minute.deleted_at.is_(None))
    if project_id:
        query = query.filter(Minute.project_id == project_id)
    return query.order_by(Minute.created_at.desc()).all()


@router.get("/{minute_id}", response_model=MinuteResponse)
def get_minute(minute_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    minute = db.query(Minute).filter(Minute.id == minute_id, Minute.deleted_at.is_(None)).first()
    if not minute:
        raise HTTPException(status_code=404, detail="Minuta no encontrada")
    return minute


@router.post("/generate", response_model=GenerateMinutesResponse)
async def generate_minute_from_transcript(
    data: GenerateMinutesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate project exists
    project = db.query(Project).filter(Project.id == data.project_id, Project.deleted_at.is_(None)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # Generate minutes with AI
    try:
        result = await generate_minutes(data.transcript, data.language)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    generated_text = result["text"]

    # Save minute to database
    folio = generate_folio(db, "MIN")
    minute = Minute(
        folio=folio,
        title=data.title or f"Minuta - {project.name}",
        meeting_date=data.meeting_date or date.today(),
        topics=generated_text,
        agreements=generated_text,  # Full AI output stored here
        source="ai_generated",
        transcript_text=data.transcript,
        ai_model_used=result["model"],
        ai_generation_time_ms=result["generation_time_ms"],
        project_id=data.project_id,
        recorded_by_id=current_user.id,
        created_by_id=current_user.id,
    )
    db.add(minute)
    db.commit()
    db.refresh(minute)

    return GenerateMinutesResponse(
        minute=minute,
        generated_text=generated_text,
        model_used=result["model"],
        engine=result["engine"],
        generation_time_ms=result["generation_time_ms"],
    )


@router.patch("/{minute_id}", response_model=MinuteResponse)
def update_minute(
    minute_id: int,
    title: str | None = None,
    topics: str | None = None,
    agreements: str | None = None,
    participants: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    minute = db.query(Minute).filter(Minute.id == minute_id, Minute.deleted_at.is_(None)).first()
    if not minute:
        raise HTTPException(status_code=404, detail="Minuta no encontrada")

    if title is not None:
        minute.title = title
    if topics is not None:
        minute.topics = topics
    if agreements is not None:
        minute.agreements = agreements
    if participants is not None:
        minute.participants = participants

    db.commit()
    db.refresh(minute)
    return minute
