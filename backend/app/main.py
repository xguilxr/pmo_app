import logging
import os
import re
import sys
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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


_ADD_COLUMN_RE = re.compile(
    r"^\s*ALTER\s+TABLE\s+(?P<table>\w+)\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+"
    r"(?P<column>\w+)\s+(?P<rest>.+)$",
    re.IGNORECASE | re.DOTALL,
)


def _sync_schema_on_startup() -> None:
    """Ensure all model columns/tables exist in the database.

    MySQL gained ``ADD COLUMN IF NOT EXISTS`` in 8.0.29 — HostGator shared
    still runs older builds, so we pre-check ``information_schema.COLUMNS``
    and only issue the ALTER when the column is actually missing.
    """
    from app.database import engine, Base
    import app.models  # noqa: ensure all models are registered
    from sqlalchemy import text

    Base.metadata.create_all(bind=engine)

    sql_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "migrations", "sync_schema.sql")
    if not os.path.exists(sql_path):
        return

    with open(sql_path, encoding="utf-8") as f:
        sql = f.read()

    for stmt in sql.split(";"):
        lines = [l for l in stmt.split("\n") if not l.strip().startswith("--")]
        clean = "\n".join(lines).strip()
        if not clean:
            continue

        match = _ADD_COLUMN_RE.match(clean)
        if match:
            table = match.group("table")
            column = match.group("column")
            rest = match.group("rest").strip().rstrip(";")
            try:
                with engine.begin() as conn:
                    exists = conn.execute(
                        text(
                            "SELECT 1 FROM information_schema.COLUMNS "
                            "WHERE TABLE_SCHEMA = DATABASE() "
                            "AND TABLE_NAME = :t AND COLUMN_NAME = :c"
                        ),
                        {"t": table, "c": column},
                    ).first()
                    if exists:
                        continue
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {rest}"))
            except Exception as exc:
                _log.warning("sync_schema ADD COLUMN %s.%s skipped: %s", table, column, exc)
            continue

        try:
            with engine.begin() as conn:
                conn.execute(text(clean))
        except Exception as exc:
            _log.warning("sync_schema statement skipped: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
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
from starlette.exceptions import HTTPException as StarletteHTTPException
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)

# Serve per-tenant static assets (logos, favicons, custom CSS)
tenant_static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "tenants")
os.makedirs(tenant_static_dir, exist_ok=True)
app.mount("/static/tenants", StaticFiles(directory=tenant_static_dir), name="tenant-assets")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Log full traceback for any uncaught error and return a debuggable JSON body."""
    tb = traceback.format_exc()
    _log.error("UNHANDLED %s %s: %s\n%s", request.method, request.url.path, exc, tb)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error_type": exc.__class__.__name__,
            "error_message": str(exc),
            "path": request.url.path,
        },
    )


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


# Optional: serve the built SPA from backend/static_frontend if present.
# Build the frontend with `VITE_API_URL=/api` and copy frontend/dist/* into
# backend/static_frontend/ so the same uvicorn serves UI and API on one host.
class _SPAStaticFiles(StaticFiles):
    async def get_response(self, path, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code == 404:
                return await super().get_response("index.html", scope)
            raise


_spa_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static_frontend")
if os.path.isdir(_spa_dir) and os.path.isfile(os.path.join(_spa_dir, "index.html")):
    app.mount("/", _SPAStaticFiles(directory=_spa_dir, html=True), name="spa")
    _log.info("Mounted SPA from %s", _spa_dir)
