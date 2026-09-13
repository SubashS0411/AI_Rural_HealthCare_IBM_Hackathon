from pydantic_settings import BaseSettings
from typing import List
import os

# Resolve .env relative to this file (backend/.env), not the CWD.
# This ensures the file is found whether uvicorn is launched from the project root
# (python -m uvicorn backend.main:app) or from inside the backend/ directory.
_ENV_FILE = os.path.join(os.path.dirname(__file__), ".env")


class Settings(BaseSettings):
    """Application configuration settings"""
    
    # Application
    APP_NAME: str = "Health Intelligence Network"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str = "sqlite:///./health_intelligence.db"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = _ENV_FILE
        case_sensitive = True


settings = Settings()
