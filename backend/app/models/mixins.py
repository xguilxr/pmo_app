from sqlalchemy import Column, Integer, ForeignKey


class TenantScopedMixin:
    """Mixin that adds organization_id FK for multi-tenant data isolation.

    All models holding tenant-specific data should inherit from this mixin
    so that every row is associated with a tenant (organization).
    """

    organization_id = Column(
        Integer,
        ForeignKey("organizations.id"),
        nullable=True,
        index=True,
    )
