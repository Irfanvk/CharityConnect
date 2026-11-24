#!/usr/bin/env bash
# Installs automatic backups on the server (run through Install-VPS-Backups.cmd).
#  - nightly 01:30 server time: database backup, encrypted, checked, kept 30 days
#  - Sunday 03:00: settings backup (.env, service and nginx files), kept 8 weeks
#  - creates the backup key /root/backups/.backup_pass if there is none (never replaces it)
# Safe to run again: it only updates the two scripts and the two cron lines.
# The placeholder in the backup_daily.sh block is filled with scripts/vps-backup-daily.sh by the .ps1.
set -euo pipefail

ROOT=/root/backups
echo "== Tools"
if ! command -v pg_dump >/dev/null 2>&1; then
  apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql-client
fi
command -v openssl >/dev/null 2>&1 || { apt-get update -qq && apt-get install -y -qq openssl; }
pg_dump --version

mkdir -p "$ROOT/daily" "$ROOT/weekly" "$ROOT/logs"
chmod 700 "$ROOT" "$ROOT/daily" "$ROOT/weekly" "$ROOT/logs"
if [ ! -s "$ROOT/.backup_pass" ]; then
  openssl rand -base64 48 > "$ROOT/.backup_pass"
  echo "Created a new backup key: $ROOT/.backup_pass"
else
  echo "Keeping the existing backup key"
fi
chmod 600 "$ROOT/.backup_pass"

cat > "$ROOT/backup_daily.sh" <<'DAILY_EOF'
__DAILY_SCRIPT__
DAILY_EOF
chmod 700 "$ROOT/backup_daily.sh"

cat > "$ROOT/backup_weekly.sh" <<'WEEKLY_EOF'
#!/usr/bin/env bash
# Weekly settings backup: .env, the service file and nginx sites, encrypted, kept 8 weeks.
set -euo pipefail
ROOT=/root/backups
TS="$(date +%F_%H-%M-%S)"
ARCHIVE="$(mktemp)"
trap 'rm -f "$ARCHIVE"' EXIT
tar -czf "$ARCHIVE" /root/charity-connect-backend/.env /etc/systemd/system/charity*.service \
  /etc/nginx/sites-available /etc/nginx/sites-enabled 2>/dev/null || true
openssl enc -aes-256-cbc -pbkdf2 -salt -pass "file:$ROOT/.backup_pass" -in "$ARCHIVE" \
  -out "$ROOT/weekly/charity_settings_${TS}.tar.gz.enc"
find "$ROOT/weekly" -name 'charity_settings_*.enc' -mtime +56 -delete
echo "[$(date '+%F %T')] weekly settings backup OK" >> "$ROOT/logs/weekly.log"
if command -v rclone >/dev/null 2>&1 && grep -qs '^\[gdrive\]' /root/.config/rclone/rclone.conf; then
  if rclone copy "$ROOT/weekly" gdrive:charity-backups/weekly --max-age 15d >> "$ROOT/logs/weekly.log" 2>&1; then
    echo "[$(date '+%F %T')] copied to Google Drive" >> "$ROOT/logs/weekly.log"
  else
    echo "[$(date '+%F %T')] WARNING: copy to Google Drive failed" >> "$ROOT/logs/weekly.log"
  fi
fi
WEEKLY_EOF
chmod 700 "$ROOT/backup_weekly.sh"

echo "== Schedule"
( crontab -l 2>/dev/null | grep -v 'backup_daily.sh' | grep -v 'backup_weekly.sh' || true
  echo "30 1 * * * $ROOT/backup_daily.sh >/dev/null 2>&1"
  echo "0 3 * * 0 $ROOT/backup_weekly.sh >/dev/null 2>&1" ) | crontab -
crontab -l | grep backup_

echo "== First backup now"
"$ROOT/backup_daily.sh"
"$ROOT/backup_weekly.sh"
echo "== Result"
cat "$ROOT/last_ok"
ls -lh "$ROOT/daily" | tail -n 3
echo "Server time now: $(date)"
echo "DONE"
