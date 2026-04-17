"""Super Admin API routes.

Protected by ``get_superadmin_user`` — only users with ``is_superadmin=True``
can access these endpoints.  Provides:
- Tenant (Organization) CRUD with full multi-tenant field management
- Tenant provisioning automation (create org + asset dir + initial admin)
- Server health / monitoring snapshot
- Cross-tenant user and role management (platform-wide)
- Access logs (logins, password changes) and activity logs
- Join-as-admin shortcut so a superadmin can operate inside any tenant

The router deliberately does not use ``get_current_tenant``; tenant scope is
derived from path params so the endpoints still work on inactive tenants
(the regular tenant dependency filters ``is_active.is_(True)``).
"""

import os
import platform
import re
import secrets
import shutil
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, or_, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.auth.security import get_superadmin_user, hash_password
from app.database import get_db
from app.middleware.tenant import invalidate_tenant_cache
from app.models.audit import AuditLog
from app.models.organization import Organization
from app.models.program import Program
from app.models.project import Project
from app.models.role import Permission, Role
from app.models.user import User
from app.schemas.user import enforce_password_policy
from app.services.audit import log_action

router = APIRouter(prefix="/superadmin", tags=["Super Admin"])


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
    # Initial admin user — optional. If omitted, a default admin is auto-generated
    # from the tenant slug + a random password (returned in the response once).
    admin_username: Optional[str] = None
    admin_email: Optional[EmailStr] = None
    admin_full_name: Optional[str] = None
    admin_password: Optional[str] = None


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


class TenantCreateResponse(TenantResponse):
    """Tenant response including the auto-provisioned admin's credentials.

    The password is only returned **once**, right after creation. Save it now —
    it is stored hashed and cannot be recovered.
    """
    admin_user_id: int
    admin_username: str
    admin_email: str
    admin_password: str  # plaintext, first and last time it's exposed


class ProvisionRequest(BaseModel):
    """Create a new tenant with an initial admin user in one step.

    All ``admin_*`` fields are optional. If omitted, the endpoint generates a
    sensible default (``{slug}_admin`` username, contact email or
    ``admin@{slug}.local``, random password) so *every* tenant ends up with a
    working admin. The generated password is returned in the response once.
    """
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
    # Initial admin user fields (optional, auto-generated if not provided)
    admin_username: Optional[str] = None
    admin_email: Optional[EmailStr] = None
    admin_full_name: Optional[str] = None
    admin_password: Optional[str] = None


class ProvisionResponse(BaseModel):
    tenant: TenantResponse
    admin_user_id: int
    admin_username: str
    admin_email: str
    admin_password: str  # plaintext, shown once so the operator can save it
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


class TenantDetailResponse(TenantResponse):
    """Extended tenant response with full detail for drill-down view."""
    programs: list[dict] = []
    projects: list[dict] = []
    users: list[dict] = []
    requests: list[dict] = []


