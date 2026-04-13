from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.approval_log import ApprovalLog
from app.auth.security import get_current_user
from app.dependencies import get_current_tenant

router = APIRouter(prefix="/approval-logs", tags=["Approval Logs"])


class ApprovalLogResponse(BaseModel):
    id: int
    approvable_type: str
    approvable_id: int
    approved_by_user_id: int
    status: str
    comments: Optional[str]
    approved_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[ApprovalLogResponse])
def list_approval_logs(
    approvable_type: str | None = None,
    approvable_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    q = db.query(ApprovalLog).filter(ApprovalLog.organization_id == tenant.id)
    if approvable_type:
        q = q.filter(ApprovalLog.approvable_type == approvable_type)
    if approvable_id:
        q = q.filter(ApprovalLog.approvable_id == approvable_id)
    return q.order_by(ApprovalLog.approved_at.desc()).all()
