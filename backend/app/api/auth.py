from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.models import LoginRequest, Token, User, UserCreate, UserPublic
from app.db.session import get_session

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, session: Session = Depends(get_session)):
    existing_user = session.exec(select(User).where(User.email == user_in.email)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account with that email already exists",
        )

    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        gym_name=user_in.gym_name,
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == login_data.email)).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token = create_access_token(subject=str(user.id))
    return Token(access_token=access_token)


@router.get("/me", response_model=UserPublic)
def get_me(current_user: User = Depends(get_current_user)):
    """Return data of the currently logged gym owner"""
    return current_user