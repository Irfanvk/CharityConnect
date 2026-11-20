#!/usr/bin/env bash
# Nightly database backup (installed on the server as /root/backups/backup_daily.sh).
#  1. pg_dump of the live database (address read from the backend's .env)
#  2. compressed and encrypted with the key in /root/backups/.backup_pass
#  3. checked: it is decrypted and unpacked again, and the main tables must be in it
#  4. kept for 30 days; copied to Google Drive too when an rclone remote "gdrive" exists
# The last good backup is written to /root/backups/last_ok. Override APP_DIR / BACKUP_ROOT
# / KEEP_DAYS to test it elsewhere.
set -euo pipefail

APP_DIR="${APP_DIR:-/root/charity-connect-backend}"
ROOT="${BACKUP_ROOT:-/root/backups}"
KEEP_DAYS="${KEEP_DAYS:-30}"
PASS_FILE="$ROOT/.backup_pass"
mkdir -p "$ROOT/daily" "$ROOT/logs"
TS="$(date +%F_%H-%M-%S)"
LOG="$ROOT/logs/daily_${TS}.log"
OUT="$ROOT/daily/charity_db_${TS}.sql.gz.enc"

log() { echo "[$(date '+%F %T')] $*" | tee -a "$LOG"; }

# The database address, without SQLAlchemy's driver part (postgresql+psycopg2:// -> postgresql://)
url="$(grep -E '^DATABASE_URL=' "$APP_DIR/.env" | tail -n 1 | cut -d= -f2- \
  | sed -e "s/^[\"']//" -e "s/[\"']\$//" -e 's#^postgres\(ql\)\{0,1\}+[A-Za-z0-9]*://#postgresql://#' -e 's#^postgres://#postgresql://#')"
if [ -z "$url" ]; then log "FAILED: DATABASE_URL not found in $APP_DIR/.env"; exit 1; fi
if [ ! -s "$PASS_FILE" ]; then log "FAILED: the backup key $PASS_FILE is missing"; exit 1; fi

tmp="$(mktemp "$ROOT/daily/.incomplete.XXXXXX")"
trap 'rm -f "$tmp"' EXIT

log "Backup started"
pg_dump --no-owner --no-privileges "$url" | gzip -9 \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass "file:$PASS_FILE" -out "$tmp"

# Check the file can be read back and holds the main tables.
found="$(openssl enc -d -aes-256-cbc -pbkdf2 -pass "file:$PASS_FILE" -in "$tmp" | gunzip \
  | grep -cE '^(CREATE TABLE|COPY) public\.(challans|members|users) ' || true)"
if [ "${found:-0}" -lt 6 ]; then
  log "FAILED: the backup could not be read back properly (found $found of 6 table parts)"
  exit 1
fi

mv "$tmp" "$OUT"
trap - EXIT
size="$(du -h "$OUT" | cut -f1)"

find "$ROOT/daily" -name 'charity_db_*.sql.gz.enc' -mtime +"$KEEP_DAYS" -delete
find "$ROOT/logs" -name '*.log' -mtime +90 -delete
kept="$(find "$ROOT/daily" -name 'charity_db_*.sql.gz.enc' | wc -l | tr -d ' ')"
echo "$(date '+%F %T') OK $(basename "$OUT") $size" > "$ROOT/last_ok"
log "OK: $(basename "$OUT") ($size, checked). Backups kept: $kept"

if command -v rclone >/dev/null 2>&1 && rclone listremotes 2>/dev/null | grep -q '^gdrive:$'; then
  if rclone copy "$ROOT/daily" gdrive:charity-backups/daily --max-age 3d >> "$LOG" 2>&1; then
    log "Copied to Google Drive"
  else
    log "WARNING: copy to Google Drive failed (the backup on the server is fine)"
  fi
fi