@router.get("/tenants/{tenant_id}/detail", response_model=TenantDetailResponse)
def get_tenant_detail(
    tenant_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_superadmin_user),
):
    """Get tenant with full detail: programs, projects, users, requests."""
    from app.models.project_request import ProjectRequest
    from sqlalchemy.orm import selectinload

    org = db.query(Organization).filter(
        Organization.id == tenant_id, Organization.deleted_at.is_(None)
    ).first()
    if not org:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")

    # Legacy rows may have config_json = NULL; Pydantic is ok with None but the
    # frontend is cleaner with a dict.
    if org.config_json is None:
        org.config_json = {}

    # Counts
    user_count = (
        db.execute(
            text("SELECT COUNT(*) FROM user_organizations WHERE organization_id = :oid"),
            {"oid": org.id},
        ).scalar() or 0
    )
    project_count = (
        db.query(func.count(Project.id))
        .filter(Project.organization_id == org.id, Project.deleted_at.is_(None))
        .scalar() or 0
    )

    # Programs with project counts — single query, no N+1
    programs = db.query(Program).filter(
        Program.organization_id == org.id, Program.deleted_at.is_(None)
    ).all()
    program_project_counts = dict(
        db.query(Project.program_id, func.count(Project.id))
        .filter(
            Project.organization_id == org.id,
            Project.deleted_at.is_(None),
            Project.program_id.isnot(None),
        )
        .group_by(Project.program_id)
        .all()
    )
    programs_data = [
        {
            "id": p.id,
            "name": p.name,
            "status": p.status,
            "project_count": program_project_counts.get(p.id, 0),
            "start_date": str(p.start_date) if p.start_date else None,
            "end_date": str(p.end_date) if p.end_date else None,
        }
        for p in programs
    ]

    # Projects — build program name map up front (no N+1)
    program_name_map = {p.id: p.name for p in programs}
    projects = db.query(Project).filter(
        Project.organization_id == org.id, Project.deleted_at.is_(None)
    ).order_by(Project.created_at.desc()).all()
    projects_data = [
        {
            "id": prj.id,
            "folio": prj.folio,
            "name": prj.name,
            "type": prj.type,
            "phase": prj.phase,
            "health": prj.health or "green",
            "progress": prj.progress or 0,
            "planned_progress": prj.planned_progress or 0,
            "budget": prj.budget or 0,
            "program_name": program_name_map.get(prj.program_id) if prj.program_id else None,
        }
        for prj in projects
    ]

    # Users in this org — explicit selectinload for roles, single query
    user_objs = (
        db.query(User)
        .options(selectinload(User.roles))
        .join(User.organizations)
        .filter(Organization.id == org.id, User.deleted_at.is_(None))
        .order_by(User.full_name)
        .all()
    )
    users_data = [
        {
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "email": u.email,
            "is_active": u.is_active,
            "last_login": str(u.last_login) if u.last_login else None,
            "roles": [r.name for r in (u.roles or [])],
        }
        for u in user_objs
    ]

    # Project requests
    reqs = db.query(ProjectRequest).filter(
        ProjectRequest.organization_id == org.id, ProjectRequest.deleted_at.is_(None)
    ).order_by(ProjectRequest.created_at.desc()).all()
    requests_data = [
        {
            "id": r.id,
            "folio": r.folio,
            "title": r.title,
            "status": r.status,
            "requester_name": r.requester_name or "",
            "request_date": str(r.request_date) if r.request_date else "",
        }
        for r in reqs
    ]

    # Build the response explicitly. We must NOT use ``model_validate(org)``
    # because Organization has ``programs`` / ``projects`` relationships
    # (lazy="selectin") that Pydantic would pull as ORM instances and try to
    # validate against ``list[dict]`` — causing 9 validation errors.
    return TenantDetailResponse(
        id=org.id,
        name=org.name,
        legal_name=org.legal_name,
        slug=org.slug,
        domain=org.domain,
        industry=org.industry,
        country=org.country,
        contact_name=org.contact_name,
        contact_email=org.contact_email,
        contact_phone=org.contact_phone,
        logo_url=org.logo_url,
        primary_color=org.primary_color,
        secondary_color=org.secondary_color,
        config_json=org.config_json or {},
        is_active=org.is_active,
        created_at=org.created_at,
        user_count=user_count,
        project_count=project_count,
        programs=programs_data,
        projects=projects_data,
        users=users_data,
        requests=requests_data,
    )


def _slugify(value: str) -> str:
    """Normalize a string into a lowercase, dash-separated slug."""
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value or "").strip("-").lower()
    return value or "tenant"


def _resolve_admin_credentials(data: TenantCreate, slug: str) -> tuple[str, str, str, str]:
    """Return (username, email, full_name, password) for the tenant admin.

    Missing fields are auto-generated from the tenant slug so that *every*
    tenant always ends up with a working admin user.
    """
    username = (data.admin_username or f"{slug}_admin").strip()
    email = (
        data.admin_email
        or data.contact_email
        or f"admin@{slug}.local"
    )
    full_name = (data.admin_full_name or f"Admin {data.name}").strip()
    password = data.admin_password or secrets.token_urlsafe(12)
    return username, str(email), full_name, password


@router.post(
    "/tenants",
    response_model=TenantCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_tenant(
    data: TenantCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_superadmin_user),
):
    """Create a tenant **and** its initial admin user in one transaction.

    Every tenant is guaranteed to have a working Administrador account. If the
    caller does not supply ``admin_*`` fields, sensible defaults are generated
    from the slug and a random password is returned once in the response.
    """
    slug = data.slug or _slugify(data.name)
    username, email, full_name, password = _resolve_admin_credentials(data, slug)

    org = Organization(
        name=data.name,
        legal_name=data.legal_name,
        slug=slug,
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
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Ya existe un tenant con ese nombre o slug",
        )

    new_admin = User(
        username=username,
        email=email,
        full_name=full_name,
        hashed_password=hash_password(password),
        is_active=True,
        is_superadmin=False,
    )
    db.add(new_admin)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=(
                f"Ya existe un usuario con el username '{username}' o email '{email}'. "
                "Indica admin_username / admin_email explicitos."
            ),
        )

    new_admin.organizations.append(org)
    admin_role = db.query(Role).filter(Role.name == "Administrador").first()
    if admin_role:
        new_admin.roles.append(admin_role)

    db.commit()
    db.refresh(org)
    db.refresh(new_admin)

    # Create static asset directory for this tenant
    _ensure_asset_dir(org.slug)
    invalidate_tenant_cache()

    return TenantCreateResponse(
        id=org.id,
        name=org.name,
        legal_name=org.legal_name,
        slug=org.slug,
        domain=org.domain,
        industry=org.industry,
        country=org.country,
        contact_name=org.contact_name,
        contact_email=org.contact_email,
        contact_phone=org.contact_phone,
        logo_url=org.logo_url,
        primary_color=org.primary_color,
        secondary_color=org.secondary_color,
        config_json=org.config_json,
        is_active=org.is_active,
        created_at=org.created_at,
        user_count=1,
        project_count=0,
        admin_user_id=new_admin.id,
        admin_username=new_admin.username,
        admin_email=new_admin.email,
        admin_password=password,
    )


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
    """Soft-delete a tenant (preserves audit trail).

    Sets ``is_active=False`` and ``deleted_at=now()`` so the tenant drops out
    of normal lookups (which filter ``deleted_at.is_(None)``) but the row and
    its cascade of data remain in MySQL for recovery or audit. For irreversible
    wipe of test tenants use ``DELETE /tenants/{id}/permanent``.
    """
    org = db.query(Organization).filter(
        Organization.id == tenant_id, Organization.deleted_at.is_(None)
    ).first()
    if not org:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
    org.is_active = False
    org.deleted_at = func.now()
    db.commit()
    invalidate_tenant_cache()



