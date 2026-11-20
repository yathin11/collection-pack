#!/usr/bin/env bash
# Nightly encrypted off-site backup (own server). Cron: 0 2 * * * /opt/collection/scripts/backup.sh
# Needs: pg_dump, age, rclone (remotes "b2" and "gdrive" configured), env: DATABASE_URL AGE_RECIPIENT TG_TOKEN TG_CHAT
set -euo pipefail
tg() { curl -s "https://api.telegram.org/bot$TG_TOKEN/sendMessage" -d chat_id="$TG_CHAT" -d text="$1" >/dev/null; }
trap 'tg "❌ Collection backup FAILED on $(hostname)"' ERR
OUT=/var/backups/collection; mkdir -p "$OUT"
F="$OUT/db-$(date +%F).sql.gz.age"
pg_dump "$DATABASE_URL" --no-owner | gzip | age -r "$AGE_RECIPIENT" > "$F"
rclone copy "$F" b2:collection-backups/
rclone copy "$F" gdrive:collection-backups/
find "$OUT" -name '*.age' -mtime +30 -delete
tg "✅ Collection backup OK $(basename "$F") $(du -h "$F" | cut -f1)"
