from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.routers import health_data, auth, risk, ml, field
from backend.config import settings
from backend.database import engine, SessionLocal, init_db
from backend.models import Base, User
from backend.security import get_password_hash
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def _seed_preset_users() -> None:
    """Ensure the 3 demo logins exist in the DB — only when DEBUG=True."""
    if not settings.DEBUG:
        logger.info("DEBUG=False: skipping demo user seeding (use real credentials in production).")
        return

    PRESET_USERS = [
        {"email": "admin@healthnet.com",  "password": "Admin@123", "role": "admin"},
        {"email": "doctor@healthnet.com", "password": "Doctor@456", "role": "coordinator"},
        {"email": "worker@healthnet.com", "password": "Worker@789", "role": "worker"},
    ]
    db = SessionLocal()
    try:
        for u in PRESET_USERS:
            if not db.query(User).filter(User.email == u["email"]).first():
                db.add(User(
                    email=u["email"],
                    hashed_password=get_password_hash(u["password"]),
                    role=u["role"]
                ))
        db.commit()
        logger.info("Demo preset users seeded successfully.")
    except Exception as exc:
        db.rollback()
        logger.error(f"Error seeding users: {exc}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Run startup tasks then yield."""
    # Warn on insecure default secret key
    if settings.SECRET_KEY == "your-secret-key-change-in-production":
        if not settings.DEBUG:
            raise RuntimeError(
                "SECRET_KEY is set to the default placeholder. "
                "Set a strong SECRET_KEY environment variable before running in production."
            )
        else:
            import secrets
            # In DEBUG mode, generate a temporary random key but warn loudly
            logger.warning(
                "SECRET_KEY is using default placeholder — generated ephemeral key for this session. "
                "Any existing tokens will be invalid after restart. Set SECRET_KEY in .env for persistence."
            )
            settings.SECRET_KEY = secrets.token_hex(32)

    # Create all DB tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ready.")
    # Seed default users (only in DEBUG mode)
    _seed_preset_users()
    yield
    # (shutdown logic here if needed)


app = FastAPI(
    title="Health Intelligence Network API",
    description="Self-improving health intelligence network for rural disease prevention",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
allowed_origins = list(settings.ALLOWED_ORIGINS) + [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,        prefix="/api/v1", tags=["auth"])
app.include_router(health_data.router, prefix="/api/v1", tags=["health-data"])
app.include_router(risk.router,        prefix="/api/v1", tags=["risk"])
app.include_router(ml.router,          prefix="/api/v1/ml", tags=["ml"])
app.include_router(field.router,       prefix="/api/v1", tags=["field"])

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Health Intelligence Network API",
        "version": "1.0.0",
        "status": "operational"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,  # only auto-reload in DEBUG mode
    )
