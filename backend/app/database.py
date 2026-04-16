from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session

from app.config import get_settings

settings = get_settings()

_engine_kwargs: dict[str, int | bool] = {
    "pool_size": settings.database_pool_size,
    "pool_pre_ping": True,
}

# MySQL requires specific settings for utf8mb4 and proper charset handling
if settings.database_url.startswith("mysql"):
    _engine_kwargs["pool_recycle"] = 3600  # Reconnect after 1 hour (MySQL wait_timeout)

engine = create_engine(settings.database_url, **_engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
