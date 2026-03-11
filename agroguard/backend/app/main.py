from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.api import auth, health, medicine, scans
from app.core.config import settings
from app.db import base  # noqa: F401
from app.db.base_class import Base
from app.db.session import engine

# For bootstrap only; production should use Alembic migrations.
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.app_name)

if settings.environment == "production":
    app.add_middleware(HTTPSRedirectMiddleware)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(o) for o in settings.backend_cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(scans.router, prefix="/scans", tags=["scans"])
app.include_router(medicine.router, prefix="/medicine", tags=["medicine"])
