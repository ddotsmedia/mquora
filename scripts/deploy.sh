#!/bin/bash
# Runs on the VPS, invoked by GitHub Actions. Pulls prebuilt images and restarts only askvyo services.
set -euxo pipefail   # -x prints each command before executing (visible in CI log)

cd /opt/askvyo
COMPOSE="docker compose -p askvyo -f docker-compose.prod.yml --env-file .env"

# Env file is copied from the GitHub Actions secret PROD_ENV on each deploy.
cp -f prod.env .env && chmod 600 .env
set -a; . ./.env; set +a

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin >/dev/null

echo "Pulling images for ${IMAGE_TAG}..."
$COMPOSE pull web api worker

echo "Starting database and cache..."
$COMPOSE up -d postgres redis
echo "Waiting for postgres to become healthy..."
for i in $(seq 1 45); do
  if docker inspect --format '{{.State.Health.Status}}' askvyo-postgres-1 2>/dev/null | grep -q healthy; then
    echo "Postgres is healthy after ${i}×2s"
    break
  fi
  sleep 2
done
# Verify postgres is actually accepting connections
docker exec askvyo-postgres-1 pg_isready -q || { echo "ERROR: postgres not ready after 90s"; docker logs --tail 30 askvyo-postgres-1; exit 1; }

# Safety copy of the database before any migration (failure here does not block the deploy).
if [ -x /opt/askvyo/scripts/backup.sh ]; then
  echo "Backing up database before migrations..."
  bash /opt/askvyo/scripts/backup.sh | tail -n 1 || echo "WARNING: pre-deploy backup failed"
fi

# Remove leftover one-off askvyo containers from interrupted runs (askvyo names only).
docker ps -aq --filter 'name=^askvyo-api-run-' | xargs -r docker rm -f >/dev/null || true

echo "Applying database migrations..."
$COMPOSE run -T --rm --no-deps api sh -c 'pnpm --filter @askvyo/db exec prisma migrate deploy --schema=prisma/schema.prisma'

# One-time cutover from the pre-rename "mquora" compose project: remove ONLY its containers
# (label-scoped; volumes and images are kept) so host ports 3022/3024 are free for askvyo.
docker ps -aq --filter 'label=com.docker.compose.project=mquora' | xargs -r docker rm -f >/dev/null || true

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
