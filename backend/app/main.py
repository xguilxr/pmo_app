import logging
import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    stream=sys.stdout,
)
# Quieten noisy libraries
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
from app.api import auth, users, projects, dashboard, minutes, risks, issues, changes, documents, lessons, areas, objectives, organizations, tasks, backlog, requests, uploads, programs, exports, reports, notifications, resources, project_statuses, project_closures, dashboard_share, audit, approval_logs, branding, superadmin
from app.middleware.tenant import TenantMiddleware
from app.middleware.logging import RequestLoggingMiddleware
import app.models  # noqa: F401 - register all models with SQLAlchemy mapper

settings = get_settings()

_log = logging.getLogger(__name__)


def _sync_schema_on_startup() -> None:
    """Ensure all model columns/tables exist in the database.

    Uses IF NOT EXISTS so this is safe to run on every startup.
    """
    from app.database import engine, Base
    import app.models  # noqa: ensure all models are registered
    from sqlalchemy import text

    # First, create any missing tables (does NOT add columns to existing tables)
    Base.metadata.create_all(bind=engine)

    # Then, add any missing columns via raw SQL (ALTER TABLE ... ADD COLUMN IF NOT EXISTS)
    sql_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "migrations", "sync_schema.sql")
    if os.path.exists(sql_path):
        with open(sql_path, encoding="utf-8") as f:
            sql = f.read()
        # Execute each statement separately — each in its own transaction
        # so one failure (e.g. column already exists) doesn't abort the rest.
        for stmt in sql.split(";"):
            stmt = stmt.strip()
            if stmt and not stmt.startswith("--"):
                lines = [l for l in stmt.split("\n") if not l.strip().startswith("--")]
                clean = "\n".join(lines).strip()
                if clean:
                    try:
                        with engine.begin() as conn:
                            conn.execute(text(clean))
                    except Exception as exc:
                        _log.warning("sync_schema statement skipped: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _sync_schema_on_startup()
    yield


app = FastAPI(
    title="PMO Platform API",
    version="0.3.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Middleware (order matters — last added runs first):
# 1. CORS  2. RequestLogging  3. TenantResolution
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-Tenant-ID"],
    expose_headers=["X-Tenant-ID"],
)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(TenantMiddleware)

# Routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(minutes.router, prefix="/api")
app.include_router(risks.router, prefix="/api")
app.include_router(issues.router, prefix="/api")
app.include_router(changes.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(lessons.router, prefix="/api")
app.include_router(areas.router, prefix="/api")
app.include_router(objectives.router, prefix="/api")
app.include_router(organizations.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(backlog.router, prefix="/api")
app.include_router(requests.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")
app.include_router(programs.router, prefix="/api")
app.include_router(exports.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(resources.router, prefix="/api")
app.include_router(project_statuses.router, prefix="/api")
app.include_router(project_closures.router, prefix="/api")
app.include_router(dashboard_share.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(approval_logs.router, prefix="/api")
app.include_router(branding.router, prefix="/api")
app.include_router(superadmin.router, prefix="/api")


from fastapi.staticfiles import StaticFiles
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)

# Serve per-tenant static assets (logos, favicons, custom CSS)
tenant_static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "tenants")
os.makedirs(tenant_static_dir, exist_ok=True)
app.mount("/static/tenants", StaticFiles(directory=tenant_static_dir), name="tenant-assets")


@app.get("/api/health")
def health_check() -> dict[str, str]:
    """Public health check — verifies DB connectivity."""
    from app.database import engine
    from sqlalchemy import text
    db_ok = True
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "version": "0.3.0",
        "database": "connected" if db_ok else "unavailable",
    }
