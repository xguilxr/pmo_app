"""Utility to record audit log entries from any API endpoint."""
import json
from sqlalchemy.orm import Session
from app.models.audit import AuditLog


def log_action(
    db: Session,
    *,
    user_id: int | None,
    action: str,
    module: str,
    record_id: int | None = None,
    details: dict[str, str | int | None] | str | None = None,
    ip_address: str | None = None,
    organization_id: int | None = None,
) -> None:
    """Record an audit entry. Caller is responsible for commit.

    ``organization_id`` is required for tenant-scoped audit trails to surface
    in ``GET /audit-logs`` (which filters by tenant). Pass ``None`` for
    platform-level events not tied to a single tenant.
    """
    detail_str = json.dumps(details, default=str) if isinstance(details, dict) else details
    entry = AuditLog(
        user_id=user_id,
        action=action,
        module=module,
        record_id=record_id,
        details=detail_str,
        ip_address=ip_address,
        organization_id=organization_id,
    )
    db.add(entry)
    # Don't commit here – let the caller's transaction handle it
