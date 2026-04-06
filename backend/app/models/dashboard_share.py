import secrets

from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey

from app.database import Base
from app.models.base import TimestampMixin


class DashboardShareLink(TimestampMixin, Base):
    """Public shared dashboard link with optional PIN and expiration."""
    __tablename__ = "dashboard_share_links"

    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    label = Column(String(255), nullable=False)
    token = Column(String(128), unique=True, nullable=False, default=lambda: secrets.token_urlsafe(48))
    pin_hash = Column(String(255), nullable=True)
    expires_at = Column(DateTime, nullable=True)
    last_accessed_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
