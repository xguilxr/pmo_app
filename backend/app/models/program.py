from sqlalchemy import Column, String, Integer, Date, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin


class Program(TimestampMixin, Base):
    __tablename__ = "programs"

    name = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=True)
    status = Column(String(50), default="active")
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    responsible_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="programs")
    projects = relationship("Project", back_populates="program", lazy="selectin")
