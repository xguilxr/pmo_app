from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str
    role_ids: list[int] = []


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    is_active: bool | None = None
    role_ids: list[int] | None = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    is_active: bool
    last_login: datetime | None
    roles: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}
