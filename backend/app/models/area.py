from sqlalchemy import Column, String, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin


class ProjectArea(TimestampMixin, Base):
    __tablename__ = "project_areas"

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    role_in_project = Column(String(100), nullable=True)  # Sponsor, Líder Técnico, Analista, etc.

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    responsible_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    project = relationship("Project", back_populates="areas")
    responsible = relationship("User", foreign_keys=[responsible_id])
