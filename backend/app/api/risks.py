from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.modules import Risk
from app.schemas.risk import RiskCreate, RiskUpdate, RiskResponse
from app.auth.security import get_current_user
from app.services.folio import generate_folio
from app.services import notifications as notif_svc

router = APIRouter(prefix="/risks", tags=["Risks"])


@router.get("", response_model=list[RiskResponse])
def list_risks(
    project_id: int | None = None,
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Risk).filter(Risk.deleted_at.is_(None))
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
):
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
    risk = db.query(Risk).filter(Risk.id == risk_id, Risk.deleted_at.is_(None)).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Riesgo no encontrado")
    return risk


@router.patch("/{risk_id}", response_model=RiskResponse)
def update_risk(risk_id: int, data: RiskUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    risk = db.query(Risk).filter(Risk.id == risk_id, Risk.deleted_at.is_(None)).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Riesgo no encontrado")
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(risk, field, value)
    # Recalculate severity if probability or impact changed
    if risk.probability is not None and risk.impact is not None:
        risk.severity = risk.probability * risk.impact
    db.commit()
    db.refresh(risk)
    return risk


@router.delete("/{risk_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_risk(risk_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    risk = db.query(Risk).filter(Risk.id == risk_id, Risk.deleted_at.is_(None)).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Riesgo no encontrado")
    from datetime import datetime, timezone
    risk.deleted_at = datetime.now(timezone.utc)
    db.commit()
