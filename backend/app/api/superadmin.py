"""Super Admin API routes.

Protected by ``get_superadmin_user`` — only users with ``is_superadmin=True``
can access these endpoints.  Provides:
- Tenant (Organization) CRUD with full multi-tenant field management
- Tenant provisioning automation (create org + asset dir + initial admin)
- Server health / monitoring snapshot
"""

import os
import platform
import shutil
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.security import get_superadmin_user, hash_password
from app.database import get_db
from app.middleware.tenant import invalidate_tenant_cache
from app.models.organization import Organization
from app.models.program import Program
from app.models.project import Project
from app.models.user import User

router = APIRouter(prefix="/superadmin", tags=["Super Admin"])

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class TenantCreate(BaseModel):
    name: str
    legal_name: Optional[str] = None
    slug: Optional[str] = None
    domain: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = "México"
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: str = "#3B82F6"
    secondary_color: str = "#6366F1"
    config_json: Optional[dict] = None
    is_active: bool = True


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    legal_name: Optional[str] = None
    slug: Optional[str] = None
    domain: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    config_json: Optional[dict] = None
    is_active: Optional[bool] = None


class TenantResponse(BaseModel):
    id: int
    name: str
    legal_name: Optional[str] = None
    slug: Optional[str] = None
    domain: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    config_json: Optional[dict] = None
    is_active: bool
    created_at: datetime
    user_count: int = 0
    project_count: int = 0

    model_config = {"from_attributes": True}


class ProvisionRequest(BaseModel):
    """Create a new tenant with an initial admin user in one step."""
    # Organization fields
    name: str
    legal_name: Optional[str] = None
    slug: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = "México"
    contact_email: Optional[str] = None
    primary_color: str = "#3B82F6"
    secondary_color: str = "#6366F1"
    config_json: Optional[dict] = None
    # Initial admin user fields
    admin_username: str
    admin_email: EmailStr
    admin_full_name: str
    admin_password: str


class ProvisionResponse(BaseModel):
    tenant: TenantResponse
    admin_user_id: int
    admin_username: str
    asset_directory: str


class ServerHealthResponse(BaseModel):
    status: str
    platform: str
    python_version: str
    cpu_count: Optional[int] = None
    disk_total_gb: Optional[float] = None
    disk_used_gb: Optional[float] = None
    disk_free_gb: Optional[float] = None
    db_connected: bool
    db_tenant_count: int
    db_user_count: int
    db_project_count: int
    uptime_info: Optional[str] = None


# ---------------------------------------------------------------------------
# Tenant CRUD
# ---------------------------------------------------------------------------


@router.get("/tenants", response_model=list[TenantResponse])
def list_tenants(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_superadmin_user),
):
    """List all tenants with user and project counts."""
    query = db.query(Organization).filter(Organization.deleted_at.is_(None))
    if not include_inactive:
        query = query.filter(Organization.is_active.is_(True))
    orgs = query.order_by(Organization.name.asc()).all()

    results = []
    for org in orgs:
        user_count = (
            db.execute(
                text("SELECT COUNT(*) FROM user_organizations WHERE organization_id = :oid"),
                {"oid": org.id},
            ).scalar()
            or 0
        )
        project_count = (
            db.query(func.count(Project.id))
            .filter(Project.organization_id == org.id, Project.deleted_at.is_(None))
            .scalar()
            or 0
        )
        resp = TenantResponse.model_validate(org)
        resp.user_count = user_count
        resp.project_count = project_count
        results.append(resp)
    return results


@router.get("/tenants/{tenant_id}", response_model=TenantResponse)
def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_superadmin_user),
):
    org = db.query(Organization).filter(
        Organization.id == tenant_id, Organization.deleted_at.is_(None)
    ).first()
    if not org:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")

    user_count = (
        db.execute(
            text("SELECT COUNT(*) FROM user_organizations WHERE organization_id = :oid"),
            {"oid": org.id},
        ).scalar()
        or 0
    )
    project_count = (
        db.query(func.count(Project.id))
        .filter(Project.organization_id == org.id, Project.deleted_at.is_(None))
        .scalar()
        or 0
    )
    resp = TenantResponse.model_validate(org)
    resp.user_count = user_count
    resp.project_count = project_count
    return resp


@router.post("/tenants", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant(
    data: TenantCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_superadmin_user),
):
    org = Organization(
        name=data.name,
        legal_name=data.legal_name,
        slug=data.slug,
        domain=data.domain,
        industry=data.industry,
        country=data.country,
        contact_name=data.contact_name,
        contact_email=data.contact_email,
        contact_phone=data.contact_phone,
        logo_url=data.logo_url,
        primary_color=data.primary_color,
        secondary_color=data.secondary_color,
        config_json=data.config_json or {},
        is_active=data.is_active,
        created_by_id=admin.id,
    )
    db.add(org)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Ya existe un tenant con ese nombre o slug",
        )
    db.refresh(org)

    # Create static asset directory for this tenant
    if org.slug:
        _ensure_asset_dir(org.slug)

    resp = TenantResponse.model_validate(org)
    resp.user_count = 0
    resp.project_count = 0
    return resp


