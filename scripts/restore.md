# Restoring a backup

Backups are made every night at 02:30 IST by `scripts/backup.sh` into `/var/backups/vasanam` on the server:
`daily/` keeps 14 days, `weekly/` keeps 8 Sundays. Each night writes two files:

- `vasanam-YYYY-MM-DD.dump`: the whole database (accounts, projects, subtitles, keys, subscriptions)
- `files-YYYY-MM-DD.tar.gz`: the server settings (`.env.local`) and uploaded logos

The log of every run is `/var/backups/vasanam/backup.log`.

## Put the database back (same server)

```bash
cd /opt/vasanam
pm2 stop vasanam-web vasanam-worker
set -a && . ./.env.local && set +a
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" /var/backups/vasanam/daily/vasanam-2026-10-22.dump
pm2 start vasanam-web vasanam-worker
```

## A new server

1. Install Node, PostgreSQL, ffmpeg and Caddy as in the README, and deploy the app with `scripts/deploy.sh`.
2. Copy both backup files over and unpack the files backup into `/opt/vasanam`
   (`tar -xzf files-….tar.gz -C /opt/vasanam`): this brings back `.env.local` and the logos.
3. Create the database user and database named in `DATABASE_URL`, then run the `pg_restore` line above.

## Check a backup without touching the live site

```bash
sudo -u postgres createdb vasanam_check
sudo -u postgres pg_restore --no-owner --dbname=vasanam_check < /var/backups/vasanam/daily/vasanam-2026-10-22.dump  # fed in: the file is owner-only
sudo -u postgres psql -d vasanam_check -c "select count(*) from users"
sudo -u postgres dropdb vasanam_check
```
