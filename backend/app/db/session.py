from collections.abc import Generator
from sqlmodel import Session, SQLModel, create_engine
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, echo=False)

def init_db() -> None:
    """Creates database tables if they don't already exist"""
    SQLModel.metadata.create_all(engine)

def get_session() -> Generator[Session, None, None]:
    """Provides SQLAlchemy session to FastAPI endpoint"""
    with Session(engine) as session:
        yield session

