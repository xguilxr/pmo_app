import re

from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime


PASSWORD_POLICY_MSG = (
    "La contraseña debe tener al menos 12 caracteres, una mayúscula y un dígito."
)


def enforce_password_policy(value: str) -> str:
    if len(value) < 12:
        raise ValueError(PASSWORD_POLICY_MSG)
    if not re.search(r"[A-Z]", value):
        raise ValueError(PASSWORD_POLICY_MSG)
    if not re.search(r"\d", value):
        raise ValueError(PASSWORD_POLICY_MSG)
    return value


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str
    role_ids: list[int] = []
    organization_ids: list[int] = []

    @field_validator("password")
    @classmethod
    def _policy(cls, v: str) -> str:
        return enforce_password_policy(v)


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    is_active: bool | None = None
    role_ids: list[int] | None = None
    organization_ids: list[int] | None = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    is_active: bool
    last_login: datetime | None
    roles: list[str]
    organizations: list[str] = []
    created_at: datetime

    model_config = {"from_attributes": True}
