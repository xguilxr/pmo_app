#!/usr/bin/env bash
# ============================================================================
# PMO Platform - Multi-Tenant Deployment Script
#
# Usage:
#   ./deploy.sh              # Full deploy (pull, build, migrate, restart)
#   ./deploy.sh --build-only # Build images without restarting
#   ./deploy.sh --restart    # Restart services only (no rebuild)
#   ./deploy.sh --migrate    # Run DB migrations only
#   ./deploy.sh --seed       # Seed database (minimal roles + admin)
#   ./deploy.sh --seed-demo  # Seed database with demo data
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker/docker-compose.yml"
ENV_FILE="${SCRIPT_DIR}/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log()  { echo -e "${GREEN}[DEPLOY]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
check_prerequisites() {
    log "Checking prerequisites..."

    if ! command -v docker &>/dev/null; then
        err "Docker is not installed"; exit 1
    fi

    if ! docker compose version &>/dev/null; then
        err "Docker Compose v2 is not available"; exit 1
    fi

    if [[ ! -f "$ENV_FILE" ]]; then
        warn ".env file not found — copying from .env.example"
        if [[ -f "${SCRIPT_DIR}/.env.example" ]]; then
            cp "${SCRIPT_DIR}/.env.example" "$ENV_FILE"
        else
            err "No .env or .env.example found. Create .env with required vars."
            exit 1
        fi
    fi

    log "Prerequisites OK"
}

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
build_images() {
    log "Building Docker images..."
    docker compose -f "$COMPOSE_FILE" build --no-cache
    log "Build complete"
}

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
run_migrations() {
    log "Running database schema sync..."
    docker compose -f "$COMPOSE_FILE" exec -T backend \
        python -c "
from app.database import engine, Base
from sqlalchemy import text
import app.models
import os

# Create tables
Base.metadata.create_all(bind=engine)

# Run sync_schema.sql
sql_path = os.path.join(os.path.dirname(os.path.abspath('.')), 'migrations', 'sync_schema.sql')
if not os.path.exists(sql_path):
    sql_path = 'migrations/sync_schema.sql'
if os.path.exists(sql_path):
    with open(sql_path) as f:
        sql = f.read()
    with engine.begin() as conn:
        for stmt in sql.split(';'):
            stmt = stmt.strip()
            if stmt and not stmt.startswith('--'):
                lines = [l for l in stmt.split('\n') if not l.strip().startswith('--')]
                clean = '\n'.join(lines).strip()
                if clean:
                    conn.execute(text(clean))
    print('Schema sync complete')
else:
    print('No sync_schema.sql found, tables created from models')
"
    log "Migrations complete"
}

seed_database() {
    local flag="${1:-}"
    log "Seeding database ${flag}..."
    docker compose -f "$COMPOSE_FILE" exec -T backend \
        python -m app.seed $flag
    log "Seed complete"
}

# ---------------------------------------------------------------------------
# Services
# ---------------------------------------------------------------------------
start_services() {
    log "Starting services..."
    docker compose -f "$COMPOSE_FILE" up -d
    log "Services started"
}

restart_services() {
    log "Restarting services..."
    docker compose -f "$COMPOSE_FILE" restart backend frontend
    log "Services restarted"
}

stop_services() {
    log "Stopping services..."
    docker compose -f "$COMPOSE_FILE" down
    log "Services stopped"
}

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
wait_for_health() {
    log "Waiting for backend health check..."
    local retries=30
    local count=0

    while [[ $count -lt $retries ]]; do
        if docker compose -f "$COMPOSE_FILE" exec -T backend \
            python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/api/health')" 2>/dev/null; then
            log "Backend is healthy!"
            return 0
        fi
        count=$((count + 1))
        sleep 2
    done

    err "Backend did not become healthy after ${retries} attempts"
    return 1
}

# ---------------------------------------------------------------------------
# Full deploy
# ---------------------------------------------------------------------------
full_deploy() {
    log "Starting full deployment..."

    check_prerequisites

    log "Pulling latest code..."
    git pull origin "$(git branch --show-current)" || warn "Git pull failed — using local code"

    build_images
    start_services
    wait_for_health
    run_migrations

    log "========================================"
    log "  Deployment complete!"
    log "  Frontend:  http://localhost"
    log "  Backend:   http://localhost:8080"
    log "  API Docs:  http://localhost:8080/docs"
    log "========================================"
}

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
case "${1:-}" in
    --build-only)
        check_prerequisites
        build_images
        ;;
    --restart)
        restart_services
        wait_for_health
        ;;
    --migrate)
        run_migrations
        ;;
    --seed)
        seed_database ""
        ;;
    --seed-demo)
        seed_database "--demo"
        ;;
    --stop)
        stop_services
        ;;
    --help|-h)
        head -14 "$0" | tail -10
        ;;
    *)
        full_deploy
        ;;
esac
