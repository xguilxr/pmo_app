from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.project_request import ProjectRequest
from app.models.modules import Risk, Issue, Change
from app.schemas.project import DashboardKPIs
from app.auth.security import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/kpis", response_model=DashboardKPIs)
def get_kpis(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    active_projects = db.query(Project).filter(
        Project.phase != "Cerrado", Project.deleted_at.is_(None)
    ).all()

    active_count = len(active_projects)
    total_budget = sum(p.budget or 0 for p in active_projects)
    avg_progress = round(sum(p.progress or 0 for p in active_projects) / max(active_count, 1))

    requests_in_review = db.query(func.count(ProjectRequest.id)).filter(
        ProjectRequest.status == "in_review", ProjectRequest.deleted_at.is_(None)
    ).scalar() or 0

    open_risks = db.query(func.count(Risk.id)).filter(
        Risk.status == "open", Risk.deleted_at.is_(None)
    ).scalar() or 0

    severe_risks = db.query(func.count(Risk.id)).filter(
        Risk.status == "open", Risk.severity >= 13, Risk.deleted_at.is_(None)
    ).scalar() or 0

    changes_in_review = db.query(func.count(Change.id)).filter(
        Change.status == "in_review", Change.deleted_at.is_(None)
    ).scalar() or 0

    open_aids = db.query(func.count(Issue.id)).filter(
        Issue.status.in_(["open", "in_progress"]), Issue.deleted_at.is_(None)
    ).scalar() or 0

    return DashboardKPIs(
        active_projects=active_count,
        requests_in_review=requests_in_review,
        open_risks=open_risks,
        changes_in_review=changes_in_review,
        total_budget=total_budget,
        avg_progress=avg_progress,
        severe_risks=severe_risks,
        open_aids=open_aids,
    )
