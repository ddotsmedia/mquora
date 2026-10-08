# mquora Architecture

## Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend API**: NestJS 11, TypeScript, PostgreSQL 16, Prisma 6
- **Background Jobs**: NestJS 11 Worker, Bull queues, Redis 7
- **Database**: PostgreSQL 16 with Prisma 6 ORM
- **Caching/Queues**: Redis 7
- **Package Manager**: pnpm (workspace)
- **Runtime**: Node.js 22 (node:22-alpine)
- **Orchestration**: Docker Compose (dev), Docker + Nginx (prod)

## Ports

**Development**:
- 3000: Next.js web app
- 3100: NestJS API
- 3023: Worker health check
- 5432: PostgreSQL
- 6379: Redis

**Production** (VPS srv988590):
- 80/443: Nginx (exposed)
- 3022: Web container (mapped from 3000)
- 3023: Worker health endpoint
- 3100: API (internal only)
- 5432: PostgreSQL (internal)
- 6379: Redis (internal)

## Monorepo Structure

```
apps/
  web/          Next.js 15 frontend
  api/          NestJS API server
  worker/       NestJS background jobs

packages/
  db/           Prisma client + schema
  types/        Shared TypeScript types
  config/       Configuration management
  ui/           Component library (React)
  ai/           AI/ML utilities
  security/     Auth, encryption, hashing
```

## Module Boundaries

- **@mquora/web**: Internal only, depends on @ui, @types
- **@mquora/api**: REST endpoints, depends on @db, @types, @config, @security
- **@mquora/worker**: Job processing, depends on @db, @types, @config, @ai, @security
- **@mquora/db**: Prisma schema + client, no dependencies
- **@mquora/types**: Shared types only
- **@mquora/config**: Env parsing only
- **@mquora/ui**: React components only, no backend
- **@mquora/ai**: AI logic, no database access
- **@mquora/security**: Auth/crypto, no dependencies

## TypeScript

- Strict mode enforced: no implicit any, unused variables, unreachable code
- Path aliases via tsconfig.json
- Each workspace has own tsconfig extending root

## Database

Prisma 6 client-only setup:
- Schema at `packages/db/prisma/schema.prisma`
- Environment: `DATABASE_URL=postgresql://...`
- Migrations stored in `packages/db/prisma/migrations/`
- Commands: `pnpm run db:push`, `pnpm run db:migrate`, `pnpm run db:studio`

## Docker

**Multi-stage builds** for all apps, reducing image size:
- Builder stage: pnpm install, build
- Runtime stage: only dist + node_modules, non-root user

**Health checks** on all containers:
- Web: `curl http://localhost:3000/`
- API: `curl http://localhost:3100/health`
- Worker: `curl http://localhost:3023/health`
- Postgres: `pg_isready`
- Redis: `redis-cli ping`

**Resource limits** (production):
- Web: 512m limit / 256m reserved
- API: 512m limit / 256m reserved
- Worker: 1g limit / 512m reserved
- Postgres: 2g limit / 1g reserved
- Redis: 256m limit / 128m reserved

## Decisions

1. **Monorepo over multirepo**: Shared code, unified CI/CD, single version source
2. **NestJS for both API and worker**: Reuse modules, consistent DI pattern
3. **Prisma over raw SQL**: Type safety, migrations, visual studio
4. **Next.js standalone mode**: Lightweight Docker images, no need for node_modules
5. **Workspace packages**: Internal npm packages for code reuse without separate repos
6. **Redis + Bull**: Proven queue system, easy scaling
7. **Nginx as reverse proxy**: Load balancing, SSL termination, gzip compression
8. **VPS with Docker Compose**: Lean, cost-effective, all containers on mquora_net

## Deployment

1. Push to main branch
2. CI pipeline: lint → type-check → test → build
3. SSH deploy to VPS: pull, install, docker compose up
4. Health check: verify API endpoint responds
5. Rollback on failure: previous container still running

## Development

```bash
# Setup
pnpm install
pnpm run docker:dev
export $(cat .env | xargs)

# Development
pnpm run dev                # All apps in watch mode
pnpm run lint               # ESLint across workspaces
pnpm run type-check         # TypeScript check
pnpm run build              # All apps

# Database
pnpm run db:migrate         # Run migrations
pnpm run db:studio          # Prisma Studio GUI
```
