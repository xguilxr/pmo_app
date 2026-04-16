from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.modules import Risk
from app.schemas.risk import RiskCreate, RiskUpdate, RiskResponse
from app.auth.security import get_current_user
from app.dependencies import get_current_tenant
from app.utils.tenant_query import verify_project_tenant
from app.utils.crud_helpers import get_or_404, apply_update, soft_delete
from app.services.folio import generate_folio
from app.services import notifications as notif_svc

router = APIRouter(prefix="/risks", tags=["Risks"])


@router.get("", response_model=list[RiskResponse])
def list_risks(
    project_id: int | None = None,
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    query = db.query(Risk).filter(Risk.deleted_at.is_(None), Risk.organization_id == tenant.id)
    if project_id:
        query = query.filter(Risk.project_id == project_id)
    if status_filter:
        query = query.filter(Risk.status == status_filter)
    return query.order_by(Risk.severity.desc()).all()


@router.post("", response_model=RiskResponse, status_code=status.HTTP_201_CREATED)
def create_risk(
    project_id: int,
    data: RiskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    verify_project_tenant(db, project_id, tenant)
    folio = generate_folio(db, "RSK")
    risk = Risk(
        folio=folio,
        title=data.title,
        description=data.description,
        category=data.category,
        probability=data.probability,
        impact=data.impact,
        severity=data.probability * data.impact,
        mitigation_strategy=data.mitigation_strategy,
        identification_date=data.identification_date,
        deadline=data.deadline,
        project_id=project_id,
        organization_id=tenant.id,
        responsible_id=data.responsible_id,
        created_by_id=current_user.id,
    )
    db.add(risk)
    db.commit()
    db.refresh(risk)
    notif_svc.on_risk_created(db, risk, project_id, current_user.id)
    db.commit()
    return risk


@router.get("/{risk_id}", response_model=RiskResponse)
def get_risk(risk_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_or_404(db, Risk, risk_id, detail="Riesgo no encontrado")


@router.patch("/{risk_id}", response_model=RiskResponse)
def update_risk(risk_id: int, data: RiskUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    risk = get_or_404(db, Risk, risk_id, detail="Riesgo no encontrado")
    apply_update(db, risk, data)
    # Recalculate severity if probability or impact changed
    if risk.probability is not None and risk.impact is not None:
        risk.severity = risk.probability * risk.impact
        db.commit()
        db.refresh(risk)
    return risk


@router.delete("/{risk_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_risk(risk_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    soft_delete(db, get_or_404(db, Risk, risk_id, detail="Riesgo no encontrado"))
