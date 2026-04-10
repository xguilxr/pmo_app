import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, PasswordResetRequest, PasswordResetResponse
from app.auth.security import verify_password, create_access_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        or_(User.username == request.username_or_email, User.email == request.username_or_email),
        User.deleted_at.is_(None),
    ).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")

    # Check if locked
    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta bloqueada temporalmente")

    if not verify_password(request.password, user.hashed_password):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= 5:
            from datetime import timedelta
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")

    # Successful login
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        full_name=user.full_name,
        roles=[r.name for r in user.roles],
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
