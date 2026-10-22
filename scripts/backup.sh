#!/bin/bash
# Nightly backup on the server (cron): the database, the uploaded logos and the server's settings (.env.local).
# Uploaded videos and MP4 exports are not backed up: they are deleted after 7 days anyway and can be uploaded again.
# Keeps 14 daily and 8 weekly (Sunday) copies in /var/backups/vasanam; each dump is read back to check it is whole.
#   Install:  crontab -e  →  30 21 * * * /opt/vasanam/scripts/backup.sh >> /var/backups/vasanam/backup.log 2>&1
#   Restore:  see scripts/restore.md
set -euo pipefail
APP=/opt/vasanam
OUT=/var/backups/vasanam
DAY=$(date -u +%F)
umask 077 # backups hold every account and the server's secrets: owner-only

mkdir -p "$OUT/daily" "$OUT/weekly"
DATABASE_URL=$(grep -E '^DATABASE_URL=' "$APP/.env.local" | cut -d= -f2-)

DUMP="$OUT/daily/vasanam-$DAY.dump"
pg_dump --format=custom --no-owner --dbname="$DATABASE_URL" --file="$DUMP.part"
pg_restore --list "$DUMP.part" > /dev/null # a dump that can't be listed is broken: fail loudly, keep yesterday's
mv "$DUMP.part" "$DUMP"
tar -czf "$OUT/daily/files-$DAY.tar.gz" -C "$APP" .env.local storage/logos

# Sunday's copy is also kept as a weekly one.
if [ "$(date -u +%u)" = 7 ]; then cp "$DUMP" "$OUT/weekly/"; cp "$OUT/daily/files-$DAY.tar.gz" "$OUT/weekly/"; fi

find "$OUT/daily" -type f -mtime +13 -delete
find "$OUT/weekly" -type f -mtime +55 -delete
echo "$(date -u +'%F %T') ok $(du -h "$DUMP" | cut -f1) $(ls "$OUT/daily" | grep -c '\.dump$') daily, $(ls "$OUT/weekly" | grep -c '\.dump$') weekly"
