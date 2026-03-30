from sqlalchemy import Column, String, Integer, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin


class Notification(TimestampMixin, Base):
    __tablename__ = "notifications"

    type = Column(String(50), nullable=False, index=True)
    # project_created, project_phase_changed, project_health_changed,
    # task_assigned, task_overdue, risk_created, risk_high_severity,
    # issue_created, change_status_changed, document_uploaded, deadline_approaching

    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)

    # Who receives this notification
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Context: which project/entity this is about
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    entity_type = Column(String(50), nullable=True)   # task, risk, issue, change, document
    entity_id = Column(Integer, nullable=True)

    # Who triggered the notification (optional)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    user = relationship("User", foreign_keys=[user_id])
    actor = relationship("User", foreign_keys=[actor_id])
    project = relationship("Project")
