from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy import func

from app.database import Base


class ApprovalLog(Base):
    """Polymorphic approval log for requests and change requests."""
    __tablename__ = "approval_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    approvable_type = Column(String(100), nullable=False)   # project_request, change_request
    approvable_id = Column(Integer, nullable=False)
    approved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(50), nullable=False)              # approved, rejected, cancelled, reopened
    comments = Column(Text, nullable=True)
    approved_at = Column(DateTime, server_default=func.now(), nullable=False)
