from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, Table
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin
from app.models.user import user_roles

# Many-to-many: roles <-> permissions
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)


class Role(TimestampMixin, Base):
    __tablename__ = "roles"

    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    is_system = Column(Boolean, default=False)  # system roles can't be deleted

    # Relationships
    users = relationship("User", secondary=user_roles, back_populates="roles", lazy="selectin")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles", lazy="selectin")


class Permission(TimestampMixin, Base):
    __tablename__ = "permissions"

    module = Column(String(100), nullable=False)   # projects, risks, issues, changes, documents, lessons, minutes, admin
    action = Column(String(50), nullable=False)    # view, create, edit, delete
    description = Column(String(255), nullable=True)

    # Relationships
    roles = relationship("Role", secondary=role_permissions, back_populates="permissions", lazy="selectin")
