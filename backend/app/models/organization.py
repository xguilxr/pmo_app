from sqlalchemy import Boolean, Column, String, Integer, ForeignKey
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

    # Relationships
    programs = relationship("Program", back_populates="organization", lazy="selectin")
    projects = relationship("Project", back_populates="organization", lazy="selectin")
