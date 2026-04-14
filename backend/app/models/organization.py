from sqlalchemy import Boolean, Column, String, Integer, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin


class Organization(TimestampMixin, Base):
    __tablename__ = "organizations"

    name = Column(String(255), unique=True, nullable=False, index=True)
    legal_name = Column(String(255), nullable=True)
    industry = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    contact_name = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    logo_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Multi-tenant fields
    slug = Column(String(100), unique=True, nullable=True, index=True)
    domain = Column(String(255), unique=True, nullable=True)
    primary_color = Column(String(7), nullable=True, default="#3B82F6")
    secondary_color = Column(String(7), nullable=True, default="#6366F1")
    config_json = Column(JSON, nullable=True, default=dict)

    # Relationships
    programs = relationship("Program", back_populates="organization", lazy="selectin")
    projects = relationship("Project", back_populates="organization", lazy="selectin")
