from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin

# Many-to-many: users <-> roles
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)

# Many-to-many: users <-> projects
user_projects = Table(
    "user_projects",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("project_id", Integer, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("project_role", String(50), default="member"),  # pm, member, stakeholder
)


class User(TimestampMixin, Base):
    __tablename__ = "users"

    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)
    security_question = Column(String(255), nullable=True)
    security_answer_hash = Column(String(255), nullable=True)

    # Relationships
    roles = relationship("Role", secondary=user_roles, back_populates="users", lazy="selectin")
    projects = relationship("Project", secondary=user_projects, back_populates="users", lazy="selectin")
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
