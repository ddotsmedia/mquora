#!/bin/bash
set -e

cd /opt/mquora

echo "Logging into GitHub Container Registry..."
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin

echo "Pulling latest images..."
docker compose -f docker-compose.prod.yml pull

echo "Starting services..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

echo "Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy

echo "Checking service status..."
docker compose -f docker-compose.prod.yml ps

echo "✓ Deploy complete"
