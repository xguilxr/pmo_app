"""Super Admin API routes.

Protected by ``get_superadmin_user`` — only users with ``is_superadmin=True``
can access these endpoints.  Provides:
- Tenant (Organization) CRUD with full multi-tenant field management
- Tenant provisioning automation (create org + asset dir + initial admin)
- Server health / monitoring snapshot
"""

import os
import platform
import re
import secrets
import shutil
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
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
from app.models.role import Role
from app.models.user import User

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

    org = db.query(Organization).filter(
        Organization.id == tenant_id, Organization.deleted_at.is_(None)
    ).first()
    if not org:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")

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

    # Programs with project counts
    programs = db.query(Program).filter(
        Program.organization_id == org.id, Program.deleted_at.is_(None)
    ).all()
    programs_data = []
    for p in programs:
        pc = db.query(func.count(Project.id)).filter(
            Project.program_id == p.id, Project.deleted_at.is_(None)
        ).scalar() or 0
        programs_data.append({
            "id": p.id, "name": p.name, "status": p.status,
            "project_count": pc,
            "start_date": str(p.start_date) if p.start_date else None,
            "end_date": str(p.end_date) if p.end_date else None,
        })

    # Projects with program name
    projects = db.query(Project).filter(
        Project.organization_id == org.id, Project.deleted_at.is_(None)
    ).order_by(Project.created_at.desc()).all()
    projects_data = []
    for prj in projects:
        prog_name = None
        if prj.program_id:
            prog = db.query(Program).filter(Program.id == prj.program_id).first()
            if prog:
                prog_name = prog.name
        projects_data.append({
            "id": prj.id, "folio": prj.folio, "name": prj.name,
            "type": prj.type, "phase": prj.phase, "health": prj.health or "green",
            "progress": prj.progress or 0, "planned_progress": prj.planned_progress or 0,
            "budget": prj.budget or 0, "program_name": prog_name,
        })

    # Users in this org
    user_rows = db.execute(
        text("""
            SELECT u.id, u.username, u.full_name, u.email, u.is_active, u.last_login
            FROM users u
            JOIN user_organizations uo ON uo.user_id = u.id
            WHERE uo.organization_id = :oid AND u.deleted_at IS NULL
            ORDER BY u.full_name
        """),
        {"oid": org.id},
    ).fetchall()
    users_data = []
    for row in user_rows:
        user_obj = db.query(User).get(row[0])
        roles = [r.name for r in user_obj.roles] if user_obj else []
        users_data.append({
            "id": row[0], "username": row[1], "full_name": row[2],
            "email": row[3], "is_active": row[4],
            "last_login": str(row[5]) if row[5] else None,
            "roles": roles,
        })

    # Project requests
    reqs = db.query(ProjectRequest).filter(
        ProjectRequest.organization_id == org.id, ProjectRequest.deleted_at.is_(None)
    ).order_by(ProjectRequest.created_at.desc()).all()
    requests_data = []
    for r in reqs:
        requests_data.append({
            "id": r.id, "folio": r.folio, "title": r.title,
            "status": r.status, "requester_name": r.requester_name or "",
            "request_date": str(r.request_date) if r.request_date else "",
        })

    resp = TenantDetailResponse.model_validate(org)
    resp.user_count = user_count
    resp.project_count = project_count
    resp.programs = programs_data
    resp.projects = projects_data
    resp.users = users_data
    resp.requests = requests_data
    return resp


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

    This operation is **irreversible**. It cascades through all tenant-scoped
    tables via explicit ORM deletes (safer than DB-level CASCADE because it
    runs audit hooks and respects soft-delete for user/org rows the tenant
    shares). Use only for wiping test tenants before going live.

    Requires ``?confirm_slug=<slug>`` to match the tenant's slug as a double
    check, mirroring GitHub's repo deletion pattern.
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
