from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.modules import Issue
from app.schemas.issue import IssueCreate, IssueUpdate, IssueResponse
from app.auth.security import get_current_user
from app.services.folio import generate_folio

router = APIRouter(prefix="/issues", tags=["Issues"])


@router.get("", response_model=list[IssueResponse])
def list_issues(
    project_id: int | None = None,
    status_filter: str | None = Query(None, alias="status"),
    type_filter: str | None = Query(None, alias="type"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Issue).filter(Issue.deleted_at.is_(None))
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
):
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
        responsible_id=data.responsible_id,
        created_by_id=current_user.id,
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)
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
