import logging
import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    PasswordResetRequest,
    PasswordResetResponse,
    ChangePasswordRequest,
    ChangePasswordResponse,
    AdminResetPasswordResponse,
)
from app.schemas.user import enforce_password_policy
from app.auth.security import (
    verify_password,
    create_access_token,
    hash_password,
    get_current_user,
)
from app.dependencies import get_current_tenant
from app.models.organization import Organization
from app.services.audit import log_action

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, http_request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        or_(User.username == request.username_or_email, User.email == request.username_or_email),
        User.deleted_at.is_(None),
    ).first()

    ip = http_request.client.host if http_request.client else None

    if not user:
        log_action(
            db,
            user_id=None,
            action="login_failed",
            module="auth",
            details={"username_or_email": request.username_or_email, "reason": "unknown_user"},
            ip_address=ip,
        )
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")

    # Check if locked
    if user.locked_until and user.locked_until > datetime.utcnow():
        log_action(
            db,
            user_id=user.id,
            action="login_blocked",
            module="auth",
            details={"reason": "account_locked", "locked_until": user.locked_until.isoformat()},
            ip_address=ip,
        )
        # Also write an audit row per tenant the user belongs to so tenant admins
        # see the attempt in their own audit log.
        for org in user.organizations:
            if org.is_active and org.deleted_at is None:
                log_action(
                    db,
                    user_id=user.id,
                    action="login_blocked",
                    module="auth",
                    organization_id=org.id,
                    ip_address=ip,
                )
        db.commit()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta bloqueada temporalmente")

    if not verify_password(request.password, user.hashed_password):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= 5:
            from datetime import timedelta
            user.locked_until = datetime.utcnow() + timedelta(minutes=15)
        log_action(
            db,
            user_id=user.id,
            action="login_failed",
            module="auth",
            details={"reason": "bad_password", "attempts": user.failed_login_attempts},
            ip_address=ip,
        )
        for org in user.organizations:
            if org.is_active and org.deleted_at is None:
                log_action(
                    db,
                    user_id=user.id,
                    action="login_failed",
                    module="auth",
                    organization_id=org.id,
                    details={"attempts": user.failed_login_attempts},
                    ip_address=ip,
                )
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")

    # Successful login
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()

    # Build org list for JWT and response
    user_orgs = [o for o in user.organizations if o.is_active and o.deleted_at is None]
    org_ids = [o.id for o in user_orgs]

    # Write a login row per tenant so each tenant's audit log surfaces the event.
    log_action(
        db,
        user_id=user.id,
        action="login_success",
        module="auth",
        ip_address=ip,
    )
    for org in user_orgs:
        log_action(
            db,
            user_id=user.id,
            action="login_success",
            module="auth",
            organization_id=org.id,
            ip_address=ip,
        )
    db.commit()

    token = create_access_token(data={
        "sub": str(user.id),
        "org_ids": org_ids,
        "is_superadmin": user.is_superadmin,
    })

    from app.schemas.auth import OrgBrief
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        full_name=user.full_name,
        roles=[r.name for r in user.roles],
        organizations=[OrgBrief.model_validate(o) for o in user_orgs],
        is_superadmin=user.is_superadmin,
    )


@router.post("/password-reset-request", response_model=PasswordResetResponse)
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    """Request a password reset link.

    Always returns success to avoid leaking which emails exist in the system.
    SMTP delivery is not yet implemented; the request is logged so that
    administrators can follow up manually until a mailer is configured.
    """
    user = db.query(User).filter(
        User.email == payload.email,
        User.deleted_at.is_(None),
    ).first()

    if user:
        logger.info(
            "Password reset requested for user_id=%s email=%s",
            user.id,
            user.email,
        )
        # TODO: generate reset token and send email when SMTP is configured.
    else:
        logger.info("Password reset requested for unknown email=%s", payload.email)

    return PasswordResetResponse()


@router.post("/change-password", response_model=ChangePasswordResponse)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Authenticated user changes their own password.

    Requires the current password (so a stolen token alone cannot rotate the
    credential) and enforces the shared password policy on the new value.
    """
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="La contraseña actual no coincide")
    if payload.new_password == payload.current_password:
        raise HTTPException(
            status_code=400,
            detail="La nueva contraseña debe ser distinta de la actual",
        )
    try:
        enforce_password_policy(payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    current_user.hashed_password = hash_password(payload.new_password)
    current_user.failed_login_attempts = 0
    current_user.locked_until = None
    log_action(
        db,
        user_id=current_user.id,
        action="password_change",
        module="auth",
    )
    for org in current_user.organizations:
        if org.is_active and org.deleted_at is None:
            log_action(
                db,
                user_id=current_user.id,
                action="password_change",
                module="auth",
                organization_id=org.id,
            )
    db.commit()
    return ChangePasswordResponse()


@router.post(
    "/users/{user_id}/reset-password",
    response_model=AdminResetPasswordResponse,
    tags=["Users"],
)
def admin_reset_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    """Admin/superadmin resets another user's password to a new random value.

    The plaintext is returned **once** in the response so the admin can hand
    it over through a secure channel. No email is sent — this is the
    offline-friendly substitute for the missing SMTP flow.

    Non-superadmin admins can only reset users that belong to their active
    tenant, enforcing the same multi-tenant isolation as the rest of the app.
    """
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not current_user.is_superadmin:
        user_org_ids = {o.id for o in user.organizations}
        if tenant.id not in user_org_ids:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        # Tenant admins should not reset superadmins
        if user.is_superadmin:
            raise HTTPException(status_code=403, detail="No puedes resetear un super admin")

    new_password = secrets.token_urlsafe(12)  # ~16 chars, satisfies policy
    user.hashed_password = hash_password(new_password)
    user.failed_login_attempts = 0
    user.locked_until = None
    log_action(
        db,
        user_id=current_user.id,
        action="password_reset",
        module="auth",
        record_id=user.id,
        details={"target_user": user.username, "by": current_user.username},
        organization_id=tenant.id if tenant else None,
    )
    # Also platform-level copy so super admin access logs catch resets without tenant dup
    log_action(
        db,
        user_id=current_user.id,
        action="password_reset",
        module="auth",
        record_id=user.id,
        details={"target_user": user.username, "by": current_user.username},
    )
    db.commit()
    return AdminResetPasswordResponse(user_id=user.id, new_password=new_password)
