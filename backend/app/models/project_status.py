from sqlalchemy import Column, String, Integer, Date, Float, Text, ForeignKey

from app.database import Base
from app.models.base import TimestampMixin
from app.models.mixins import TenantScopedMixin


class ProjectStatus(TenantScopedMixin, TimestampMixin, Base):
    """Periodic project status snapshot (health, progress, blockers)."""
    __tablename__ = "project_statuses"

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    status_date = Column(Date, nullable=False)
    health = Column(String(20), nullable=False)           # green, yellow, red
    progress_plan = Column(Float, default=0)
    progress_actual = Column(Float, default=0)
    summary = Column(Text, nullable=True)
    risks_summary = Column(Text, nullable=True)
    blockers = Column(Text, nullable=True)
    next_steps = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
