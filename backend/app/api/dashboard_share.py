import secrets
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext

from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.project_request import ProjectRequest
from app.models.modules import Risk, Issue, Change
from app.models.dashboard_share import DashboardShareLink
from app.models.organization import Organization
from app.auth.security import get_current_user
from app.dependencies import get_current_tenant
from sqlalchemy import func

router = APIRouter(prefix="/dashboard-share", tags=["Dashboard Share"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class ShareLinkCreate(BaseModel):
    organization_id: int
    label: str
    pin: Optional[str] = None
    expires_at: Optional[datetime] = None


class ShareLinkResponse(BaseModel):
    id: int
    organization_id: int
    label: str
    token: str
    has_pin: bool
    expires_at: Optional[datetime]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PublicDashboardResponse(BaseModel):
    active_projects: int
    requests_in_review: int
    open_risks: int
    severe_risks: int
    changes_in_review: int
    total_budget: float
    avg_progress: float
    open_aids: int
    organization_name: str


class PinVerify(BaseModel):
    pin: str


# ── Admin endpoints (authenticated) ─────────────────────────────────────────

@router.get("/links", response_model=list[ShareLinkResponse])
def list_share_links(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    links = (
        db.query(DashboardShareLink)
        .filter(
            DashboardShareLink.organization_id == tenant.id,
            DashboardShareLink.deleted_at.is_(None),
        )
        .all()
    )
    return [
        ShareLinkResponse(
            id=l.id,
            organization_id=l.organization_id,
            label=l.label,
            token=l.token,
            has_pin=l.pin_hash is not None,
            expires_at=l.expires_at,
            is_active=l.is_active,
            created_at=l.created_at,
        )
        for l in links
    ]


@router.post("/links", response_model=ShareLinkResponse, status_code=status.HTTP_201_CREATED)
def create_share_link(
    data: ShareLinkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    if data.organization_id != tenant.id and not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="No puedes crear enlaces para otra organizacion")
    token = secrets.token_urlsafe(48)
    pin_hash = pwd_context.hash(data.pin) if data.pin else None
    link = DashboardShareLink(
        organization_id=data.organization_id,
        created_by_user_id=current_user.id,
        label=data.label,
        token=token,
        pin_hash=pin_hash,
        expires_at=data.expires_at,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return ShareLinkResponse(
        id=link.id,
        organization_id=link.organization_id,
        label=link.label,
        token=link.token,
        has_pin=link.pin_hash is not None,
        expires_at=link.expires_at,
        is_active=link.is_active,
        created_at=link.created_at,
    )


@router.delete("/links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_share_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    link = (
        db.query(DashboardShareLink)
        .filter(
            DashboardShareLink.id == link_id,
            DashboardShareLink.organization_id == tenant.id,
        )
        .first()
    )
    if not link:
        raise HTTPException(status_code=404, detail="Enlace no encontrado")
    link.deleted_at = datetime.now(timezone.utc)
    db.commit()


# ── Public endpoint (no auth) ────────────────────────────────────────────────

@router.get("/public/{token}", response_model=PublicDashboardResponse)
def public_dashboard(token: str, pin: str | None = None, db: Session = Depends(get_db)):
    link = db.query(DashboardShareLink).filter(
        DashboardShareLink.token == token,
        DashboardShareLink.is_active == True,
        DashboardShareLink.deleted_at.is_(None),
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Enlace no encontrado o expirado")

    # Check expiration
    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Enlace expirado")

    # Check PIN
    if link.pin_hash:
        if not pin:
            raise HTTPException(status_code=403, detail="PIN requerido")
        if not pwd_context.verify(pin, link.pin_hash):
            raise HTTPException(status_code=403, detail="PIN incorrecto")

    # Update last accessed
    link.last_accessed_at = datetime.now(timezone.utc)
    db.commit()

    # Build dashboard data for the organization
    org_id = link.organization_id
    from app.models.organization import Organization
    org = db.query(Organization).filter(Organization.id == org_id).first()

    active_projects = db.query(Project).filter(
        Project.organization_id == org_id, Project.phase != "Cerrado", Project.deleted_at.is_(None)
    ).all()

    active_count = len(active_projects)
    total_budget = sum(p.budget or 0 for p in active_projects)
    avg_progress = round(sum(p.progress or 0 for p in active_projects) / max(active_count, 1))

    project_ids = [p.id for p in active_projects]

    open_risks = db.query(func.count(Risk.id)).filter(
        Risk.project_id.in_(project_ids), Risk.status == "open", Risk.deleted_at.is_(None)
    ).scalar() or 0 if project_ids else 0

    severe_risks = db.query(func.count(Risk.id)).filter(
        Risk.project_id.in_(project_ids), Risk.status == "open", Risk.severity >= 13, Risk.deleted_at.is_(None)
    ).scalar() or 0 if project_ids else 0

    changes_in_review = db.query(func.count(Change.id)).filter(
        Change.project_id.in_(project_ids), Change.status == "in_review", Change.deleted_at.is_(None)
    ).scalar() or 0 if project_ids else 0

    requests_in_review = db.query(func.count(ProjectRequest.id)).filter(
        ProjectRequest.organization_id == org_id, ProjectRequest.status == "in_review", ProjectRequest.deleted_at.is_(None)
    ).scalar() or 0

    open_aids = db.query(func.count(Issue.id)).filter(
        Issue.project_id.in_(project_ids), Issue.status.in_(["open", "in_progress"]), Issue.deleted_at.is_(None)
    ).scalar() or 0 if project_ids else 0

    return PublicDashboardResponse(
        active_projects=active_count,
        requests_in_review=requests_in_review,
        open_risks=open_risks,
        severe_risks=severe_risks,
        changes_in_review=changes_in_review,
        total_budget=total_budget,
        avg_progress=avg_progress,
        open_aids=open_aids,
        organization_name=org.name if org else "N/A",
    )
