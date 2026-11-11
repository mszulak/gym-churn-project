import uuid
from datetime import datetime, timezone
from pydantic import EmailStr
from sqlmodel import Field, SQLModel
from sqlalchemy import Column, JSON
from typing import Any

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

class AnalysisJob(SQLModel, table=True):
    __tablename__ = "analysis_jobs"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    filename: str = Field(max_length=255)
    file_path: str = Field(max_length=512)

    status: str = Field(default="COMPLETED", max_length=50)
    rows_count: int = Field(default=0)
    high_risk_count: int = Field(default=0)
    avg_churn_probability: float = Field(default=0.0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClientPrediction(SQLModel, table=True):
    __tablename__ = "client_predictions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    job_id: uuid.UUID = Field(foreign_key="analysis_jobs.id", index=True)
    client_index: int
    churn_probability: float = Field(index=True)

    uncertainty_low: float | None = Field(default=None)
    uncertainty_high: float | None = Field(default=None)
    predicted_days_to_churn: int | None = Field(default=None)

    raw_features: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))

class AnalysisJobPublic(SQLModel):
    """Shortcut analysis information"""
    id: uuid.UUID
    filename: str
    status: str
    rows_count: int
    high_risk_count: int
    avg_churn_probability: float
    created_at: datetime


class ClientPredictionPublic(SQLModel):
    """Single client prediction"""
    id: uuid.UUID
    client_index: int
    churn_probability: float
    uncertainty_low: float | None
    uncertainty_high: float | None
    predicted_days_to_churn: int | None
    raw_features: dict[str, Any]


class AnalysisJobDetail(AnalysisJobPublic):
    """Full view of analysis with list of high risk clients"""
    predictions: list[ClientPredictionPublic]