@router.post("/provision", response_model=ProvisionResponse, status_code=status.HTTP_201_CREATED)
def provision_tenant(
    data: ProvisionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_superadmin_user),
):
    """One-step tenant provisioning — thin wrapper around ``POST /tenants``.

    Kept for backwards compatibility with existing frontend clients. Both
    endpoints now share the same logic (``create_tenant``), so every tenant
    always ends up with an initial admin user.
    """
    create = TenantCreate(
        name=data.name,
        legal_name=data.legal_name,
        slug=data.slug,
        domain=data.domain,
        industry=data.industry,
        country=data.country,
        contact_email=data.contact_email,
        primary_color=data.primary_color,
        secondary_color=data.secondary_color,
        config_json=data.config_json,
        is_active=True,
        admin_username=data.admin_username,
        admin_email=data.admin_email,
        admin_full_name=data.admin_full_name,
        admin_password=data.admin_password,
    )
    result = create_tenant(create, db=db, admin=admin)
    asset_dir = os.path.join(_TENANT_STATIC_ROOT, result.slug or data.slug)

    tenant_data = result.model_dump(
        exclude={"admin_user_id", "admin_username", "admin_email", "admin_password"}
    )
    return ProvisionResponse(
        tenant=TenantResponse.model_validate(tenant_data),
        admin_user_id=result.admin_user_id,
        admin_username=result.admin_username,
        admin_email=result.admin_email,
        admin_password=result.admin_password,
        asset_directory=asset_dir,
    )



class LoginEventResponse(BaseModel):
    id: int
    timestamp: datetime
    user_id: Optional[int]
    username: Optional[str]
    full_name: Optional[str]
    action: str
    organization_id: Optional[int]
    organization_name: Optional[str]
    ip_address: Optional[str]
    details: Optional[str]

    model_config = {"from_attributes": True}


@router.get("/login-events", response_model=list[LoginEventResponse])
def list_login_events(
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_superadmin_user),
):
    """Platform-wide login events (success / failed / blocked).

    Superadmin view over ``audit_log`` for ``module='auth'``. Joins user and
    org so the UI can show "who, where, when" without N+1 follow-ups.
    """
    from app.models.audit import AuditLog

    # One row per login attempt platform-level (organization_id IS NULL). The
    # per-tenant duplicates are filtered out to avoid showing the same login
    # N times when a user belongs to N orgs.
    q = (
        db.query(AuditLog, User, Organization)
        .outerjoin(User, User.id == AuditLog.user_id)
        .outerjoin(Organization, Organization.id == AuditLog.organization_id)
        .filter(AuditLog.module == "auth", AuditLog.organization_id.is_(None))
        .order_by(AuditLog.timestamp.desc())
        .offset(offset)
        .limit(limit)
    )

    results = []
    for log, user, org in q.all():
        results.append(
            LoginEventResponse(
                id=log.id,
                timestamp=log.timestamp,
                user_id=log.user_id,
                username=user.username if user else None,
                full_name=user.full_name if user else None,
                action=log.action,
                organization_id=log.organization_id,
                organization_name=org.name if org else None,
                ip_address=log.ip_address,
                details=log.details,
            )
        )
    return results


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



@router.post("/tenants/{tenant_id}/logo", response_model=TenantResponse)
def upload_tenant_logo(
    tenant_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_superadmin_user),
):
    """Upload a company logo for a tenant and persist the public URL.

    Accepts PNG, JPG, or SVG up to 2 MB. The file is saved to
    ``backend/static/tenants/{slug}/logo.{ext}`` and served at the matching
    ``/static/tenants/...`` URL. ``tenant.logo_url`` is updated to that URL.
    """
    allowed_types = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/svg+xml": "svg",
        "image/webp": "webp",
    }
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Formato no soportado ({file.content_type}). Usa PNG, JPG, SVG o WEBP.",
        )

    org = db.query(Organization).filter(
        Organization.id == tenant_id, Organization.deleted_at.is_(None)
    ).first()
    if not org:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
    if not org.slug:
        raise HTTPException(status_code=400, detail="El tenant no tiene slug; asigna uno primero")

    # Read and size-check (max 2 MB)
    contents = file.file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo excede 2 MB")

    ext = allowed_types[file.content_type]
    asset_dir = _ensure_asset_dir(org.slug)
    logo_path = os.path.join(asset_dir, f"logo.{ext}")
    with open(logo_path, "wb") as f:
        f.write(contents)

    # Remove any prior logo variants so only one remains
    for prior_ext in ("png", "jpg", "svg", "webp"):
        if prior_ext == ext:
            continue
        prior = os.path.join(asset_dir, f"logo.{prior_ext}")
        if os.path.exists(prior):
            os.remove(prior)

    org.logo_url = f"/static/tenants/{org.slug}/logo.{ext}"
    db.commit()
    db.refresh(org)
    invalidate_tenant_cache()

    user_count = (
        db.execute(
            text("SELECT COUNT(*) FROM user_organizations WHERE organization_id = :oid"),
            {"oid": org.id},
        ).scalar() or 0
    )
    project_count = (
        db.query(func.count(Project.id))
        .filter(Project.organization_id == org.id, Project.deleted_at.is_(None))
        .scalar() or 0
    )
    resp = TenantResponse.model_validate(org)
    resp.user_count = user_count
    resp.project_count = project_count
    return resp


