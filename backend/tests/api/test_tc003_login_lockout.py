"""TC-003 — Bloqueo de cuenta tras 5 intentos fallidos.

Cubre US001-C. A los 5 intentos fallidos, la cuenta se bloquea 15min y
aun con password correcta devuelve 403 hasta que expire el lockout.
"""
from __future__ import annotations

from datetime import datetime, timedelta


def test_account_locks_after_five_failed_attempts(client, db_session, user_admin_a):
    for i in range(5):
        res = client.post(
            "/api/auth/login",
            json={"username_or_email": "admin_a", "password": "wrong"},
        )
        assert res.status_code == 401, f"attempt {i + 1}"

    db_session.refresh(user_admin_a)
    assert user_admin_a.failed_login_attempts >= 5
    assert user_admin_a.locked_until is not None
    # Lockout window ~15min from now (naive UTC to match the DB column).
    delta = user_admin_a.locked_until - datetime.utcnow()
    # Permit up to 1 minute of test latency slack either side.
    assert timedelta(minutes=14) <= delta <= timedelta(minutes=16)


def test_correct_password_still_403_while_locked(client, db_session, user_admin_a):
    # Force-lock the account.
    user_admin_a.failed_login_attempts = 5
    user_admin_a.locked_until = datetime.utcnow() + timedelta(minutes=15)
    db_session.commit()

    res = client.post(
        "/api/auth/login",
        json={"username_or_email": "admin_a", "password": "TenantA-Str0ng-Pass!"},
    )
    assert res.status_code == 403
    assert "bloqueada" in res.json()["detail"].lower()


def test_expired_lockout_allows_login_again(client, db_session, user_admin_a):
    # Lock expired 1 minute ago.
    user_admin_a.failed_login_attempts = 5
    user_admin_a.locked_until = datetime.utcnow() - timedelta(minutes=1)
    db_session.commit()

    res = client.post(
        "/api/auth/login",
        json={"username_or_email": "admin_a", "password": "TenantA-Str0ng-Pass!"},
    )
    assert res.status_code == 200
    db_session.refresh(user_admin_a)
    assert user_admin_a.failed_login_attempts == 0
    assert user_admin_a.locked_until is None
