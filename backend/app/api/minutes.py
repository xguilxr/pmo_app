from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.modules import Minute
from app.schemas.minutes import GenerateMinutesRequest, MinuteResponse, GenerateMinutesResponse, MinuteCreate, MinuteUpdate
from app.auth.security import get_current_user
from app.dependencies import get_current_tenant
from app.utils.tenant_query import verify_project_tenant
from app.utils.crud_helpers import get_or_404, apply_update, soft_delete
from app.services.folio import generate_folio
from app.services.ai_engine import generate_minutes

router = APIRouter(prefix="/minutes", tags=["Minutes"])


@router.get("", response_model=list[MinuteResponse])
def list_minutes(
    project_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    query = db.query(Minute).filter(Minute.deleted_at.is_(None), Minute.organization_id == tenant.id)
    if project_id:
        query = query.filter(Minute.project_id == project_id)
    return query.order_by(Minute.created_at.desc()).all()


@router.get("/{minute_id}", response_model=MinuteResponse)
def get_minute(minute_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_or_404(db, Minute, minute_id, detail="Minuta no encontrada")


@router.post("", response_model=MinuteResponse, status_code=201)
def create_minute(
    project_id: int,
    data: MinuteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    verify_project_tenant(db, project_id, tenant)

    folio = generate_folio(db, "MIN")
    minute = Minute(
        folio=folio,
        title=data.title,
        meeting_date=data.meeting_date or date.today(),
        participants=data.participants,
        topics=data.topics,
        agreements=data.agreements,
        source="manual",
        project_id=project_id,
        organization_id=tenant.id,
        recorded_by_id=current_user.id,
        created_by_id=current_user.id,
    )
    db.add(minute)
    db.commit()
    db.refresh(minute)
    return minute


@router.patch("/{minute_id}", response_model=MinuteResponse)
def update_minute(
    minute_id: int,
    data: MinuteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    minute = get_or_404(db, Minute, minute_id, detail="Minuta no encontrada")
    apply_update(db, minute, data)
    return minute


@router.delete("/{minute_id}", status_code=204)
def delete_minute(
    minute_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    soft_delete(db, get_or_404(db, Minute, minute_id, detail="Minuta no encontrada"))


@router.post("/generate", response_model=GenerateMinutesResponse)
async def generate_minute_from_transcript(
    data: GenerateMinutesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    # Validate project exists and belongs to tenant
    project = verify_project_tenant(db, data.project_id, tenant)

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
        organization_id=tenant.id,
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


