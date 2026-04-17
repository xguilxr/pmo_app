from sqlalchemy import Column, String, Integer, Date, Float, Text, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin


# Pivot table: project <-> resource assignment
project_resources = Table(
    "project_resources",
    Base.metadata,
    Column("project_id", Integer, ForeignKey("projects.id"), primary_key=True),
    Column("resource_id", Integer, ForeignKey("resources.id"), primary_key=True),
    Column("allocation", Float, default=100),          # percentage 0-100
    Column("role", String(100), nullable=True),         # role in the project
)


class Resource(TimestampMixin, Base):
    __tablename__ = "resources"

    folio = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    position = Column(String(255), nullable=True)
    department = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    mobile_phone = Column(String(50), nullable=True)
    company_name = Column(String(255), nullable=True)

    resource_type = Column(String(50), default="human")   # human, equipment, material
    is_internal = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)

    hourly_rate = Column(Float, default=0)
    cost_period = Column(String(20), default="hour")       # hour, day, month
    hours_worked = Column(Float, default=0)                # accumulated

    # Link to a system user (optional)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    projects = relationship("Project", secondary=project_resources, back_populates="resources")
    work_logs = relationship("ResourceWorkLog", back_populates="resource", lazy="dynamic")
    availabilities = relationship("ResourceAvailability", back_populates="resource", lazy="dynamic")


class ResourceWorkLog(TimestampMixin, Base):
    __tablename__ = "resource_work_logs"

    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    work_date = Column(Date, nullable=False)
    hours = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    # Explicit tenant column: queries filter by this instead of joining the
    # resource. Nullable until backfill migration runs.
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=True, index=True
    )

    resource = relationship("Resource", back_populates="work_logs")


class ResourceAvailability(TimestampMixin, Base):
    __tablename__ = "resource_availabilities"

    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=False)
    available_date = Column(Date, nullable=False)
    available_hours = Column(Float, nullable=False)       # 0-24
    notes = Column(Text, nullable=True)
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=True, index=True
    )

    resource = relationship("Resource", back_populates="availabilities")
