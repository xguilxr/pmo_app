from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api import auth, users, projects, dashboard, minutes, risks, issues, changes, documents, lessons, areas, objectives, organizations, tasks, backlog, requests, uploads, programs, exports, reports
import app.models  # noqa: F401 — register all models with SQLAlchemy mapper

settings = get_settings()

app = FastAPI(
    title="PMO Platform API",
    version="0.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


from fastapi.staticfiles import StaticFiles
import os
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)


@app.on_event("startup")
def sync_schema_on_startup():
    """Ensure all model columns/tables exist in the database.

    Uses IF NOT EXISTS so this is safe to run on every startup.
    """
    from app.database import engine, Base
    import app.models  # noqa: ensure all models are registered
    from sqlalchemy import text
    import os

    # First, create any missing tables (does NOT add columns to existing tables)
    Base.metadata.create_all(bind=engine)

    # Then, add any missing columns via raw SQL (ALTER TABLE ... ADD COLUMN IF NOT EXISTS)
    sql_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "migrations", "sync_schema.sql")
    if os.path.exists(sql_path):
        with open(sql_path) as f:
            sql = f.read()
        # Execute each statement separately (skip comments and empty lines)
        with engine.begin() as conn:
            for stmt in sql.split(";"):
                stmt = stmt.strip()
                if stmt and not stmt.startswith("--"):
                    # Remove leading comment lines from each statement
                    lines = [l for l in stmt.split("\n") if not l.strip().startswith("--")]
                    clean = "\n".join(lines).strip()
                    if clean:
                        conn.execute(text(clean))


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "0.2.0"}