@router.delete(
    "/tenants/{tenant_id}/permanent",
    status_code=status.HTTP_204_NO_CONTENT,
)
def hard_delete_tenant(
    tenant_id: int,
    confirm_slug: str = Query(
        ...,
        description="Slug del tenant; debe coincidir para confirmar el borrado permanente.",
    ),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_superadmin_user),
):
    """PERMANENTLY delete a tenant and all its data.

    This is the **explicit escape hatch** for wiping test tenants before going
    live. It is deliberately hard-delete (not soft) and irreversible. Audit
    trail is preserved elsewhere — the normal UI path is
    ``DELETE /tenants/{id}`` (soft-delete). Requires ``?confirm_slug=<slug>``
    to match the tenant's slug as a double check, mirroring GitHub's repo
    deletion pattern.
    """
    from app.models.project_request import ProjectRequest
    from app.models.modules import Risk, Issue, Change, Document, Lesson, Minute
    from app.models.task import Task
    from app.models.area import Area
    from app.models.objective import Objective
    from app.models.resource import Resource

    org = db.query(Organization).filter(Organization.id == tenant_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
    if confirm_slug != (org.slug or ""):
        raise HTTPException(
            status_code=400,
            detail="El slug de confirmacion no coincide con el del tenant",
        )

    oid = org.id

    # 1. Drop all project-scoped data for every project in the tenant
    project_ids = [
        pid for (pid,) in
        db.query(Project.id).filter(Project.organization_id == oid).all()
    ]
    if project_ids:
        for model in (Task, Risk, Issue, Change, Document, Lesson, Minute, Area, Objective):
            if hasattr(model, "project_id"):
                db.query(model).filter(model.project_id.in_(project_ids)).delete(
                    synchronize_session=False,
                )

    # 2. Drop tenant-scoped entities (projects, programs, requests, resources)
    db.query(Project).filter(Project.organization_id == oid).delete(synchronize_session=False)
    db.query(Program).filter(Program.organization_id == oid).delete(synchronize_session=False)
    db.query(ProjectRequest).filter(ProjectRequest.organization_id == oid).delete(
        synchronize_session=False,
    )
    if hasattr(Resource, "organization_id"):
        db.query(Resource).filter(Resource.organization_id == oid).delete(
            synchronize_session=False,
        )

    # 3. Drop user-organization links (users themselves may belong to other tenants)
    db.execute(
        text("DELETE FROM user_organizations WHERE organization_id = :oid"),
        {"oid": oid},
    )

    # 4. Delete users that are now orphaned (no tenant left, not superadmin)
    orphan_user_ids = [
        uid for (uid,) in db.execute(
            text(
                """
                SELECT u.id FROM users u
                LEFT JOIN user_organizations uo ON uo.user_id = u.id
                WHERE uo.user_id IS NULL
                  AND u.is_superadmin = 0
                  AND u.deleted_at IS NULL
                """
            )
        ).fetchall()
    ]
    if orphan_user_ids:
        db.query(User).filter(User.id.in_(orphan_user_ids)).delete(synchronize_session=False)

    # 5. Finally delete the tenant itself
    db.query(Organization).filter(Organization.id == oid).delete(synchronize_session=False)

    db.commit()
    invalidate_tenant_cache()

    # 6. Remove the tenant's static asset directory (logos, etc.)
    if org.slug:
        asset_dir = os.path.join(_TENANT_STATIC_ROOT, org.slug)
        if os.path.isdir(asset_dir):
            shutil.rmtree(asset_dir, ignore_errors=True)


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


# =============================================================================
# Tenant lifecycle helpers (activate/deactivate, join-as-admin)
# =============================================================================

class ToggleActiveRequest(BaseModel):
    is_active: bool


@router.patch("/tenants/{tenant_id}/active", response_model=TenantResponse)
def toggle_tenant_active(
    tenant_id: int,
    data: ToggleActiveRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_superadmin_user),
):
    """Activate or deactivate a tenant without losing data.

    Deactivating also clears ``deleted_at`` so the tenant stays visible to the
    super admin (it just blocks regular login via the tenant domain). Use the
    ``DELETE`` endpoint for a true soft-delete with audit removal.
    """
    org = db.query(Organization).filter(Organization.id == tenant_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
    org.is_active = data.is_active
    # If reactivating a previously soft-deleted tenant, clear deleted_at too
    if data.is_active and org.deleted_at is not None:
        org.deleted_at = None
    log_action(
        db,
        user_id=admin.id,
        action="tenant_activated" if data.is_active else "tenant_deactivated",
        module="superadmin",
        record_id=org.id,
        details={"slug": org.slug, "name": org.name},
    )
    db.commit()
    db.refresh(org)
    invalidate_tenant_cache()

    user_count = (
        db.execute(
            text("SELECT COUNT(*) FROM user_organizations WHERE organization_id = :oid"),
            {"oid": org.id},
        ).scalar() or 0
    )
    project_count = (
        db.query(func.count(Project.id))
        .filter(Project.organization_id == org.id, Project.deleted_at.is_(None))
        .scalar() or 0
    )
    resp = TenantResponse.model_validate(org)
    resp.user_count = user_count
    resp.project_count = project_count
    return resp


@router.post("/tenants/{tenant_id}/join-as-admin", response_model=dict)
def join_tenant_as_admin(
    tenant_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_superadmin_user),
):
    """Add the current super admin as ``Administrador`` of the tenant.

    Convenience shortcut for "I need to do admin-level work in this tenant
    right now". Idempotent: if already a member, just ensures the role is set.
    """
    org = db.query(Organization).filter(Organization.id == tenant_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")

    already_member = any(o.id == org.id for o in admin.organizations)
    if not already_member:
        admin.organizations.append(org)

    admin_role = db.query(Role).filter(Role.name == "Administrador").first()
    has_role = admin_role and any(r.id == admin_role.id for r in admin.roles)
    if admin_role and not has_role:
        admin.roles.append(admin_role)

    log_action(
        db,
        user_id=admin.id,
        action="join_as_admin",
        module="superadmin",
        record_id=org.id,
        organization_id=org.id,
        details={"slug": org.slug, "already_member": already_member},
    )
    db.commit()
    return {
        "tenant_id": org.id,
        "tenant_name": org.name,
        "user_id": admin.id,
        "already_member": already_member,
        "role_assigned": admin_role.name if admin_role else None,
    }


# =============================================================================
# Cross-tenant user management
# =============================================================================

class SuperUserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    is_active: bool
    is_superadmin: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    roles: list[str] = []
    organizations: list[dict] = []  # [{id, name, slug}]


class SuperUserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str
    is_superadmin: bool = False
    role_ids: list[int] = []
    organization_ids: list[int] = []


class SuperUserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    is_superadmin: Optional[bool] = None
    role_ids: Optional[list[int]] = None
    organization_ids: Optional[list[int]] = None


def _serialize_user(user: User) -> SuperUserResponse:
    return SuperUserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_superadmin=user.is_superadmin,
        last_login=user.last_login,
        created_at=user.created_at,
        roles=[r.name for r in (user.roles or [])],
        organizations=[
            {"id": o.id, "name": o.name, "slug": o.slug}
            for o in (user.organizations or [])
        ],
    )


