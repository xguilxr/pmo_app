from sqlalchemy import Column, String, Integer, Date, Float, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin
from app.models.user import user_projects
from app.models.resource import project_resources


class Project(TimestampMixin, Base):
    __tablename__ = "projects"

    folio = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    type = Column(String(100), nullable=True)        # Tecnología, Digital, Procesos, etc.
    priority = Column(String(20), nullable=True)      # Alta, Media, Baja
    phase = Column(String(50), default="Planificación")  # Planificación, Ejecución, Soporte, Cerrado
    status = Column(String(50), default="active")
    health = Column(String(20), default="green")      # green, yellow, red

    # Dates
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

    # Budget
    budget = Column(Float, default=0)
    real_budget = Column(Float, default=0)

    # Progress
    progress = Column(Float, default=0)               # 0-100
    planned_progress = Column(Float, default=0)        # 0-100

    # Foreign keys
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    program_id = Column(Integer, ForeignKey("programs.id"), nullable=True)
    pm_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    request_id = Column(Integer, ForeignKey("project_requests.id"), nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="projects")
    program = relationship("Program", back_populates="projects")
    users = relationship("User", secondary=user_projects, back_populates="projects", lazy="selectin")
    risks = relationship("Risk", back_populates="project", lazy="dynamic")
    issues = relationship("Issue", back_populates="project", lazy="dynamic")
    changes = relationship("Change", back_populates="project", lazy="dynamic")
    documents = relationship("Document", back_populates="project", lazy="dynamic")
    lessons = relationship("Lesson", back_populates="project", lazy="dynamic")
    minutes = relationship("Minute", back_populates="project", lazy="dynamic")
    tasks = relationship("Task", back_populates="project", lazy="dynamic")
    backlog_items = relationship("BacklogItem", back_populates="project", lazy="dynamic")
    areas = relationship("ProjectArea", back_populates="project", lazy="dynamic")
    objectives = relationship("ProjectObjective", back_populates="project", lazy="dynamic")
    resources = relationship("Resource", secondary=project_resources, back_populates="projects")
    statuses = relationship("ProjectStatus", lazy="dynamic")
    closure = relationship("ProjectClosure", uselist=False)
