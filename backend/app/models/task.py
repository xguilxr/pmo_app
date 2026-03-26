from sqlalchemy import Column, String, Integer, Date, Float, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin


class Task(TimestampMixin, Base):
    __tablename__ = "tasks"

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    wbs = Column(String(50), nullable=True)            # Work Breakdown Structure code
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    duration_days = Column(Integer, nullable=True)
    progress = Column(Float, default=0)                # 0-100
    status = Column(String(50), default="pending")     # pending, in_progress, completed, delayed
    priority = Column(String(20), nullable=True)
    is_milestone = Column(Boolean, default=False)
    outline_level = Column(Integer, default=1)         # hierarchy level
    notes = Column(Text, nullable=True)
    source = Column(String(50), default="manual")      # manual, ms_project_import

    # Hierarchy
    parent_task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    responsible_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    project = relationship("Project", back_populates="tasks")
    parent = relationship("Task", remote_side="Task.id", backref="subtasks")


class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    predecessor_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    successor_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    dependency_type = Column(String(10), default="FS")  # FS, SS, FF, SF
