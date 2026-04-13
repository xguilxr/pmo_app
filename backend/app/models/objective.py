from sqlalchemy import Column, String, Integer, Text, ForeignKey, Float
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin
from app.models.mixins import TenantScopedMixin


class ProjectObjective(TenantScopedMixin, TimestampMixin, Base):
    __tablename__ = "project_objectives"

    description = Column(Text, nullable=False)
    type = Column(String(50), nullable=False)  # general, specific, kpi
    target_value = Column(String(255), nullable=True)
    current_value = Column(String(255), nullable=True)
    progress = Column(Float, default=0)  # 0-100
    status = Column(String(50), default="pending")  # pending, in_progress, achieved, not_achieved

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    project = relationship("Project", back_populates="objectives")
