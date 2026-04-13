from sqlalchemy import Column, String, Integer, Date, Text, ForeignKey

from app.database import Base
from app.models.base import TimestampMixin
from app.models.mixins import TenantScopedMixin


class ProjectClosure(TenantScopedMixin, TimestampMixin, Base):
    """Formal project closure record (1:1 with project)."""
    __tablename__ = "project_closures"

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, unique=True)
    closure_date = Column(Date, nullable=False)
    summary = Column(Text, nullable=False)
    outcomes = Column(Text, nullable=True)
    pending_actions = Column(Text, nullable=True)
    approved_by = Column(String(255), nullable=True)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(50), default="draft")          # draft, approved, rejected
    comments = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
