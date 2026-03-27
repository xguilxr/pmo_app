from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.auth.security import verify_password, create_access_token, get_current_user

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
    print(f"[AUTH] Login success for user {user.id} ({user.username}). Token prefix: {token[:20]}...")
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        full_name=user.full_name,
        roles=[r.name for r in user.roles],
    )


@router.get("/debug-token")
def debug_token(request: Request):
    """Debug endpoint to check what Authorization header the backend receives."""
    auth_header = request.headers.get("Authorization", "MISSING")
    return {
        "authorization_header": auth_header[:50] + "..." if len(auth_header) > 50 else auth_header,
        "has_bearer": auth_header.startswith("Bearer ") if auth_header != "MISSING" else False,
        "token_length": len(auth_header.split(" ", 1)[1]) if auth_header.startswith("Bearer ") else 0,
    }


@router.get("/verify")
def verify_token(current_user: User = Depends(get_current_user)):
    """Test endpoint that requires auth — returns user info if token is valid."""
    return {"ok": True, "user_id": current_user.id, "username": current_user.username}
