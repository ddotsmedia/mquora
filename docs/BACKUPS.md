# Database backups

- **Daily** at 02:10 Dubai time, GitHub Actions ("Database backup" workflow) dumps the database on the VPS.
- **Before every deploy**, `deploy.sh` takes a safety dump before migrations.
- **On the server**: `/opt/mquora/backups/`, last 14 days.
- **Off the server**: an encrypted copy is saved as a workflow artifact for 30 days — only when the
  `BACKUP_PASSPHRASE` repository secret is set (the repo is public, so copies are always encrypted).

## Restore

Off-server copy: download the artifact from the workflow run, unzip, then:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in mquora-XXXX.sql.gz.enc -out mquora.sql.gz
```

On the VPS (replaces current data — take a fresh backup first):

```bash
cd /opt/mquora && set -a && . ./.env && set +a
gunzip -c backups/mquora-XXXX.sql.gz | docker compose -p mquora -f docker-compose.prod.yml --env-file .env exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```
