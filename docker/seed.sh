#!/bin/bash
# Seed the database inside Docker
# Usage: ./docker/seed.sh         (minimal)
#        ./docker/seed.sh --demo  (full demo data)

set -e

echo "Seeding database..."
docker compose -f docker/docker-compose.yml exec backend python -m app.seed "$@"
echo "Done!"
