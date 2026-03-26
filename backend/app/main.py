from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api import auth, users, projects, dashboard, minutes

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


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "0.2.0"}
