"""Tenant-scoped query helpers.

Provides a simple wrapper to ensure every database query that touches
tenant-specific data includes the ``organization_id`` filter.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.organization import Organization
from app.models.project import Project


def verify_project_tenant(db: Session, project_id: int, tenant: Organization) -> Project:
    """Load a project and verify it belongs to the given tenant.

    Raises 404 if not found or doesn't belong to the tenant.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == tenant.id,
        Project.deleted_at.is_(None),
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return project
