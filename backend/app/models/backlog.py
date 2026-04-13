from sqlalchemy import Column, String, Integer, Date, Float, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin
from app.models.mixins import TenantScopedMixin


class BacklogItem(TenantScopedMixin, TimestampMixin, Base):
    __tablename__ = "backlog_items"

    folio = Column(String(50), unique=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    area = Column(String(100), nullable=True)
    priority = Column(String(20), default="Media")          # Alta, Media, Baja
    status = Column(String(50), default="not_started")      # not_started, in_progress, completed, blocked
    progress = Column(Float, default=0)                     # 0-100
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    was_delayed = Column(Boolean, default=False)            # historical delay flag — persists even after date changes
    original_end_date = Column(Date, nullable=True)         # original due date for delay tracking

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    responsible_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    project = relationship("Project", back_populates="backlog_items")
