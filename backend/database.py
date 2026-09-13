from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.config import settings
import logging

import os

logger = logging.getLogger(__name__)

# For SQLite, resolve the DB file path relative to this file (backend/).
# This ensures the database is always in the same location regardless of the
# working directory (project root or backend/).
_db_url = settings.DATABASE_URL
if _db_url.startswith("sqlite:///./") or _db_url.startswith("sqlite:///.\\"):
    _db_filename = _db_url.replace("sqlite:///./", "").replace("sqlite:///.\\", "")
    _db_path = os.path.join(os.path.dirname(__file__), _db_filename)
    _db_url = f"sqlite:///{_db_path}"

# Create database engine
engine = create_engine(
    _db_url,
    connect_args={"check_same_thread": False} if "sqlite" in _db_url else {},
    echo=settings.DEBUG,
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency – yields a DB session and ensures it is closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables (kept for backward compatibility)."""
    from backend.models import Base
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as exc:
        logger.error(f"Error creating database tables: {exc}")
        raise
