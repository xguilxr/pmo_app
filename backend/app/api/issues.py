from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.modules import Issue
from app.schemas.issue import IssueCreate, IssueUpdate, IssueResponse
from app.auth.security import get_current_user
from app.dependencies import get_current_tenant
from app.utils.tenant_query import verify_project_tenant
from app.services.folio import generate_folio
from app.services import notifications as notif_svc

router = APIRouter(prefix="/issues", tags=["Issues"])


@router.get("", response_model=list[IssueResponse])
def list_issues(
    project_id: int | None = None,
    status_filter: str | None = Query(None, alias="status"),
    type_filter: str | None = Query(None, alias="type"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    query = db.query(Issue).filter(Issue.deleted_at.is_(None), Issue.organization_id == tenant.id)
    if project_id:
        query = query.filter(Issue.project_id == project_id)
    if status_filter:
        query = query.filter(Issue.status == status_filter)
    if type_filter:
        query = query.filter(Issue.type == type_filter)
    return query.order_by(Issue.report_date.desc()).all()


@router.post("", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
def create_issue(
    project_id: int,
    data: IssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    verify_project_tenant(db, project_id, tenant)
    folio = generate_folio(db, "INC")
    issue = Issue(
        folio=folio,
        title=data.title,
        description=data.description,
        type=data.type,
        priority=data.priority,
        report_date=data.report_date,
        commitment_date=data.commitment_date,
        project_id=project_id,
        organization_id=tenant.id,
        responsible_id=data.responsible_id,
        created_by_id=current_user.id,
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)
    notif_svc.on_issue_created(db, issue, project_id, current_user.id)
    db.commit()
    return issue


@router.get("/{issue_id}", response_model=IssueResponse)
def get_issue(issue_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    issue = db.query(Issue).filter(Issue.id == issue_id, Issue.deleted_at.is_(None)).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    return issue


@router.patch("/{issue_id}", response_model=IssueResponse)
def update_issue(issue_id: int, data: IssueUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    issue = db.query(Issue).filter(Issue.id == issue_id, Issue.deleted_at.is_(None)).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(issue, field, value)
    db.commit()
    db.refresh(issue)
    return issue


@router.delete("/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_issue(issue_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    issue = db.query(Issue).filter(Issue.id == issue_id, Issue.deleted_at.is_(None)).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    from datetime import datetime, timezone
    issue.deleted_at = datetime.now(timezone.utc)
    db.commit()
