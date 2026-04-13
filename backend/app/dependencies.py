"""FastAPI dependencies for multi-tenant context."""

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.organization import Organization
from app.auth.security import get_current_user
from app.models.user import User


def get_tenant_from_request(request: Request) -> dict | None:
    """Return the tenant dict attached by TenantMiddleware, or None."""
    return getattr(request.state, "tenant", None)


def get_current_tenant(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Organization:
    """Resolve the active tenant for the current request.

    Resolution order:
    1. If the request carries a tenant from TenantMiddleware (subdomain/domain),
       use that — but verify the user belongs to that organization.
    2. If no subdomain tenant, check for an ``X-Tenant-ID`` header
       (used by frontends that send the selected org explicitly).
    3. If the user belongs to exactly one organization, auto-select it.
    4. Otherwise raise 400 asking the caller to specify a tenant.
    """
    tenant_dict = getattr(request.state, "tenant", None)

    # ---- path 1: middleware-resolved tenant ----
    if tenant_dict:
        org_id = tenant_dict["id"]
        user_org_ids = {o.id for o in current_user.organizations}
        if current_user.is_superadmin or org_id in user_org_ids:
            org = db.query(Organization).get(org_id)
            if org:
                return org
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a esta organizacion",
        )

    # ---- path 2: explicit header ----
    header_tenant = request.headers.get("x-tenant-id")
    if header_tenant:
        try:
            org_id = int(header_tenant)
        except ValueError:
            raise HTTPException(status_code=400, detail="X-Tenant-ID invalido")
        user_org_ids = {o.id for o in current_user.organizations}
        if current_user.is_superadmin or org_id in user_org_ids:
            org = db.query(Organization).filter(
                Organization.id == org_id,
                Organization.is_active.is_(True),
                Organization.deleted_at.is_(None),
            ).first()
            if org:
                return org
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a esta organizacion",
        )

    # ---- path 3: auto-select single org ----
    user_orgs = [o for o in current_user.organizations if o.is_active and o.deleted_at is None]
    if len(user_orgs) == 1:
        return user_orgs[0]

    # ---- path 4: ambiguous ----
    if current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super admin debe especificar X-Tenant-ID",
        )
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Especifica la organizacion mediante X-Tenant-ID o subdominio",
    )


def get_optional_tenant(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Organization | None:
    """Like get_current_tenant but returns None instead of raising on ambiguity.

    Useful for endpoints that can optionally filter by tenant.
    """
    try:
        return get_current_tenant(request, current_user, db)
    except HTTPException:
        return None
