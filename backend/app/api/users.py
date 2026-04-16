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
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado")
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso")

    # Non-superadmins may only create users in their active tenant
    if not current_user.is_superadmin:
        requested_orgs = set(data.organization_ids or [])
        if requested_orgs and requested_orgs != {tenant.id}:
            raise HTTPException(
                status_code=403,
                detail="Solo puedes asignar usuarios a tu organizacion activa",
            )

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

    org_ids = data.organization_ids or [tenant.id]
    orgs = db.query(Organization).filter(Organization.id.in_(org_ids)).all()
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


def _get_user_for_tenant(db: Session, user_id: int, tenant: Organization, actor: User) -> User:
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if actor.is_superadmin:
        return user
    if tenant.id not in {o.id for o in user.organizations}:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    user = _get_user_for_tenant(db, user_id, tenant, current_user)

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
            if not current_user.is_superadmin:
                # Non-superadmins may only touch their active tenant membership,
                # and must not remove the user from it or add new orgs.
                if set(org_ids) != {tenant.id}:
                    raise HTTPException(
                        status_code=403,
                        detail="Solo puedes modificar la membresia en tu organizacion activa",
                    )
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
    tenant: Organization = Depends(get_current_tenant),
):
    from datetime import datetime, timezone
    user = _get_user_for_tenant(db, user_id, tenant, current_user)
    user.deleted_at = datetime.now(timezone.utc)
    db.commit()


@router.get("/roles", response_model=list[dict[str, int | str | None]])
def list_roles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[dict[str, int | str | None]]:
    roles = db.query(Role).all()
    return [{"id": r.id, "name": r.name, "description": r.description} for r in roles]
