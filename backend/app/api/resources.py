from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.resource import Resource, ResourceWorkLog, ResourceAvailability, project_resources
from app.auth.security import get_current_user
from app.dependencies import get_current_tenant
from app.services.folio import generate_folio

router = APIRouter(prefix="/resources", tags=["Resources"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class ResourceCreate(BaseModel):
    name: str
    email: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    mobile_phone: Optional[str] = None
    company_name: Optional[str] = None
    resource_type: str = "human"
    is_internal: bool = True
    hourly_rate: float = 0
    cost_period: str = "hour"
    user_id: Optional[int] = None
    organization_id: Optional[int] = None


class ResourceUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    mobile_phone: Optional[str] = None
    company_name: Optional[str] = None
    resource_type: Optional[str] = None
    is_internal: Optional[bool] = None
    is_active: Optional[bool] = None
    hourly_rate: Optional[float] = None
    cost_period: Optional[str] = None
    user_id: Optional[int] = None
    organization_id: Optional[int] = None


class ResourceResponse(BaseModel):
    id: int
    folio: str
    name: str
    email: Optional[str]
    position: Optional[str]
    department: Optional[str]
    location: Optional[str]
    phone: Optional[str]
    mobile_phone: Optional[str]
    company_name: Optional[str]
    resource_type: str
    is_internal: bool
    is_active: bool
    hourly_rate: float
    cost_period: str
    hours_worked: float
    user_id: Optional[int]
    organization_id: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class AssignResourcePayload(BaseModel):
    resource_id: int
    allocation: float = 100
    role: Optional[str] = None


# ── Work Log Schemas ─────────────────────────────────────────────────────────

class WorkLogCreate(BaseModel):
    resource_id: int
    project_id: Optional[int] = None
    task_id: Optional[int] = None
    work_date: date
    hours: float
    notes: Optional[str] = None


class WorkLogResponse(BaseModel):
    id: int
    resource_id: int
    project_id: Optional[int]
    task_id: Optional[int]
    work_date: date
    hours: float
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Availability Schemas ─────────────────────────────────────────────────────

class AvailabilityCreate(BaseModel):
    resource_id: int
    available_date: date
    available_hours: float
    notes: Optional[str] = None


class AvailabilityResponse(BaseModel):
    id: int
    resource_id: int
    available_date: date
    available_hours: float
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Resource CRUD ────────────────────────────────────────────────────────────

@router.get("", response_model=list[ResourceResponse])
def list_resources(
    search: str | None = None,
    resource_type: str | None = None,
    is_internal: bool | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    q = db.query(Resource).filter(Resource.deleted_at.is_(None), Resource.organization_id == tenant.id)
    if search:
        q = q.filter(Resource.name.ilike(f"%{search}%"))
    if resource_type:
        q = q.filter(Resource.resource_type == resource_type)
    if is_internal is not None:
        q = q.filter(Resource.is_internal == is_internal)
    if is_active is not None:
        q = q.filter(Resource.is_active == is_active)
    return q.order_by(Resource.name).all()


@router.get("/{resource_id}", response_model=ResourceResponse)
def get_resource(resource_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(Resource).filter(Resource.id == resource_id, Resource.deleted_at.is_(None)).first()
    if not r:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    return r


@router.post("", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
def create_resource(data: ResourceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), tenant: Organization = Depends(get_current_tenant)):
    folio = generate_folio(db, "REC")
    r = Resource(folio=folio, organization_id=tenant.id, created_by_id=current_user.id, **data.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@router.patch("/{resource_id}", response_model=ResourceResponse)
def update_resource(resource_id: int, data: ResourceUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(Resource).filter(Resource.id == resource_id, Resource.deleted_at.is_(None)).first()
    if not r:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(r, field, value)
    db.commit()
    db.refresh(r)
    return r


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(resource_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(Resource).filter(Resource.id == resource_id, Resource.deleted_at.is_(None)).first()
    if not r:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    from datetime import datetime, timezone
    r.deleted_at = datetime.now(timezone.utc)
    db.commit()


# ── Project-Resource Assignment ──────────────────────────────────────────────

@router.post("/projects/{project_id}/assign", status_code=status.HTTP_201_CREATED)
def assign_resource_to_project(
    project_id: int,
    payload: AssignResourcePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.execute(
        project_resources.insert().values(
            project_id=project_id,
            resource_id=payload.resource_id,
            allocation=payload.allocation,
            role=payload.role,
        )
    )
    db.commit()
    return {"detail": "Recurso asignado al proyecto"}


@router.delete("/projects/{project_id}/unassign/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def unassign_resource(project_id: int, resource_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.execute(
        project_resources.delete().where(
            project_resources.c.project_id == project_id,
            project_resources.c.resource_id == resource_id,
        )
    )
    db.commit()


# ── Work Logs ────────────────────────────────────────────────────────────────

@router.get("/work-logs", response_model=list[WorkLogResponse])
def list_work_logs(
    resource_id: int | None = None,
    project_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(ResourceWorkLog).filter(ResourceWorkLog.deleted_at.is_(None))
    if resource_id:
        q = q.filter(ResourceWorkLog.resource_id == resource_id)
    if project_id:
        q = q.filter(ResourceWorkLog.project_id == project_id)
    if date_from:
        q = q.filter(ResourceWorkLog.work_date >= date_from)
    if date_to:
        q = q.filter(ResourceWorkLog.work_date <= date_to)
    return q.order_by(ResourceWorkLog.work_date.desc()).all()


@router.post("/work-logs", response_model=WorkLogResponse, status_code=status.HTTP_201_CREATED)
def create_work_log(data: WorkLogCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    wl = ResourceWorkLog(created_by_id=current_user.id, **data.model_dump())
    db.add(wl)
    # Update accumulated hours on resource
    resource = db.query(Resource).filter(Resource.id == data.resource_id).first()
    if resource:
        resource.hours_worked = (resource.hours_worked or 0) + data.hours
    db.commit()
    db.refresh(wl)
    return wl


@router.delete("/work-logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_work_log(log_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    wl = db.query(ResourceWorkLog).filter(ResourceWorkLog.id == log_id, ResourceWorkLog.deleted_at.is_(None)).first()
    if not wl:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    from datetime import datetime, timezone
    wl.deleted_at = datetime.now(timezone.utc)
    # Subtract hours from resource
    resource = db.query(Resource).filter(Resource.id == wl.resource_id).first()
    if resource:
        resource.hours_worked = max(0, (resource.hours_worked or 0) - wl.hours)
    db.commit()


# ── Availability ─────────────────────────────────────────────────────────────

@router.get("/availability", response_model=list[AvailabilityResponse])
def list_availability(
    resource_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(ResourceAvailability).filter(ResourceAvailability.deleted_at.is_(None))
    if resource_id:
        q = q.filter(ResourceAvailability.resource_id == resource_id)
    if date_from:
        q = q.filter(ResourceAvailability.available_date >= date_from)
    if date_to:
        q = q.filter(ResourceAvailability.available_date <= date_to)
    return q.order_by(ResourceAvailability.available_date).all()


@router.post("/availability", response_model=AvailabilityResponse, status_code=status.HTTP_201_CREATED)
def create_availability(data: AvailabilityCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    av = ResourceAvailability(**data.model_dump())
    db.add(av)
    db.commit()
    db.refresh(av)
    return av


@router.delete("/availability/{avail_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_availability(avail_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    av = db.query(ResourceAvailability).filter(ResourceAvailability.id == avail_id, ResourceAvailability.deleted_at.is_(None)).first()
    if not av:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    from datetime import datetime, timezone
    av.deleted_at = datetime.now(timezone.utc)
    db.commit()
