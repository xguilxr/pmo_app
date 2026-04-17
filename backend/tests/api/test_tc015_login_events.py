"""TC-015 — GET /api/superadmin/login-events.

Cubre US002-F. Verifica que el superadmin ve los intentos de login
platform-wide, con deduplicación (una fila por login, no una por org).
"""
from __future__ import annotations


def test_login_events_endpoint_responds_200(client, headers_superadmin):
    res = client.get("/api/superadmin/login-events", headers=headers_superadmin)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_login_events_deduplicated_by_tenant(
    client, db_session, user_admin_a, user_member_b, headers_superadmin
):
    """Each login produces exactly one platform row regardless of tenant count."""
    from app.models.audit import AuditLog

    # Wipe preexisting audit rows from the superadmin fixture login.
    db_session.query(AuditLog).delete()
    db_session.commit()

    # Two successful logins and one failed login.
    client.post("/api/auth/login", json={"username_or_email": "admin_a", "password": "TenantA-Str0ng-Pass!"})
    client.post("/api/auth/login", json={"username_or_email": "member_b", "password": "TenantB-Str0ng-Pass!"})
    client.post("/api/auth/login", json={"username_or_email": "admin_a", "password": "wrong"})

    res = client.get("/api/superadmin/login-events", headers=headers_superadmin)
    assert res.status_code == 200
    events = res.json()
    # 2 successful + 1 failed = 3 platform-level rows (dedup across tenants).
    assert len(events) == 3

    actions = {e["action"] for e in events}
    assert actions == {"login_success", "login_failed"}


def test_login_events_requires_superadmin(
    client, user_admin_a, headers_admin_a
):
    res = client.get("/api/superadmin/login-events", headers=headers_admin_a)
    assert res.status_code == 403
