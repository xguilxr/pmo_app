from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.audit import AuditLog
from app.auth.security import get_current_user

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    user_id: Optional[int]
    action: str
    module: str
    record_id: Optional[int]
    details: Optional[str]
    ip_address: Optional[str]

    model_config = {"from_attributes": True}


@router.get("", response_model=list[AuditLogResponse])
def list_audit_logs(
    user_id: int | None = None,
    module: str | None = None,
    action: str | None = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(AuditLog)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    if module:
        q = q.filter(AuditLog.module == module)
    if action:
        q = q.filter(AuditLog.action == action)
    return q.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
