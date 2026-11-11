import uuid
from datetime import datetime, timezone
from pydantic import EmailStr
from sqlmodel import Field, SQLModel

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    hashed_password: str
    gym_name: str = Field(max_length=255)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(SQLModel):
    """Data required during user registration (POST /api/auth/register)"""
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    gym_name: str = Field(min_length=2, max_length=255)

class LoginRequest(SQLModel):
    """Data required during user login (POST /api/auth/login)"""
    email: EmailStr
    password: str

class UserPublic(SQLModel):
    """Data returned by frontend"""
    id: uuid.UUID
    email: EmailStr
    gym_name: str
    is_active: bool
    created_at: datetime

class Token(SQLModel):
    """Response after successful login"""
    access_token: str
    token_type: str = "bearer"