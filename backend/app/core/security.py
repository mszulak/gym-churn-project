from datetime import datetime, timedelta, timezone
import jwt
from pwdlib import PasswordHash
from app.core.config import settings

password_hash = PasswordHash.recommended()

def get_password_hash(password: str) -> str:
    """Transforms plain password into safe hash for database"""
    return password_hash.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies if entered password matches hash from database"""
    return password_hash.verify(plain_password, hashed_password)

def create_access_token(subject: str) -> str:
    """Created signed JWT token containing user ID in `sub` field"""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

