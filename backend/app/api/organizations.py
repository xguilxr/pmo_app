from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.program import Program
from app.models.project import Project
from app.models.task import Task
from app.models.modules import Risk, Issue, Change, Document, Lesson, Minute
from app.models.backlog import BacklogItem
from app.models.area import ProjectArea
from app.models.objective import ProjectObjective
from app.auth.security import get_current_user

router = APIRouter(prefix="/organizations", tags=["Organizations"])


class OrganizationCreate(BaseModel):
    name: str
    legal_name: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = "México"
    contact_email: Optional[str] = None
    is_active: bool = True


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    legal_name: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    contact_email: Optional[str] = None
    is_active: Optional[bool] = None


class OrganizationResponse(BaseModel):
    id: int
    name: str
    legal_name: Optional[str]
    industry: Optional[str]
    country: Optional[str]
    contact_email: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[OrganizationResponse])
def list_organizations(db: Session = Depends(get_db)):
    return db.query(Organization).filter(Organization.deleted_at.is_(None)).all()


@router.get("/{org_id}", response_model=OrganizationResponse)
def get_organization(org_id: int, db: Session = Depends(get_db)):
    org = db.query(Organization).filter(Organization.id == org_id, Organization.deleted_at.is_(None)).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organización no encontrada")
    return org


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(
    data: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = Organization(
        name=data.name,
        legal_name=data.legal_name,
        industry=data.industry,
        country=data.country,
        contact_email=data.contact_email,
        is_active=data.is_active,
        created_by_id=current_user.id,
    )
    db.add(org)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Ya existe una organización con ese nombre")
    db.refresh(org)
    return org


@router.patch("/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: int,
    data: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = db.query(Organization).filter(Organization.id == org_id, Organization.deleted_at.is_(None)).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organización no encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(org, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Ya existe una organización con ese nombre")
    db.refresh(org)
    return org


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_organization(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = db.query(Organization).filter(Organization.id == org_id, Organization.deleted_at.is_(None)).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organización no encontrada")

    now = datetime.now(timezone.utc)

    # Cascade soft-delete: programs
    db.query(Program).filter(Program.organization_id == org_id, Program.deleted_at.is_(None)).update(
        {"deleted_at": now}, synchronize_session=False
    )

    # Get all project IDs belonging to this org
    project_ids = [
        p.id for p in db.query(Project.id).filter(
            Project.organization_id == org_id, Project.deleted_at.is_(None)
        ).all()
    ]

    if project_ids:
        # Cascade soft-delete: all project children
        for model in (Task, Risk, Issue, Change, Document, Lesson, Minute, BacklogItem, ProjectArea, ProjectObjective):
            db.query(model).filter(
                model.project_id.in_(project_ids), model.deleted_at.is_(None)
            ).update({"deleted_at": now}, synchronize_session=False)

        # Cascade soft-delete: projects
        db.query(Project).filter(Project.id.in_(project_ids)).update(
            {"deleted_at": now}, synchronize_session=False
        )

    org.deleted_at = now
    db.commit()
