from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, func


class TimestampMixin:
    """Mixin with created_at, updated_at, deleted_at for all models."""
    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime, nullable=True)  # soft delete
