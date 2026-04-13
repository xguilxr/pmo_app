from sqlalchemy import Column, String, Integer, Date, Text, ForeignKey

from app.database import Base
from app.models.base import TimestampMixin
from app.models.mixins import TenantScopedMixin


class ProgressReport(TenantScopedMixin, TimestampMixin, Base):
    __tablename__ = "progress_reports"

    title = Column(String(255), nullable=False)
    content_html = Column(Text, nullable=False)         # Editable HTML content
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)
    status = Column(String(50), default="draft")        # draft, sent
    recipients = Column(Text, nullable=True)            # JSON array of emails
    sent_date = Column(Date, nullable=True)

    # AI generation
    ai_model_used = Column(String(100), nullable=True)
    ai_generation_time_ms = Column(Integer, nullable=True)

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    generated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
