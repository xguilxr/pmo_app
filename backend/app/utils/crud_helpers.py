"""Shared CRUD helper functions for API endpoints.

Consolidates repeated patterns across all API route files:
- get-or-404 lookup
- soft-delete
- partial update (model_dump + setattr loop)
"""

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session


def get_or_404(db: Session, model, record_id: int, *, detail: str = "Registro no encontrado"):
    """Load a record by ID, excluding soft-deleted records. Raise 404 if not found.

    Usage::

        risk = get_or_404(db, Risk, risk_id, detail="Riesgo no encontrado")
    """
    obj = db.query(model).filter(model.id == record_id, model.deleted_at.is_(None)).first()
    if not obj:
        raise HTTPException(status_code=404, detail=detail)
    return obj


def apply_update(db: Session, obj, data) -> None:
    """Apply a Pydantic partial-update schema to a SQLAlchemy model instance.

    Iterates over ``data.model_dump(exclude_unset=True)`` and sets each
    attribute on *obj*, then commits and refreshes.

    Usage::

        apply_update(db, risk, data)
        return risk
    """
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)


def soft_delete(db: Session, obj) -> None:
    """Mark a record as soft-deleted by setting ``deleted_at`` to now(UTC), then commit.

    Usage::

        soft_delete(db, risk)
    """
    obj.deleted_at = datetime.now(timezone.utc)
    db.commit()
