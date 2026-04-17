"""Pytest fixtures for the API test suite.

Every test runs against an in-memory SQLite database so the suite can run
offline and in CI without depending on MySQL. Multi-tenant behavior is
validated against SQLite just like MySQL — the same SQLAlchemy models.

Fixtures:
    client       — TestClient with a fresh DB per test
    db_session   — SQLAlchemy Session bound to the same in-memory DB
    org_a / org_b — two tenants, used to assert isolation
    user_admin_a — admin of org_a (role 'Administrador')
    user_member_b — regular user of org_b
    superadmin   — platform-level super admin (is_superadmin=True)
    token_*      — JWT tokens for the above users
    auth_headers — helper factory to build {'Authorization', 'X-Tenant-ID'} headers
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend/ is on sys.path so `import app` works from pytest.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("SECRET_KEY", "test-secret-only-for-pytest-never-deploy")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from app import database  # noqa: E402
from app.database import Base  # noqa: E402


@pytest.fixture()
def engine():
    eng = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # Import all models so Base.metadata knows about them before create_all.
    from app import models  # noqa: F401
    from app.models import user, organization, program, project, role  # noqa: F401
    from app.models import modules, task, resource, audit, notification  # noqa: F401
    from app.models import project_request, project_status, project_closure  # noqa: F401
    from app.models import area, objective, backlog, approval_log  # noqa: F401
    from app.models import dashboard_share, report  # noqa: F401

    Base.metadata.create_all(bind=eng)
    yield eng
    Base.metadata.drop_all(bind=eng)
    eng.dispose()


@pytest.fixture()
def db_session(engine):
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(engine, db_session):
    """FastAPI TestClient wired to the in-memory DB via dependency override."""
    from app.main import app
    from app.database import get_db

    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def _override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as tc:
        yield tc
    app.dependency_overrides.clear()


# --- Seed helpers ------------------------------------------------------------

@pytest.fixture()
def seed_roles(db_session):
    from app.models.role import Role

    roles = {}
    for name in ("Administrador", "PM", "Miembro"):
        r = Role(name=name, description=f"{name} (seed)")
        db_session.add(r)
        roles[name] = r
    db_session.commit()
    for r in roles.values():
        db_session.refresh(r)
    return roles


@pytest.fixture()
def org_a(db_session):
    from app.models.organization import Organization

    org = Organization(
        name="Tenant A",
        slug="tenant-a",
        is_active=True,
        primary_color="#3B82F6",
        secondary_color="#6366F1",
    )
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


@pytest.fixture()
def org_b(db_session):
    from app.models.organization import Organization

    org = Organization(
        name="Tenant B",
        slug="tenant-b",
        is_active=True,
        primary_color="#10B981",
        secondary_color="#14B8A6",
    )
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


def _create_user(db_session, *, username, email, password, orgs, roles=None, is_superadmin=False):
    from app.models.user import User
    from app.auth.security import hash_password

    user = User(
        username=username,
        email=email,
        full_name=username.replace("_", " ").title(),
        hashed_password=hash_password(password),
        is_active=True,
        is_superadmin=is_superadmin,
    )
    db_session.add(user)
    db_session.flush()
    for o in orgs:
        user.organizations.append(o)
    for r in (roles or []):
        user.roles.append(r)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def user_admin_a(db_session, org_a, seed_roles):
    return _create_user(
        db_session,
        username="admin_a",
        email="admin_a@tenant-a.local",
        password="TenantA-Str0ng-Pass!",
        orgs=[org_a],
        roles=[seed_roles["Administrador"]],
    )


@pytest.fixture()
def user_member_b(db_session, org_b, seed_roles):
    return _create_user(
        db_session,
        username="member_b",
        email="member_b@tenant-b.local",
        password="TenantB-Str0ng-Pass!",
        orgs=[org_b],
        roles=[seed_roles["Miembro"]],
    )


@pytest.fixture()
def superadmin(db_session, seed_roles):
    # Superadmin belongs to no tenant on purpose — platform-level role.
    return _create_user(
        db_session,
        username="root",
        email="root@platform.local",
        password="Platform-Str0ng-Pass!",
        orgs=[],
        is_superadmin=True,
    )


def _login(client, username_or_email, password):
    res = client.post(
        "/api/auth/login",
        json={"username_or_email": username_or_email, "password": password},
    )
    assert res.status_code == 200, res.text
    return res.json()


@pytest.fixture()
def token_admin_a(client, user_admin_a):
    return _login(client, "admin_a", "TenantA-Str0ng-Pass!")["access_token"]


@pytest.fixture()
def token_member_b(client, user_member_b):
    return _login(client, "member_b", "TenantB-Str0ng-Pass!")["access_token"]


@pytest.fixture()
def token_superadmin(client, superadmin):
    return _login(client, "root", "Platform-Str0ng-Pass!")["access_token"]


def auth_headers(token: str, tenant_id: int | None = None) -> dict[str, str]:
    headers = {"Authorization": f"Bearer {token}"}
    if tenant_id is not None:
        headers["X-Tenant-ID"] = str(tenant_id)
    return headers


@pytest.fixture()
def headers_admin_a(token_admin_a, org_a):
    return auth_headers(token_admin_a, org_a.id)


@pytest.fixture()
def headers_member_b(token_member_b, org_b):
    return auth_headers(token_member_b, org_b.id)


@pytest.fixture()
def headers_superadmin(token_superadmin):
    # Superadmin hitting /superadmin/* endpoints does NOT need X-Tenant-ID.
    return auth_headers(token_superadmin, None)