@router.get("/users", response_model=list[SuperUserResponse])
def list_all_users(
    search: Optional[str] = None,
    tenant_id: Optional[int] = None,
    role: Optional[str] = None,
    only_active: bool = False,
    include_superadmins: bool = True,
    limit: int = Query(200, le=1000),
    offset: int = 0,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_superadmin_user),
):
    """Cross-tenant user listing for super admins."""
    q = db.query(User).options(
        selectinload(User.roles), selectinload(User.organizations)
    ).filter(User.deleted_at.is_(None))

    if only_active:
        q = q.filter(User.is_active.is_(True))
    if not include_superadmins:
        q = q.filter(User.is_superadmin.is_(False))
    if search:
        like = f"%{search}%"
        q = q.filter(
            or_(User.username.ilike(like), User.email.ilike(like), User.full_name.ilike(like))
        )
    if tenant_id is not None:
        q = q.join(User.organizations).filter(Organization.id == tenant_id)
    if role:
        q = q.join(User.roles).filter(Role.name == role)

    q = q.order_by(User.full_name.asc()).offset(offset).limit(limit)
    return [_serialize_user(u) for u in q.all()]


@router.post(
    "/users",
    response_model=SuperUserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user_anywhere(
    data: SuperUserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_superadmin_user),
):
    """Create a user and attach them to any orgs/roles. No tenant scope."""
    try:
        enforce_password_policy(data.password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado")

    user = User(
        username=data.username,
        email=str(data.email),
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        is_active=True,
        is_superadmin=data.is_superadmin,
        created_by_id=admin.id,
    )
    if data.role_ids:
        user.roles = db.query(Role).filter(Role.id.in_(data.role_ids)).all()
    if data.organization_ids:
        user.organizations = (
            db.query(Organization).filter(Organization.id.in_(data.organization_ids)).all()
        )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_action(
        db, user_id=admin.id, action="user_create_platform",
        module="superadmin", record_id=user.id,
        details={"username": user.username, "email": user.email},
    )
    db.commit()
    return _serialize_user(user)


@router.patch("/users/{user_id}", response_model=SuperUserResponse)
def update_user_anywhere(
    user_id: int,
    data: SuperUserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_superadmin_user),
):
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    update_data = data.model_dump(exclude_unset=True)

    if "role_ids" in update_data:
        role_ids = update_data.pop("role_ids")
        if role_ids is not None:
            user.roles = db.query(Role).filter(Role.id.in_(role_ids)).all()
    if "organization_ids" in update_data:
        org_ids = update_data.pop("organization_ids")
        if org_ids is not None:
            user.organizations = (
                db.query(Organization).filter(Organization.id.in_(org_ids)).all()
            )

    # Guardrail: never allow the current super admin to strip their own super
    # admin flag via this endpoint — would lock them out of the panel.
    if "is_superadmin" in update_data and user.id == admin.id and update_data["is_superadmin"] is False:
        raise HTTPException(
            status_code=400,
            detail="No puedes quitarte tu propio rol de super admin",
        )

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    log_action(
        db, user_id=admin.id, action="user_update_platform",
        module="superadmin", record_id=user.id, details={"fields": list(update_data.keys())},
    )
    db.commit()
    return _serialize_user(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_anywhere(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_superadmin_user),
):
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propio usuario")
    user.deleted_at = datetime.now(timezone.utc)
    user.is_active = False
    log_action(
        db, user_id=admin.id, action="user_delete_platform",
        module="superadmin", record_id=user.id,
        details={"username": user.username},
    )
    db.commit()