@router.patch("/tenants/{tenant_id}", response_model=TenantResponse)
def update_tenant(
    tenant_id: int,
    data: TenantUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_superadmin_user),
):
    org = db.query(Organization).filter(
        Organization.id == tenant_id, Organization.deleted_at.is_(None)
    ).first()
    if not org:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")

    old_slug = org.slug
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(org, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Ya existe un tenant con ese nombre o slug",
        )
    db.refresh(org)

    # Rename asset directory if slug changed
    if org.slug and org.slug != old_slug:
        _ensure_asset_dir(org.slug)

    # Invalidate tenant cache so changes take effect immediately
    invalidate_tenant_cache()

    user_count = (
        db.execute(
            text("SELECT COUNT(*) FROM user_organizations WHERE organization_id = :oid"),
            {"oid": org.id},
        ).scalar()
        or 0
    )
    project_count = (
        db.query(func.count(Project.id))
        .filter(Project.organization_id == org.id, Project.deleted_at.is_(None))
        .scalar()
        or 0
    )
    resp = TenantResponse.model_validate(org)
    resp.user_count = user_count
    resp.project_count = project_count
    return resp


@router.delete("/tenants/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_superadmin_user),
):
    """Soft-deactivate a tenant (sets is_active=False).

    Does NOT delete data — use this for suspension.  For hard delete,
    use the organizations endpoint cascade.
    """
    org = db.query(Organization).filter(
        Organization.id == tenant_id, Organization.deleted_at.is_(None)
    ).first()
    if not org:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
    org.is_active = False
    db.commit()
    invalidate_tenant_cache()


# ---------------------------------------------------------------------------
# Tenant Provisioning
# ---------------------------------------------------------------------------


@router.post("/provision", response_model=ProvisionResponse, status_code=status.HTTP_201_CREATED)
def provision_tenant(
    data: ProvisionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_superadmin_user),
):
    """One-step tenant provisioning: create org + asset dir + initial admin user."""

    # 1. Create organization
    org = Organization(
        name=data.name,
        legal_name=data.legal_name,
        slug=data.slug,
        domain=data.domain,
        industry=data.industry,
        country=data.country,
        contact_email=data.contact_email,
        primary_color=data.primary_color,
        secondary_color=data.secondary_color,
        config_json=data.config_json or {},
        is_active=True,
        created_by_id=admin.id,
    )
    db.add(org)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Ya existe un tenant con ese nombre o slug",
        )

    # 2. Create initial admin user for this tenant
    new_user = User(
        username=data.admin_username,
        email=data.admin_email,
        full_name=data.admin_full_name,
        hashed_password=hash_password(data.admin_password),
        is_active=True,
        is_superadmin=False,
    )
    db.add(new_user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Ya existe un usuario con ese username o email",
        )

    # Assign user to organization
    new_user.organizations.append(org)

    # Assign the "Administrador" role if it exists
    from app.models.role import Role
    admin_role = db.query(Role).filter(Role.name == "Administrador").first()
    if admin_role:
        new_user.roles.append(admin_role)

    db.commit()
    db.refresh(org)
    db.refresh(new_user)

    # 3. Create static asset directory
    asset_dir = _ensure_asset_dir(data.slug)

    # Build response with counts
    tenant_resp = TenantResponse.model_validate(org)
    tenant_resp.user_count = 1
    tenant_resp.project_count = 0

    return ProvisionResponse(
        tenant=tenant_resp,
        admin_user_id=new_user.id,
        admin_username=new_user.username,
        asset_directory=asset_dir,
    )


# ---------------------------------------------------------------------------
# Server Monitoring
# ---------------------------------------------------------------------------


@router.get("/health", response_model=ServerHealthResponse)
def server_health(
    db: Session = Depends(get_db),
    _admin: User = Depends(get_superadmin_user),
):
    """Server health snapshot for super admins."""

    # Database connectivity and counts
    db_connected = True
    try:
        tenant_count = db.query(func.count(Organization.id)).filter(
            Organization.deleted_at.is_(None)
        ).scalar() or 0
        user_count = db.query(func.count(User.id)).filter(
            User.deleted_at.is_(None)
        ).scalar() or 0
        project_count = db.query(func.count(Project.id)).filter(
            Project.deleted_at.is_(None)
        ).scalar() or 0
    except Exception:
        db_connected = False
        tenant_count = user_count = project_count = 0

    # Disk usage (for the app directory)
    disk_total_gb = disk_used_gb = disk_free_gb = None
    try:
        usage = shutil.disk_usage("/")
        disk_total_gb = round(usage.total / (1024**3), 2)
        disk_used_gb = round(usage.used / (1024**3), 2)
        disk_free_gb = round(usage.free / (1024**3), 2)
    except Exception:
        pass

    # Uptime (Linux only)
    uptime_info = None
    try:
        with open("/proc/uptime") as f:
            uptime_seconds = float(f.read().split()[0])
            days = int(uptime_seconds // 86400)
            hours = int((uptime_seconds % 86400) // 3600)
            uptime_info = f"{days}d {hours}h"
    except Exception:
        pass

    return ServerHealthResponse(
        status="ok",
        platform=platform.platform(),
        python_version=platform.python_version(),
        cpu_count=os.cpu_count(),
        disk_total_gb=disk_total_gb,
        disk_used_gb=disk_used_gb,
        disk_free_gb=disk_free_gb,
        db_connected=db_connected,
        db_tenant_count=tenant_count,
        db_user_count=user_count,
        db_project_count=project_count,
        uptime_info=uptime_info,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_TENANT_STATIC_ROOT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "static", "tenants",
)


def _ensure_asset_dir(slug: str) -> str:
    """Create the per-tenant static asset directory if it doesn't exist."""
    path = os.path.join(_TENANT_STATIC_ROOT, slug)
    os.makedirs(path, exist_ok=True)
    gitkeep = os.path.join(path, ".gitkeep")
    if not os.path.exists(gitkeep):
        open(gitkeep, "a").close()
    return path
