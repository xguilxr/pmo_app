from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.modules import Change
from app.schemas.change import ChangeCreate, ChangeUpdate, ChangeResponse
from app.auth.security import get_current_user
from app.services.folio import generate_folio
from app.services import notifications as notif_svc

router = APIRouter(prefix="/changes", tags=["Changes"])


@router.get("", response_model=list[ChangeResponse])
def list_changes(
    project_id: int | None = None,
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Change).filter(Change.deleted_at.is_(None))
    if project_id:
        query = query.filter(Change.project_id == project_id)
    if status_filter:
        query = query.filter(Change.status == status_filter)
    return query.order_by(Change.request_date.desc()).all()


@router.post("", response_model=ChangeResponse, status_code=status.HTTP_201_CREATED)
def create_change(
    project_id: int,
    data: ChangeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folio = generate_folio(db, "CHG")
    change = Change(
        folio=folio,
        title=data.title,
        description=data.description,
        change_type=data.change_type,
        impact=data.impact,
        requested_by=data.requested_by,
        request_date=data.request_date,
        project_id=project_id,
        created_by_id=current_user.id,
    )
    db.add(change)
    db.commit()
    db.refresh(change)
    return change


@router.patch("/{change_id}", response_model=ChangeResponse)
def update_change(change_id: int, data: ChangeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    change = db.query(Change).filter(Change.id == change_id, Change.deleted_at.is_(None)).first()
    if not change:
        raise HTTPException(status_code=404, detail="Cambio no encontrado")
    old_status = change.status
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(change, field, value)
    db.commit()
    db.refresh(change)
    if "status" in update_data and change.status != old_status and change.status in ("approved", "rejected", "implemented"):
        notif_svc.on_change_status_changed(db, change, old_status, change.project_id, current_user.id)
        db.commit()
    return change


@router.delete("/{change_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_change(change_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    change = db.query(Change).filter(Change.id == change_id, Change.deleted_at.is_(None)).first()
    if not change:
        raise HTTPException(status_code=404, detail="Cambio no encontrado")
    from datetime import datetime, timezone
    change.deleted_at = datetime.now(timezone.utc)
    db.commit()
