"""TC-001 — Login exitoso.

Cubre US001-A. Verifica que el login:
- Devuelve token válido + payload.
- Actualiza last_login.
- Escribe filas en audit_log (una plataforma + una por org).
"""
from __future__ import annotations

from datetime import datetime


def test_login_success_returns_token_and_updates_last_login(
    client, db_session, user_admin_a
):
    res = client.post(
        "/api/auth/login",
        json={"username_or_email": "admin_a", "password": "TenantA-Str0ng-Pass!"},
    )
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["access_token"]
    assert data["user_id"] == user_admin_a.id
    assert data["full_name"] == user_admin_a.full_name
    assert data["is_superadmin"] is False
    assert len(data["organizations"]) == 1
    assert "Administrador" in data["roles"]

    db_session.refresh(user_admin_a)
    assert user_admin_a.last_login is not None
    assert isinstance(user_admin_a.last_login, datetime)
    assert user_admin_a.failed_login_attempts == 0


def test_login_writes_audit_rows(client, db_session, user_admin_a, org_a):
    """One platform-level row (organization_id=NULL) + one per tenant org."""
    from app.models.audit import AuditLog

    res = client.post(
        "/api/auth/login",
        json={"username_or_email": "admin_a", "password": "TenantA-Str0ng-Pass!"},
    )
    assert res.status_code == 200

    rows = (
        db_session.query(AuditLog)
        .filter(AuditLog.user_id == user_admin_a.id, AuditLog.action == "login_success")
        .all()
    )
    # 1 platform row + 1 org row for admin_a's single org
    assert len(rows) == 2
    platform_rows = [r for r in rows if r.organization_id is None]
    tenant_rows = [r for r in rows if r.organization_id == org_a.id]
    assert len(platform_rows) == 1
    assert len(tenant_rows) == 1
    assert tenant_rows[0].module == "auth"


def test_login_wrong_password_increments_attempts(client, db_session, user_admin_a):
    for _ in range(3):
        res = client.post(
            "/api/auth/login",
            json={"username_or_email": "admin_a", "password": "wrong"},
        )
        assert res.status_code == 401

    db_session.refresh(user_admin_a)
    assert user_admin_a.failed_login_attempts == 3
    assert user_admin_a.locked_until is None


def test_login_unknown_user_returns_401_and_logs(client, db_session):
    from app.models.audit import AuditLog

    res = client.post(
        "/api/auth/login",
        json={"username_or_email": "nobody", "password": "whatever"},
    )
    assert res.status_code == 401

    unknown_rows = (
        db_session.query(AuditLog)
        .filter(AuditLog.action == "login_failed", AuditLog.user_id.is_(None))
        .all()
    )
    assert len(unknown_rows) >= 1
