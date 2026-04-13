from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.project import Project
from app.models.project_request import ProjectRequest
from app.models.modules import Risk, Issue, Change
from app.models.resource import Resource
from app.schemas.project import DashboardKPIs
from app.auth.security import get_current_user
from app.dependencies import get_current_tenant
from collections import Counter

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/kpis", response_model=DashboardKPIs)
def get_kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    pq = db.query(Project).filter(
        Project.deleted_at.is_(None),
        Project.organization_id == tenant.id,
    )
    all_projects = pq.all()

    active_projects = [p for p in all_projects if p.phase != "Cerrado"]
    active_count = len(active_projects)
    total_budget = sum(p.budget or 0 for p in active_projects)
    total_real_budget = sum(p.real_budget or 0 for p in active_projects)
    avg_progress = round(sum(p.progress or 0 for p in active_projects) / max(active_count, 1))

    project_ids = [p.id for p in all_projects]

    requests_in_review = db.query(func.count(ProjectRequest.id)).filter(
        ProjectRequest.status == "in_review",
        ProjectRequest.organization_id == tenant.id,
        ProjectRequest.deleted_at.is_(None),
    ).scalar() or 0

    open_risks = db.query(func.count(Risk.id)).filter(
        Risk.status == "open", Risk.organization_id == tenant.id, Risk.deleted_at.is_(None),
    ).scalar() or 0

    severe_risks = db.query(func.count(Risk.id)).filter(
        Risk.status == "open", Risk.severity >= 13,
        Risk.organization_id == tenant.id, Risk.deleted_at.is_(None),
    ).scalar() or 0

    changes_in_review = db.query(func.count(Change.id)).filter(
        Change.status == "in_review",
        Change.organization_id == tenant.id, Change.deleted_at.is_(None),
    ).scalar() or 0

    open_aids = db.query(func.count(Issue.id)).filter(
        Issue.status.in_(["open", "in_progress"]),
        Issue.organization_id == tenant.id, Issue.deleted_at.is_(None),
    ).scalar() or 0

    # Enhanced metrics
    projects_by_phase = dict(Counter(p.phase for p in all_projects))
    projects_by_health = dict(Counter(p.health for p in active_projects))
    projects_by_type = dict(Counter(p.type or "Sin tipo" for p in all_projects))

    total_resources = db.query(func.count(Resource.id)).filter(
        Resource.is_active == True,  # noqa: E712
        Resource.organization_id == tenant.id,
        Resource.deleted_at.is_(None),
    ).scalar() or 0

    top_projects = sorted(active_projects, key=lambda p: p.progress or 0, reverse=True)[:10]
    top_projects_data = [{"name": p.name, "progress": p.progress or 0, "folio": p.folio} for p in top_projects]

    return DashboardKPIs(
        active_projects=active_count,
        requests_in_review=requests_in_review,
        open_risks=open_risks,
        changes_in_review=changes_in_review,
        total_budget=total_budget,
        avg_progress=avg_progress,
        severe_risks=severe_risks,
        open_aids=open_aids,
        total_real_budget=total_real_budget,
        budget_variance=total_budget - total_real_budget,
        projects_by_phase=projects_by_phase,
        projects_by_health=projects_by_health,
        total_resources=total_resources,
        projects_by_type=projects_by_type,
        top_projects_by_progress=top_projects_data,
    )
