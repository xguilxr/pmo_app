from sqlalchemy import Column, String, Integer, Date, Float, Text, ForeignKey

from app.database import Base
from app.models.base import TimestampMixin


class ProjectRequest(TimestampMixin, Base):
    __tablename__ = "project_requests"

    folio = Column(String(50), unique=True, nullable=False, index=True)
    status = Column(String(50), default="in_review")  # in_review, approved, rejected, info_requested

    # Auto-filled
    request_date = Column(Date, nullable=False)
    requester_name = Column(String(255), nullable=False)
    requester_email = Column(String(255), nullable=False)

    # Form fields
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    objective = Column(Text, nullable=False)
    business_unit = Column(String(255), nullable=False)
    department = Column(String(255), nullable=False)
    sub_department = Column(String(255), nullable=True)
    sponsor_name = Column(String(255), nullable=False)
    sponsor_email = Column(String(255), nullable=False)
    strategic_alignment = Column(String(500), nullable=False)
    benefits = Column(Text, nullable=False)
    budget = Column(Float, nullable=True)
    what_if_not_done = Column(Text, nullable=False)
    key_stakeholders = Column(Text, nullable=False)
    expected_deliverables = Column(Text, nullable=False)
    observations = Column(Text, nullable=True)

    # Review
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_date = Column(Date, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Foreign keys
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
