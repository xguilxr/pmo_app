from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api import auth, users, projects, dashboard, minutes, risks, issues, changes, documents, lessons, areas, objectives, organizations, tasks, backlog, requests, uploads
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


from fastapi.staticfiles import StaticFiles
import os
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "0.2.0"}