class PasswordResetResult(BaseModel):
    user_id: int
    username: str
    new_password: str  # returned once


@router.post("/users/{user_id}/reset-password", response_model=PasswordResetResult)
def reset_user_password(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_superadmin_user),
):
    """Force-reset a user's password to a new random value (returned once)."""
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    new_password = secrets.token_urlsafe(12)  # ~16 chars, satisfies policy
    user.hashed_password = hash_password(new_password)
    user.failed_login_attempts = 0
    user.locked_until = None
    log_action(
        db, user_id=admin.id, action="password_reset_platform",
        module="superadmin", record_id=user.id,
        details={"username": user.username},
    )
    db.commit()
    return PasswordResetResult(
        user_id=user.id, username=user.username, new_password=new_password,
    )


# =============================================================================
# Platform-wide roles & permissions
# =============================================================================

class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_system: bool = False
    user_count: int = 0
    permission_ids: list[int] = []


class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    permission_ids: list[int] = []


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[list[int]] = None


class PermissionResponse(BaseModel):
    id: int
    module: str
    action: str
    description: Optional[str] = None


def _serialize_role(role: Role, user_count: int) -> RoleResponse:
    return RoleResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        is_system=bool(role.is_system),
        user_count=user_count,
        permission_ids=[p.id for p in (role.permissions or [])],
    )


@router.get("/roles", response_model=list[RoleResponse])
def list_platform_roles(
    db: Session = Depends(get_db),
    _admin: User = Depends(get_superadmin_user),
):
    roles = db.query(Role).options(selectinload(Role.permissions)).order_by(Role.name).all()
    counts = dict(
        db.execute(
            text(
                "SELECT role_id, COUNT(*) FROM user_roles "
                "JOIN users u ON u.id = user_roles.user_id "
                "WHERE u.deleted_at IS NULL GROUP BY role_id"
            )
        ).fetchall()
    )
    return [_serialize_role(r, int(counts.get(r.id, 0))) for r in roles]


@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_platform_role(
    data: RoleCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_superadmin_user),
):
    if db.query(Role).filter(Role.name == data.name).first():
        raise HTTPException(status_code=400, detail="Ya existe un rol con ese nombre")
    role = Role(name=data.name, description=data.description, is_system=False)
    if data.permission_ids:
        role.permissions = (
            db.query(Permission).filter(Permission.id.in_(data.permission_ids)).all()
        )
    db.add(role)
    db.commit()
    db.refresh(role)
    log_action(
        db, user_id=admin.id, action="role_create_platform",
        module="superadmin", record_id=role.id, details={"name": role.name},
    )
    db.commit()
    return _serialize_role(role, 0)


