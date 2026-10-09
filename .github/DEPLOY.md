# Deploying mquora (GitHub Actions only)

Flow: push to `main` → CI type-checks → images build on GitHub → VPS pulls images and restarts `web`, `api`, `worker` → smoke test.
Nothing is built or edited on the VPS.

## Ports (srv1778407; confirm 3024 is free there before the first deploy)
| Service | Host port | Container |
|---|---|---|
| web | 3022 | 3000 |
| worker | none (internal) | 3023 |
| api | 3024 | 3100 |

Postgres and Redis are internal to the `mquora_net` network and are not published.

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
2. Packages → confirm `web`, `api`, `worker` appear under `ddotsmedia/mquora`. If the VPS cannot pull, set `GHCR_PULL_TOKEN`.

## Rollback
Re-run the deploy job of an earlier successful commit (Actions → Re-run) or set `IMAGE_TAG` to that commit's SHA in `PROD_ENV` and run the workflow.

## Not yet done
- Public domain routing for `/api/v1` and the web UI to ports 3022/3024 (reverse proxy on the VPS; `nginx.conf` in the repo is not used by compose).
- `nginx.conf` is kept for reference only.
