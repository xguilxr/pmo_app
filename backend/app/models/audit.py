from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, func

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, server_default=func.now(), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(50), nullable=False)      # create, update, delete, login, logout, etc.
    module = Column(String(100), nullable=False)     # users, projects, risks, etc.
    record_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)            # JSON with change details
    ip_address = Column(String(50), nullable=True)
