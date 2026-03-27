from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.backlog import BacklogItem
from app.auth.security import get_current_user
from app.services.folio import generate_folio

router = APIRouter(prefix="/backlog", tags=["Backlog"])


class BacklogCreate(BaseModel):
    title: str
    description: Optional[str] = None
    area: Optional[str] = None
    priority: str = "Media"
    status: str = "not_started"
    progress: float = 0
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    responsible_id: Optional[int] = None


class BacklogUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    area: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    responsible_id: Optional[int] = None


class BacklogResponse(BaseModel):
    id: int
    folio: str
    title: str
    description: Optional[str]
    area: Optional[str]
    priority: str
    status: str
    progress: float
    start_date: Optional[date]
    end_date: Optional[date]
    was_delayed: bool
    original_end_date: Optional[date]
    project_id: int
    responsible_id: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[BacklogResponse])
def list_backlog(
    project_id: int,
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(BacklogItem).filter(BacklogItem.deleted_at.is_(None), BacklogItem.project_id == project_id)
    if status_filter:
        query = query.filter(BacklogItem.status == status_filter)
    return query.order_by(BacklogItem.id).all()


@router.post("", response_model=BacklogResponse, status_code=status.HTTP_201_CREATED)
def create_backlog_item(
    project_id: int,
    data: BacklogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # BacklogItem doesn't have a folio prefix in folio service yet; use a simple pattern
    from sqlalchemy import func
    year = date.today().year
    pattern = f"BLG-{year}-%"
    max_folio = db.query(func.max(BacklogItem.folio)).filter(BacklogItem.folio.like(pattern)).scalar()
    if max_folio:
        last_number = int(max_folio.split("-")[-1])
        folio = f"BLG-{year}-{last_number + 1:03d}"
    else:
        folio = f"BLG-{year}-001"

    item = BacklogItem(
        folio=folio,
        title=data.title,
        description=data.description,
        area=data.area,
        priority=data.priority,
        status=data.status,
        progress=data.progress,
        start_date=data.start_date,
        end_date=data.end_date,
        project_id=project_id,
        responsible_id=data.responsible_id,
        created_by_id=current_user.id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{item_id}", response_model=BacklogResponse)
def get_backlog_item(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(BacklogItem).filter(BacklogItem.id == item_id, BacklogItem.deleted_at.is_(None)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Elemento de backlog no encontrado")
    return item


@router.patch("/{item_id}", response_model=BacklogResponse)
def update_backlog_item(
    item_id: int,
    data: BacklogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(BacklogItem).filter(BacklogItem.id == item_id, BacklogItem.deleted_at.is_(None)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Elemento de backlog no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_backlog_item(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(BacklogItem).filter(BacklogItem.id == item_id, BacklogItem.deleted_at.is_(None)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Elemento de backlog no encontrado")
    item.deleted_at = datetime.utcnow()
    db.commit()
