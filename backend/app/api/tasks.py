from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.task import Task
from app.auth.security import get_current_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])


class TaskCreate(BaseModel):
    name: str
    description: Optional[str] = None
    wbs: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_days: Optional[int] = None
    progress: float = 0
    status: str = "pending"
    priority: Optional[str] = None
    is_milestone: bool = False
    outline_level: int = 1
    notes: Optional[str] = None
    parent_task_id: Optional[int] = None
    responsible_id: Optional[int] = None


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    wbs: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_days: Optional[int] = None
    progress: Optional[float] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    is_milestone: Optional[bool] = None
    outline_level: Optional[int] = None
    notes: Optional[str] = None
    parent_task_id: Optional[int] = None
    responsible_id: Optional[int] = None


class TaskResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    wbs: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    duration_days: Optional[int]
    progress: float
    status: str
    priority: Optional[str]
    is_milestone: bool
    outline_level: int
    notes: Optional[str]
    source: str
    was_delayed: bool
    original_end_date: Optional[date]
    parent_task_id: Optional[int]
    project_id: int
    responsible_id: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskImportItem(BaseModel):
    name: str
    wbs: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_days: Optional[int] = None
    progress: float = 0
    outline_level: int = 1
    is_milestone: bool = False
    responsible_id: Optional[int] = None


class TaskImportPayload(BaseModel):
    items: list[TaskImportItem]


@router.get("", response_model=list[TaskResponse])
def list_tasks(
    project_id: int,
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Task).filter(Task.deleted_at.is_(None), Task.project_id == project_id)
    if status_filter:
        query = query.filter(Task.status == status_filter)
    return query.order_by(Task.wbs, Task.id).all()


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    project_id: int,
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = Task(
        name=data.name,
        description=data.description,
        wbs=data.wbs,
        start_date=data.start_date,
        end_date=data.end_date,
        duration_days=data.duration_days,
        progress=data.progress,
        status=data.status,
        priority=data.priority,
        is_milestone=data.is_milestone,
        outline_level=data.outline_level,
        notes=data.notes,
        parent_task_id=data.parent_task_id,
        responsible_id=data.responsible_id,
        project_id=project_id,
        source="manual",
        created_by_id=current_user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id, Task.deleted_at.is_(None)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.deleted_at.is_(None)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id, Task.deleted_at.is_(None)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    task.deleted_at = datetime.now(timezone.utc)
    db.commit()


@router.post("/import", response_model=list[TaskResponse], status_code=status.HTTP_201_CREATED)
def import_tasks(
    project_id: int,
    payload: TaskImportPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bulk create/update tasks from an imported file (e.g. MS Project)."""
    created = []
    for item in payload.items:
        task = Task(
            name=item.name,
            wbs=item.wbs,
            start_date=item.start_date,
            end_date=item.end_date,
            duration_days=item.duration_days,
            progress=item.progress,
            outline_level=item.outline_level,
            is_milestone=item.is_milestone,
            responsible_id=item.responsible_id,
            project_id=project_id,
            source="ms_project_import",
            created_by_id=current_user.id,
        )
        db.add(task)
        created.append(task)
    db.commit()
    for t in created:
        db.refresh(t)
    return created
