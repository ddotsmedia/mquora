#!/bin/bash
# Standalone VPS diagnostics - run this manually to see what's blocking deploy
set -eu

echo "=== VPS Diagnostics for askvyo deploy ==="
echo "Time: $(date)"
echo ""

echo "=== System resources ==="
df -h / || true
echo ""
free -h || true
echo ""

echo "=== Docker/compose status ==="
docker --version || echo "docker not installed"
docker compose version || echo "docker compose not installed"
echo ""

echo "=== Running containers ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Ports}}" || true
echo ""

echo "=== All project containers (running + stopped) ==="
docker ps -a --filter 'label=com.docker.compose.project=askvyo' --format "table {{.Names}}\t{{.Status}}\t{{.State}}" || true
echo ""

echo "=== Postgres health (askvyo) ==="
if docker inspect askvyo-postgres-1 &>/dev/null; then
  docker inspect --format 'Health: {{.State.Health.Status}}' askvyo-postgres-1
  docker logs --tail 20 askvyo-postgres-1 | head -20
else
  echo "askvyo-postgres-1 container not found"
fi
echo ""

echo "=== Redis status (askvyo) ==="
if docker inspect askvyo-redis-1 &>/dev/null; then
  docker exec askvyo-redis-1 redis-cli ping 2>&1 || echo "(redis not responding)"
else
  echo "askvyo-redis-1 container not found"
fi
echo ""

echo "=== API health (askvyo) ==="
if docker inspect askvyo-api-1 &>/dev/null; then
  docker logs --tail 30 askvyo-api-1 | tail -20
else
  echo "askvyo-api-1 container not found"
fi
echo ""

echo "=== Port bindings ==="
netstat -tlnp 2>/dev/null | grep -E ':(3022|3024|5432|6379)' || \
  ss -tlnp 2>/dev/null | grep -E ':(3022|3024|5432|6379)' || \
  echo "(netstat/ss not available)"
echo ""

echo "=== Old mquora containers (should be removed) ==="
docker ps -a --filter 'label=com.docker.compose.project=mquora' --format "table {{.Names}}\t{{.Status}}" || \
  echo "(no mquora containers found - good)"
echo ""

echo "=== /opt/askvyo directory ==="
ls -la /opt/askvyo/ 2>/dev/null || echo "/opt/askvyo not accessible"
echo ""

echo "=== Recent docker events ==="
docker events --since 5m --until now 2>/dev/null | tail -20 || echo "(no docker events available)"
