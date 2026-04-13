"""Public branding endpoint.

Returns the current tenant's branding information (colors, logo, app name).
This endpoint does NOT require authentication — it is needed to render
the login page with the correct tenant branding before the user logs in.
Tenant is resolved from the subdomain/domain via TenantMiddleware.
"""

from typing import Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter(prefix="/branding", tags=["Branding"])


class BrandingResponse(BaseModel):
    tenant_id: Optional[int] = None
    org_name: str = "PMO Platform"
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: str = "#3B82F6"
    secondary_color: str = "#6366F1"
    favicon: Optional[str] = None
    app_name: str = "PMO Platform"
    login_subtitle: str = "Project Management Office"
    support_email: str = "soporte@pmo-platform.com"


@router.get("/current", response_model=BrandingResponse)
def get_current_branding(request: Request):
    """Return branding for the current tenant (resolved from hostname).

    No authentication required.  If no tenant is resolved, returns default branding.
    """
    tenant = getattr(request.state, "tenant", None)
    if not tenant:
        return BrandingResponse()

    config = tenant.get("config_json") or {}
    return BrandingResponse(
        tenant_id=tenant["id"],
        org_name=tenant["name"],
        slug=tenant["slug"],
        logo_url=tenant["logo_url"],
        primary_color=tenant.get("primary_color") or "#3B82F6",
        secondary_color=tenant.get("secondary_color") or "#6366F1",
        favicon=config.get("favicon"),
        app_name=config.get("app_name", tenant["name"]),
        login_subtitle=config.get("login_subtitle", "Project Management Office"),
        support_email=config.get("support_email", "soporte@pmo-platform.com"),
    )