@router.patch("/roles/{role_id}", response_model=RoleResponse)
def update_platform_role(
    role_id: int,
    data: RoleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_superadmin_user),
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    if role.is_system and data.name and data.name != role.name:
        raise HTTPException(status_code=400, detail="No puedes renombrar un rol del sistema")

    update_data = data.model_dump(exclude_unset=True)
    if "permission_ids" in update_data:
        perm_ids = update_data.pop("permission_ids")
        if perm_ids is not None:
            role.permissions = (
                db.query(Permission).filter(Permission.id.in_(perm_ids)).all()
            )
    for field, value in update_data.items():
        setattr(role, field, value)

    db.commit()
    db.refresh(role)
    log_action(
        db, user_id=admin.id, action="role_update_platform",
        module="superadmin", record_id=role.id, details={"name": role.name},
    )
    db.commit()
    count = db.execute(
        text(
            "SELECT COUNT(*) FROM user_roles JOIN users u ON u.id = user_roles.user_id "
            "WHERE role_id = :rid AND u.deleted_at IS NULL"
        ),
        {"rid": role.id},
    ).scalar() or 0
    return _serialize_role(role, int(count))


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_platform_role(
    role_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_superadmin_user),
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    if role.is_system:
        raise HTTPException(status_code=400, detail="No puedes eliminar un rol del sistema")
    # Detach from users first so FKs don't fail
    role.users.clear()
    role.permissions.clear()
    db.delete(role)
    log_action(
        db, user_id=admin.id, action="role_delete_platform",
        module="superadmin", record_id=role.id, details={"name": role.name},
    )
    db.commit()


@router.get("/permissions", response_model=list[PermissionResponse])
def list_platform_permissions(
    db: Session = Depends(get_db),
    _admin: User = Depends(get_superadmin_user),
):
    perms = db.query(Permission).order_by(Permission.module, Permission.action).all()
    return [
        PermissionResponse(
            id=p.id, module=p.module, action=p.action, description=p.description,
        )
        for p in perms
    ]


# =============================================================================
# Access logs (logins, password changes) + activity logs
# =============================================================================

_ACCESS_ACTIONS = {
    "login_success", "login_failed", "login_blocked", "logout",
    "password_change", "password_reset", "password_reset_platform",
    "password_reset_request",
}


class AccessLogEntry(BaseModel):
    id: int
    timestamp: datetime
    action: str
    user_id: Optional[int] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    organization_id: Optional[int] = None
    organization_name: Optional[str] = None
    ip_address: Optional[str] = None
    details: Optional[str] = None


@router.get("/access-logs", response_model=list[AccessLogEntry])
def list_access_logs(
    action: Optional[str] = None,
    user_id: Optional[int] = None,
    tenant_id: Optional[int] = None,
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(200, le=1000),
    offset: int = 0,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_superadmin_user),
):
    """Access log: logins (success/failed/blocked), logouts, password events.

    When no ``tenant_id`` is passed, each login event is deduplicated across
    the platform-level row (``organization_id IS NULL``) and the per-tenant
    rows written for the same event. This keeps the view readable even for
    legacy events that only have tenant-scoped rows (before the platform row
    was added) — otherwise the page would look empty for those.
    """
    since = datetime.utcnow() - timedelta(days=days)
    q = (
        db.query(AuditLog, User, Organization)
        .outerjoin(User, User.id == AuditLog.user_id)
        .outerjoin(Organization, Organization.id == AuditLog.organization_id)
        .filter(
            AuditLog.action.in_(list(_ACCESS_ACTIONS)),
            AuditLog.timestamp >= since,
        )
    )
    if tenant_id is not None:
        q = q.filter(AuditLog.organization_id == tenant_id)
    if action:
        q = q.filter(AuditLog.action == action)
    if user_id is not None:
        q = q.filter(AuditLog.user_id == user_id)
    # Fetch more than requested so the Python dedupe still produces ``limit``
    # entries. The 4x fan-out covers the worst case of a user with 3 tenants.
    fetch_cap = limit * 4 if tenant_id is None else limit
    q = q.order_by(AuditLog.timestamp.desc()).offset(offset).limit(fetch_cap)

    rows = q.all()
    if tenant_id is None:
        # Prefer the platform-level row per (user, action, second) — otherwise
        # keep the first tenant row we see so the event still shows.
        seen: dict[tuple, tuple] = {}
        for log, user, org in rows:
            ts_key = log.timestamp.replace(microsecond=0) if log.timestamp else None
            key = (log.user_id, log.action, ts_key, log.ip_address)
            existing = seen.get(key)
            if existing is None or (log.organization_id is None and existing[0].organization_id is not None):
                seen[key] = (log, user, org)
        deduped = list(seen.values())
        deduped.sort(key=lambda t: t[0].timestamp or datetime.min, reverse=True)
        rows = deduped[:limit]
    else:
        rows = rows[:limit]

    return [
        AccessLogEntry(
            id=log.id,
            timestamp=log.timestamp,
            action=log.action,
            user_id=log.user_id,
            username=user.username if user else None,
            full_name=user.full_name if user else None,
            organization_id=log.organization_id,
            organization_name=org.name if org else None,
            ip_address=log.ip_address,
            details=log.details,
        )
        for log, user, org in rows
    ]


class ActivityLogEntry(BaseModel):
    id: int
    timestamp: datetime
    action: str
    module: str
    record_id: Optional[int] = None
    user_id: Optional[int] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    organization_id: Optional[int] = None
    organization_name: Optional[str] = None
    ip_address: Optional[str] = None
    details: Optional[str] = None


