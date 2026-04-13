"""Tenant resolution middleware.

Resolves the current tenant (organization) from the incoming request's
hostname.  The resolved tenant object is stored on ``request.state.tenant``
so that downstream dependencies and route handlers can access it.

Resolution priority:
1. Subdomain match  (e.g. ``grupo-alfa.yourplatform.com`` -> slug ``grupo-alfa``)
2. Custom domain match (e.g. ``app.grupoalfa.com`` -> domain column)
3. Fallback -> tenant is ``None`` (login page / super-admin routes still work)
"""

import logging
import time
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.organization import Organization

logger = logging.getLogger(__name__)

# In-memory tenant cache: hostname -> (Organization dict, expiry timestamp)
_tenant_cache: dict[str, tuple[Optional[dict], float]] = {}
_CACHE_TTL_SECONDS = 300  # 5 minutes


def _org_to_dict(org: Organization) -> dict:
    """Serialize an Organization row to a plain dict for caching."""
    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "domain": org.domain,
        "logo_url": org.logo_url,
        "primary_color": org.primary_color,
        "secondary_color": org.secondary_color,
        "config_json": org.config_json or {},
        "is_active": org.is_active,
    }


def _resolve_tenant(hostname: str) -> Optional[dict]:
    """Look up a tenant by hostname.  Returns a dict or None."""
    now = time.time()

    # Check cache first
    cached = _tenant_cache.get(hostname)
    if cached and cached[1] > now:
        return cached[0]

    db: Session = SessionLocal()
    try:
        # 1. Try subdomain match
        #    hostname could be "grupo-alfa.example.com" or "grupo-alfa.example.com:8080"
        host_no_port = hostname.split(":")[0]
        parts = host_no_port.split(".")

        tenant_dict: Optional[dict] = None

        if len(parts) >= 3:
            # e.g. ["grupo-alfa", "yourplatform", "com"]
            subdomain = parts[0]
            org = db.query(Organization).filter(
                Organization.slug == subdomain,
                Organization.is_active.is_(True),
                Organization.deleted_at.is_(None),
            ).first()
            if org:
                tenant_dict = _org_to_dict(org)

        # 2. Try exact domain match (custom domains)
        if tenant_dict is None:
            org = db.query(Organization).filter(
                Organization.domain == host_no_port,
                Organization.is_active.is_(True),
                Organization.deleted_at.is_(None),
            ).first()
            if org:
                tenant_dict = _org_to_dict(org)

        # Cache the result (even None, to avoid repeated DB lookups for unknown hosts)
        _tenant_cache[hostname] = (tenant_dict, now + _CACHE_TTL_SECONDS)
        return tenant_dict
    finally:
        db.close()


def invalidate_tenant_cache(hostname: Optional[str] = None):
    """Clear the tenant cache.  If hostname is None, clear everything."""
    if hostname:
        _tenant_cache.pop(hostname, None)
    else:
        _tenant_cache.clear()


# Paths that should bypass tenant resolution entirely
_BYPASS_PREFIXES = (
    "/api/health",
    "/api/superadmin",
    "/docs",
    "/redoc",
    "/openapi.json",
)


class TenantMiddleware(BaseHTTPMiddleware):
    """Attach resolved tenant to request.state.tenant on every request."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip tenant resolution for health checks, docs, and super-admin
        if any(request.url.path.startswith(p) for p in _BYPASS_PREFIXES):
            request.state.tenant = None
            return await call_next(request)

        hostname = request.headers.get("host", "")
        tenant = _resolve_tenant(hostname)
        request.state.tenant = tenant

        return await call_next(request)
