from sqlalchemy import Column, String, Integer, Date, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin
from app.models.mixins import TenantScopedMixin


class Risk(TenantScopedMixin, TimestampMixin, Base):
    __tablename__ = "risks"

    folio = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)
    probability = Column(Integer, nullable=False)     # 1-5
    impact = Column(Integer, nullable=False)           # 1-5
    severity = Column(Integer, nullable=False)         # probability * impact
    mitigation_strategy = Column(Text, nullable=True)
    status = Column(String(50), default="open")        # open, mitigated, closed
    identification_date = Column(Date, nullable=False)
    deadline = Column(Date, nullable=True)

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    responsible_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    project = relationship("Project", back_populates="risks")


class Issue(TenantScopedMixin, TimestampMixin, Base):
    __tablename__ = "issues"

    folio = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    type = Column(String(50), nullable=False)          # action, issue, decision (AID)
    priority = Column(String(20), nullable=False)      # Alta, Media, Baja
    status = Column(String(50), default="open")        # open, in_progress, resolved, closed
    resolution = Column(Text, nullable=True)
    report_date = Column(Date, nullable=False)
    commitment_date = Column(Date, nullable=True)

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    responsible_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    project = relationship("Project", back_populates="issues")


class Change(TenantScopedMixin, TimestampMixin, Base):
    __tablename__ = "changes"

    folio = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    change_type = Column(String(50), nullable=False)   # scope, time, cost, resource
    impact = Column(Text, nullable=True)
    requested_by = Column(String(255), nullable=True)
    request_date = Column(Date, nullable=False)
    status = Column(String(50), default="in_review")   # in_review, approved, rejected, implemented
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approval_date = Column(Date, nullable=True)
    comments = Column(Text, nullable=True)

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    project = relationship("Project", back_populates="changes")


class Document(TenantScopedMixin, TimestampMixin, Base):
    __tablename__ = "documents"

    folio = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    category = Column(String(100), nullable=True)      # plan, report, contract, other
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(20), nullable=True)
    file_size = Column(Integer, nullable=True)          # bytes
    version = Column(Integer, default=1)

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    project = relationship("Project", back_populates="documents")


class Lesson(TenantScopedMixin, TimestampMixin, Base):
    __tablename__ = "lessons"

    folio = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=True)       # success, improvement, error
    project_phase = Column(String(100), nullable=True)
    recommendation = Column(Text, nullable=True)

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    recorded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    project = relationship("Project", back_populates="lessons")


class Minute(TenantScopedMixin, TimestampMixin, Base):
    __tablename__ = "minutes"

    folio = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    meeting_date = Column(Date, nullable=False)
    participants = Column(Text, nullable=True)         # JSON array of names/ids
    topics = Column(Text, nullable=True)
    agreements = Column(Text, nullable=True)
    next_meeting_date = Column(Date, nullable=True)
    source = Column(String(50), default="manual")      # manual, ai_generated

    # AI fields
    transcript_text = Column(Text, nullable=True)
    ai_model_used = Column(String(100), nullable=True)
    ai_generation_time_ms = Column(Integer, nullable=True)

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    recorded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    project = relationship("Project", back_populates="minutes")
