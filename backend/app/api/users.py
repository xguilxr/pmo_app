from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, user_organizations
from app.models.role import Role
from app.models.organization import Organization
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.auth.security import hash_password, get_current_user
from app.dependencies import get_current_tenant

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    # Only show users that belong to the current tenant organization
    users = (
        db.query(User)
        .join(user_organizations)
        .filter(
            user_organizations.c.organization_id == tenant.id,
            User.deleted_at.is_(None),
        )
        .all()
    )
    return [
        UserResponse(
            id=u.id, username=u.username, email=u.email, full_name=u.full_name,
            is_active=u.is_active, last_login=u.last_login,
            roles=[r.name for r in u.roles],
            organizations=[o.name for o in u.organizations],
            created_at=u.created_at,
        )
        for u in users
    ]


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado")
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso")

    user = User(
        username=data.username,
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        created_by_id=current_user.id,
    )

    if data.role_ids:
        roles = db.query(Role).filter(Role.id.in_(data.role_ids)).all()
        user.roles = roles

    if data.organization_ids:
        orgs = db.query(Organization).filter(Organization.id.in_(data.organization_ids)).all()
        user.organizations = orgs

    db.add(user)
    db.commit()
    db.refresh(user)

    return UserResponse(
        id=user.id, username=user.username, email=user.email, full_name=user.full_name,
        is_active=user.is_active, last_login=user.last_login,
        roles=[r.name for r in user.roles],
        organizations=[o.name for o in user.organizations],
        created_at=user.created_at,
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id, username=current_user.username, email=current_user.email,
        full_name=current_user.full_name, is_active=current_user.is_active,
        last_login=current_user.last_login, roles=[r.name for r in current_user.roles],
        organizations=[o.name for o in current_user.organizations],
        created_at=current_user.created_at,
    )


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    update_data = data.model_dump(exclude_unset=True)

    # Handle role_ids separately
    if "role_ids" in update_data:
        role_ids = update_data.pop("role_ids")
        if role_ids is not None:
            roles = db.query(Role).filter(Role.id.in_(role_ids)).all()
            user.roles = roles

    # Handle organization_ids separately
    if "organization_ids" in update_data:
        org_ids = update_data.pop("organization_ids")
        if org_ids is not None:
            orgs = db.query(Organization).filter(Organization.id.in_(org_ids)).all()
            user.organizations = orgs

    # Handle remaining scalar fields
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    return UserResponse(
        id=user.id, username=user.username, email=user.email, full_name=user.full_name,
        is_active=user.is_active, last_login=user.last_login,
        roles=[r.name for r in user.roles],
        organizations=[o.name for o in user.organizations],
        created_at=user.created_at,
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import datetime, timezone
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.deleted_at = datetime.now(timezone.utc)
    db.commit()


@router.get("/roles", response_model=list[dict])
def list_roles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    roles = db.query(Role).all()
    return [{"id": r.id, "name": r.name, "description": r.description} for r in roles]
