import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import engine, Base
from app.api.routes import (
    invoices_router,
    runs_router,
    vendors_router,
    purchase_orders_router,
)

# Structured standard logging for LedgerFlow
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger('ledgerflow')

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup (useful for SQLite / quick start)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="LedgerFlow — Invoice Processing Automation API",
    version="1.0.0",
    description="Deterministic AP decision engine and invoice workflow API for Zamp PS-1.",
    lifespan=lifespan,
)

# CORS setup: support comma-separated origins, localhost, and Vercel domains
configured_origins = [
    origin.strip()
    for origin in settings.frontend_url.split(",")
    if origin.strip()
]
origins = list(dict.fromkeys(configured_origins + [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(invoices_router)
app.include_router(runs_router)
app.include_router(vendors_router)
app.include_router(purchase_orders_router)


@app.get("/")
async def root():
    return {
        "status": "healthy",
        "service": "LedgerFlow API",
        "version": "1.0.0",
        "docs_url": "/docs",
    }


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "LedgerFlow API",
        "version": "1.0.0",
        "storage": settings.storage_backend,
        "llm_primary": settings.llm_primary_model,
        "llm_fallback": settings.llm_fallback_model,
    }