@router.get("/activity-logs", response_model=list[ActivityLogEntry])
def list_activity_logs(
    module: Optional[str] = None,
    action: Optional[str] = None,
    tenant_id: Optional[int] = None,
    user_id: Optional[int] = None,
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(200, le=1000),
    offset: int = 0,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_superadmin_user),
):
    """Platform-wide activity log (all modules except auth).

    Covers CRUD on organizations, programs, projects, risks, issues, changes,
    minutes, etc. Filterable by tenant so a super admin can audit a single
    organization without hopping into it.
    """
    since = datetime.utcnow() - timedelta(days=days)
    q = (
        db.query(AuditLog, User, Organization)
        .outerjoin(User, User.id == AuditLog.user_id)
        .outerjoin(Organization, Organization.id == AuditLog.organization_id)
        .filter(
            AuditLog.action.notin_(list(_ACCESS_ACTIONS)),
            # Tolerate legacy rows with NULL module (NULL != 'auth' evaluates
            # to UNKNOWN in SQL, which would otherwise filter them out).
            or_(AuditLog.module.is_(None), AuditLog.module != "auth"),
            AuditLog.timestamp >= since,
        )
    )
    if module:
        q = q.filter(AuditLog.module == module)
    if action:
        q = q.filter(AuditLog.action == action)
    if tenant_id is not None:
        q = q.filter(AuditLog.organization_id == tenant_id)
    if user_id is not None:
        q = q.filter(AuditLog.user_id == user_id)
    q = q.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit)

    return [
        ActivityLogEntry(
            id=log.id,
            timestamp=log.timestamp,
            action=log.action,
            module=log.module,
            record_id=log.record_id,
            user_id=log.user_id,
            username=user.username if user else None,
            full_name=user.full_name if user else None,
            organization_id=log.organization_id,
            organization_name=org.name if org else None,
            ip_address=log.ip_address,
            details=log.details,
        )
        for log, user, org in q.all()
    ]


# =============================================================================
# Platform overview (dashboard stats)
# =============================================================================

class OverviewResponse(BaseModel):
    tenant_count: int
    tenant_active_count: int
    tenant_inactive_count: int
    user_count: int
    superadmin_count: int
    project_count: int
    program_count: int
    logins_last_24h: int
    failed_logins_last_24h: int
    recent_tenants: list[dict] = []       # last 5 provisioned tenants
    tenants_by_industry: list[dict] = []  # [{industry, count}]


@router.get("/overview", response_model=OverviewResponse)
def platform_overview(
    db: Session = Depends(get_db),
    _admin: User = Depends(get_superadmin_user),
):
    """Aggregated stats for the super admin landing page."""
    tenant_count = db.query(func.count(Organization.id)).filter(
        Organization.deleted_at.is_(None)
    ).scalar() or 0
    tenant_active = db.query(func.count(Organization.id)).filter(
        Organization.deleted_at.is_(None), Organization.is_active.is_(True)
    ).scalar() or 0
    tenant_inactive = tenant_count - tenant_active

    user_count = db.query(func.count(User.id)).filter(User.deleted_at.is_(None)).scalar() or 0
    superadmin_count = db.query(func.count(User.id)).filter(
        User.deleted_at.is_(None), User.is_superadmin.is_(True)
    ).scalar() or 0
    project_count = db.query(func.count(Project.id)).filter(
        Project.deleted_at.is_(None)
    ).scalar() or 0
    program_count = db.query(func.count(Program.id)).filter(
        Program.deleted_at.is_(None)
    ).scalar() or 0

    since_24h = datetime.utcnow() - timedelta(hours=24)
    logins_24h = db.query(func.count(AuditLog.id)).filter(
        AuditLog.action == "login_success",
        AuditLog.organization_id.is_(None),
        AuditLog.timestamp >= since_24h,
    ).scalar() or 0
    failed_logins_24h = db.query(func.count(AuditLog.id)).filter(
        AuditLog.action.in_(["login_failed", "login_blocked"]),
        AuditLog.organization_id.is_(None),
        AuditLog.timestamp >= since_24h,
    ).scalar() or 0

    recent = (
        db.query(Organization)
        .filter(Organization.deleted_at.is_(None))
        .order_by(Organization.created_at.desc())
        .limit(5)
        .all()
    )
    recent_tenants = [
        {
            "id": o.id,
            "name": o.name,
            "slug": o.slug,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "is_active": o.is_active,
        }
        for o in recent
    ]

    industry_rows = (
        db.query(Organization.industry, func.count(Organization.id))
        .filter(Organization.deleted_at.is_(None))
        .group_by(Organization.industry)
        .all()
    )
    tenants_by_industry = [
        {"industry": ind or "Sin industria", "count": int(cnt)}
        for ind, cnt in industry_rows
    ]

    return OverviewResponse(
        tenant_count=int(tenant_count),
        tenant_active_count=int(tenant_active),
        tenant_inactive_count=int(tenant_inactive),
        user_count=int(user_count),
        superadmin_count=int(superadmin_count),
        project_count=int(project_count),
        program_count=int(program_count),
        logins_last_24h=int(logins_24h),
        failed_logins_last_24h=int(failed_logins_24h),
        recent_tenants=recent_tenants,
        tenants_by_industry=tenants_by_industry,
    )
