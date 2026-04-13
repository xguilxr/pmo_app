from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.project_status import ProjectStatus
from app.auth.security import get_current_user
from app.dependencies import get_current_tenant
from app.utils.tenant_query import verify_project_tenant

router = APIRouter(prefix="/project-statuses", tags=["Project Statuses"])


class StatusCreate(BaseModel):
    project_id: int
    status_date: date
    health: str
    progress_plan: float = 0
    progress_actual: float = 0
    summary: Optional[str] = None
    risks_summary: Optional[str] = None
    blockers: Optional[str] = None
    next_steps: Optional[str] = None


class StatusUpdate(BaseModel):
    health: Optional[str] = None
    progress_plan: Optional[float] = None
    progress_actual: Optional[float] = None
    summary: Optional[str] = None
    risks_summary: Optional[str] = None
    blockers: Optional[str] = None
    next_steps: Optional[str] = None


class StatusResponse(BaseModel):
    id: int
    project_id: int
    status_date: date
    health: str
    progress_plan: float
    progress_actual: float
    summary: Optional[str]
    risks_summary: Optional[str]
    blockers: Optional[str]
    next_steps: Optional[str]
    created_by_id: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[StatusResponse])
def list_statuses(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    verify_project_tenant(db, project_id, tenant)
    return (
        db.query(ProjectStatus)
        .filter(ProjectStatus.project_id == project_id, ProjectStatus.organization_id == tenant.id, ProjectStatus.deleted_at.is_(None))
        .order_by(ProjectStatus.status_date.desc())
        .all()
    )


@router.get("/{status_id}", response_model=StatusResponse)
def get_status(status_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(ProjectStatus).filter(ProjectStatus.id == status_id, ProjectStatus.deleted_at.is_(None)).first()
    if not s:
        raise HTTPException(status_code=404, detail="Estatus no encontrado")
    return s


@router.post("", response_model=StatusResponse, status_code=status.HTTP_201_CREATED)
def create_status(data: StatusCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), tenant: Organization = Depends(get_current_tenant)):
    verify_project_tenant(db, data.project_id, tenant)
    s = ProjectStatus(created_by_id=current_user.id, organization_id=tenant.id, **data.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.patch("/{status_id}", response_model=StatusResponse)
def update_status(status_id: int, data: StatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(ProjectStatus).filter(ProjectStatus.id == status_id, ProjectStatus.deleted_at.is_(None)).first()
    if not s:
        raise HTTPException(status_code=404, detail="Estatus no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{status_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_status(status_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(ProjectStatus).filter(ProjectStatus.id == status_id, ProjectStatus.deleted_at.is_(None)).first()
    if not s:
        raise HTTPException(status_code=404, detail="Estatus no encontrado")
    from datetime import datetime, timezone
    s.deleted_at = datetime.now(timezone.utc)
    db.commit()
