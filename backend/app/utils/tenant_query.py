"""Tenant-scoped query helpers.

Provides a simple wrapper to ensure every database query that touches
tenant-specific data includes the ``organization_id`` filter.
"""

from sqlalchemy.orm import Session, Query

from app.models.organization import Organization


def tenant_query(db: Session, model, tenant: Organization) -> Query:
    """Return a base query on *model* scoped to *tenant*.

    Automatically appends:
        .filter(model.organization_id == tenant.id,
                model.deleted_at.is_(None))

    Usage::

        projects = tenant_query(db, Project, tenant).all()
    """
    q = db.query(model).filter(model.organization_id == tenant.id)
    if hasattr(model, "deleted_at"):
        q = q.filter(model.deleted_at.is_(None))
    return q


def scope_to_tenant(query: Query, model, tenant: Organization) -> Query:
    """Add tenant filter to an existing query."""
    return query.filter(model.organization_id == tenant.id)
