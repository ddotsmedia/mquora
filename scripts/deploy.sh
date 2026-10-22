#!/bin/bash
# Runs on the VPS, invoked by GitHub Actions. Pulls prebuilt images and restarts only askvyo services.
set -euxo pipefail   # -x prints each command before executing (visible in CI log)

cd /opt/askvyo
COMPOSE="docker compose -p askvyo -f docker-compose.prod.yml --env-file .env"

# Env file is copied from the GitHub Actions secret PROD_ENV on each deploy.
cp -f prod.env .env && chmod 600 .env
set -a; . ./.env; set +a

# GHCR_TOKEN and GITHUB_ACTOR are injected by GitHub Actions via the SSH command line.
# Validate they are present before proceeding.
if [ -z "${GHCR_TOKEN:-}" ]; then
  echo "ERROR: GHCR_TOKEN is not set. Cannot pull images from ghcr.io."
  exit 1
fi
if [ -z "${GITHUB_ACTOR:-}" ]; then
  GITHUB_ACTOR="ddotsmedia"
fi
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin >/dev/null

echo "Cleaning up leftover containers..."
# Stop and remove old mquora containers to free ports 3022/3024 (volumes/data kept)
docker ps -q --filter 'label=com.docker.compose.project=mquora' | xargs -r docker stop >/dev/null 2>&1 || true
docker ps -aq --filter 'label=com.docker.compose.project=mquora' | xargs -r docker rm -f >/dev/null 2>&1 || true
# Clean up any stray askvyo containers from interrupted deploys
docker ps -aq --filter 'name=^askvyo-' --filter 'status=exited' | xargs -r docker rm -f >/dev/null 2>&1 || true

echo "Pulling images for ${IMAGE_TAG}..."

# Pull with retry on transient failures
if ! $COMPOSE pull web api worker; then
  echo "ERROR: Failed to pull images. Check:"
  echo "  - Docker daemon is running"
  echo "  - GHCR credentials are valid (GHCR_TOKEN in .env)"
  echo "  - Network connectivity to ghcr.io"
  exit 1
fi

echo "Starting database and cache..."
$COMPOSE up -d postgres redis
echo "Waiting for postgres to become healthy..."
READY=0
for i in $(seq 1 60); do
  # Check health status from docker inspect
  HEALTH=$(docker inspect --format '{{.State.Health.Status}}' askvyo-postgres-1 2>/dev/null || echo "unknown")
  if [ "$HEALTH" = "healthy" ]; then
    echo "✓ Postgres is healthy after ${i}×2s"
    READY=1
    break
  fi
  # Also try direct pg_isready
  if docker exec askvyo-postgres-1 pg_isready -q 2>/dev/null; then
    echo "✓ Postgres is ready after ${i}×2s (via pg_isready)"
    READY=1
    break
  fi
  printf "."
  sleep 2
done
echo ""

if [ $READY -eq 0 ]; then
  echo "ERROR: Postgres did not become ready after 120 seconds"
  echo "Container status:"
  docker inspect askvyo-postgres-1 --format '{{json .State}}' | python3 -m json.tool 2>/dev/null || true
  echo "Recent logs:"
  docker logs --tail 40 askvyo-postgres-1 || true
  exit 1
fi

# Safety copy of the database before any migration (failure here does not block the deploy).
if [ -x /opt/askvyo/scripts/backup.sh ]; then
  echo "Backing up database before migrations..."
  bash /opt/askvyo/scripts/backup.sh | tail -n 1 || echo "WARNING: pre-deploy backup failed"
fi

echo "Applying database migrations..."
# Give postgres extra time to settle before running migrations
sleep 5

# Resolve any known failed migrations from previous broken deploys.
# prisma migrate resolve --rolled-back marks a failed migration as rolled back
# so migrate deploy can retry it cleanly. Safe: only updates _prisma_migrations tracking table.
# Using hardcoded known failed migration instead of fragile grep parsing of migrate status output.
echo "Resolving known failed migration (20261013000000_add_ban_and_embedding_tables) if present..."
docker compose -p askvyo -f docker-compose.prod.yml --env-file .env run -T --rm --no-deps api \
  sh -c "pnpm --filter @askvyo/db exec prisma migrate resolve --rolled-back '20261013000000_add_ban_and_embedding_tables' --schema=prisma/schema.prisma 2>&1 || true"

# Run migrations with timeout and detailed error reporting
if ! timeout 120 $COMPOSE run -T --rm --no-deps api sh -c 'pnpm --filter @askvyo/db exec prisma migrate deploy --schema=prisma/schema.prisma'; then
  echo "ERROR: Prisma migration failed"
  echo "Postgres status:"
  docker logs --tail 50 askvyo-postgres-1 || true
  exit 1
fi

echo "Ensuring admin user exists..."
$COMPOSE run -T --rm --no-deps api \
  sh -c 'node packages/db/prisma/ensure-admin.mjs' || echo "WARNING: ensure-admin step failed (non-fatal)"

echo "Starting application services..."
$COMPOSE up -d --remove-orphans web api worker

# Optional built-in HTTPS proxy (USE_CADDY=1). On this VPS the host nginx owns 80/443 for other
# live sites, so the domain is served by an nginx site file instead and Caddy stays off.
if [ -n "${PUBLIC_DOMAIN:-}" ] && [ "${USE_CADDY:-0}" = "1" ]; then
  caddy_running=$(docker ps -q --filter 'name=^askvyo-caddy-1$')
  if [ -n "$caddy_running" ]; then
    $COMPOSE --profile proxy up -d caddy
  elif ss -ltnH '( sport = :80 or sport = :443 )' | grep -q .; then
    echo "WARNING: ports 80/443 are used by another service; HTTPS proxy for ${PUBLIC_DOMAIN} NOT started."
    ss -ltnp '( sport = :80 or sport = :443 )' || true
  else
    $COMPOSE --profile proxy up -d caddy
  fi
fi
$COMPOSE --profile proxy ps

# Remove older askvyo image tags only (never system-wide prune: the VPS hosts other projects).
docker image ls --format '{{.Repository}}:{{.Tag}}' \
  | grep "^ghcr.io/${GITHUB_REPOSITORY}/" \
  | grep -v ":${IMAGE_TAG}$" | grep -v ':latest$' \
  | xargs -r docker image rm >/dev/null 2>&1 || true

echo "Deploy complete: ${IMAGE_TAG}"
