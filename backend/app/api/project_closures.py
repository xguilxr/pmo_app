from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.project_closure import ProjectClosure
from app.auth.security import get_current_user

router = APIRouter(prefix="/project-closures", tags=["Project Closures"])


class ClosureCreate(BaseModel):
    project_id: int
    closure_date: date
    summary: str
    outcomes: Optional[str] = None
    pending_actions: Optional[str] = None
    approved_by: Optional[str] = None
    comments: Optional[str] = None


class ClosureUpdate(BaseModel):
    closure_date: Optional[date] = None
    summary: Optional[str] = None
    outcomes: Optional[str] = None
    pending_actions: Optional[str] = None
    approved_by: Optional[str] = None
    status: Optional[str] = None
    comments: Optional[str] = None


class ClosureResponse(BaseModel):
    id: int
    project_id: int
    closure_date: date
    summary: str
    outcomes: Optional[str]
    pending_actions: Optional[str]
    approved_by: Optional[str]
    approved_by_id: Optional[int]
    status: str
    comments: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/{project_id}", response_model=ClosureResponse)
def get_closure(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(ProjectClosure).filter(
        ProjectClosure.project_id == project_id, ProjectClosure.deleted_at.is_(None)
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cierre no encontrado para este proyecto")
    return c


@router.post("", response_model=ClosureResponse, status_code=status.HTTP_201_CREATED)
def create_closure(data: ClosureCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(ProjectClosure).filter(
        ProjectClosure.project_id == data.project_id, ProjectClosure.deleted_at.is_(None)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Este proyecto ya tiene un registro de cierre")
    c = ProjectClosure(created_by_id=current_user.id, **data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.patch("/{closure_id}", response_model=ClosureResponse)
def update_closure(closure_id: int, data: ClosureUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(ProjectClosure).filter(ProjectClosure.id == closure_id, ProjectClosure.deleted_at.is_(None)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cierre no encontrado")
    if data.status == "approved":
        c.approved_by_id = current_user.id
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(c, field, value)
    db.commit()
    db.refresh(c)
    return c
