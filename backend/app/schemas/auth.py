from pydantic import BaseModel, EmailStr
from typing import Optional


class LoginRequest(BaseModel):
    username_or_email: str
    password: str


class OrgBrief(BaseModel):
    id: int
    name: str
    slug: Optional[str] = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    full_name: str
    roles: list[str]
    organizations: list[OrgBrief] = []
    is_superadmin: bool = False


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetResponse(BaseModel):
    success: bool = True
    message: str = "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."
