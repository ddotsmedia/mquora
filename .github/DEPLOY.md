# Deploying askvyo (GitHub Actions only)

Flow: push to `main` → CI type-checks → images build on GitHub → VPS pulls images and restarts `web`, `api`, `worker` → smoke test.
Nothing is built or edited on the VPS.

## Ports (srv1778407; confirm 3024 is free there before the first deploy)
| Service | Host port | Container |
|---|---|---|
| web | 3022 | 3000 |
| worker | none (internal) | 3023 |
| api | 3024 | 3100 |

Postgres and Redis are internal to the `askvyo_net` network and are not published.

## GitHub secrets (Settings → Secrets and variables → Actions)
| Name | Value |
|---|---|
| `VPS_HOST` | IP address of srv1778407 |
| `VPS_USER` | SSH user with docker access |
| `VPS_SSH_KEY` | private key whose public half is in that user's `authorized_keys` |
| `VPS_PORT` | optional, default 22 |
| `PROD_ENV` | full production env file (copy `.env.prod.example`, fill real values) |
| `GHCR_PULL_TOKEN` | optional: classic PAT with `read:packages`; if unset, the job token is used |

Repository variable (Settings → Variables): `NEXT_PUBLIC_API_URL`, the public API URL, baked into the web image at build time.

Environment `production` is referenced by the deploy job; create it to add required reviewers if you want an approval gate.

## One-time checks (in GitHub, not on the VPS)
1. Actions → the workflow runs on `main`. `check` must pass before images build.
2. Packages → confirm `web`, `api`, `worker` appear under `ddotsmedia/askvyo`. If the VPS cannot pull, set `GHCR_PULL_TOKEN`.

## Rollback
Re-run the deploy job of an earlier successful commit (Actions → Re-run) or set `IMAGE_TAG` to that commit's SHA in `PROD_ENV` and run the workflow.

## Edge routing
- Caddy (`deploy/Caddyfile`, in compose) terminates TLS and routes `/api/v1/*` to the API and everything else to the web app.
- `/api/v1/auth/oauth-signin` is blocked at the edge: the web server calls it over the Docker network only.
- `nginx.conf` in the repo is not used by compose and can be deleted.
