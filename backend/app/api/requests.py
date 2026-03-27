from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.project_request import ProjectRequest
from app.auth.security import get_current_user
from app.services.folio import generate_folio

router = APIRouter(prefix="/requests", tags=["Project Requests"])


class RequestCreate(BaseModel):
    title: str
    description: str
    objective: str
    business_unit: str
    department: str
    sub_department: Optional[str] = None
    sponsor_name: str
    sponsor_email: str
    strategic_alignment: str
    benefits: str
    budget: Optional[float] = None
    what_if_not_done: str
    key_stakeholders: str
    expected_deliverables: str
    observations: Optional[str] = None
    organization_id: int


class RequestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    objective: Optional[str] = None
    business_unit: Optional[str] = None
    department: Optional[str] = None
    sub_department: Optional[str] = None
    sponsor_name: Optional[str] = None
    sponsor_email: Optional[str] = None
    strategic_alignment: Optional[str] = None
    benefits: Optional[str] = None
    budget: Optional[float] = None
    what_if_not_done: Optional[str] = None
    key_stakeholders: Optional[str] = None
    expected_deliverables: Optional[str] = None
    observations: Optional[str] = None
    status: Optional[str] = None


class RejectPayload(BaseModel):
    reason: str


class RequestResponse(BaseModel):
    id: int
    folio: str
    status: str
    request_date: date
    requester_name: str
    requester_email: str
    title: str
    description: str
    objective: str
    business_unit: str
    department: str
    sub_department: Optional[str]
    sponsor_name: str
    sponsor_email: str
    strategic_alignment: str
    benefits: str
    budget: Optional[float]
    what_if_not_done: str
    key_stakeholders: str
    expected_deliverables: str
    observations: Optional[str]
    reviewed_by_id: Optional[int]
    review_date: Optional[date]
    rejection_reason: Optional[str]
    organization_id: int
    requester_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[RequestResponse])
def list_requests(
    status_filter: str | None = Query(None, alias="status"),
    organization_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(ProjectRequest).filter(ProjectRequest.deleted_at.is_(None))
    if status_filter:
        query = query.filter(ProjectRequest.status == status_filter)
    if organization_id:
        query = query.filter(ProjectRequest.organization_id == organization_id)
    return query.order_by(ProjectRequest.request_date.desc()).all()


@router.get("/{request_id}", response_model=RequestResponse)
def get_request(request_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    req = db.query(ProjectRequest).filter(ProjectRequest.id == request_id, ProjectRequest.deleted_at.is_(None)).first()
    if not req:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return req


@router.post("", response_model=RequestResponse, status_code=status.HTTP_201_CREATED)
def create_request(
    data: RequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folio = generate_folio(db, "REQ")
    req = ProjectRequest(
        folio=folio,
        status="in_review",
        request_date=date.today(),
        requester_name=current_user.full_name,
        requester_email=current_user.email,
        title=data.title,
        description=data.description,
        objective=data.objective,
        business_unit=data.business_unit,
        department=data.department,
        sub_department=data.sub_department,
        sponsor_name=data.sponsor_name,
        sponsor_email=data.sponsor_email,
        strategic_alignment=data.strategic_alignment,
        benefits=data.benefits,
        budget=data.budget,
        what_if_not_done=data.what_if_not_done,
        key_stakeholders=data.key_stakeholders,
        expected_deliverables=data.expected_deliverables,
        observations=data.observations,
        organization_id=data.organization_id,
        requester_id=current_user.id,
        created_by_id=current_user.id,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.patch("/{request_id}", response_model=RequestResponse)
def update_request(
    request_id: int,
    data: RequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(ProjectRequest).filter(ProjectRequest.id == request_id, ProjectRequest.deleted_at.is_(None)).first()
    if not req:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(req, field, value)
    db.commit()
    db.refresh(req)
    return req


@router.post("/{request_id}/approve", response_model=RequestResponse)
def approve_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(ProjectRequest).filter(ProjectRequest.id == request_id, ProjectRequest.deleted_at.is_(None)).first()
    if not req:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if req.status != "in_review":
        raise HTTPException(status_code=400, detail="Solo se pueden aprobar solicitudes en revisión")
    req.status = "approved"
    req.reviewed_by_id = current_user.id
    req.review_date = date.today()
    db.commit()
    db.refresh(req)
    return req


@router.post("/{request_id}/reject", response_model=RequestResponse)
def reject_request(
    request_id: int,
    payload: RejectPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(ProjectRequest).filter(ProjectRequest.id == request_id, ProjectRequest.deleted_at.is_(None)).first()
    if not req:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if req.status != "in_review":
        raise HTTPException(status_code=400, detail="Solo se pueden rechazar solicitudes en revisión")
    req.status = "rejected"
    req.rejection_reason = payload.reason
    req.reviewed_by_id = current_user.id
    req.review_date = date.today()
    db.commit()
    db.refresh(req)
    return req


@router.post("/{request_id}/cancel", response_model=RequestResponse)
def cancel_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(ProjectRequest).filter(ProjectRequest.id == request_id, ProjectRequest.deleted_at.is_(None)).first()
    if not req:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if req.status not in ("in_review", "info_requested"):
        raise HTTPException(status_code=400, detail="Solo se pueden cancelar solicitudes en revisión o con información solicitada")
    req.status = "cancelled"
    db.commit()
    db.refresh(req)
    return req
