param(
    [string]$HostName = "187.124.20.219",
    [string]$User = "root"
)

$ErrorActionPreference = "Stop"

$remoteScript = @'
set -euo pipefail

apt update
apt install -y postgresql-client gzip tar openssl rclone

mkdir -p /root/backups/daily /root/backups/weekly /root/backups/logs
chmod 700 /root/backups /root/backups/daily /root/backups/weekly /root/backups/logs

if [ ! -f /root/backups/.backup_pass ]; then
  openssl rand -base64 48 > /root/backups/.backup_pass
  chmod 600 /root/backups/.backup_pass
fi

cat > /root/backups/backup_daily.sh << "EOF"
#!/usr/bin/env bash
set -euo pipefail

TS="$(date +%F_%H-%M-%S)"
TMP="/tmp/charity_db_${TS}.sql"
GZ="/tmp/charity_db_${TS}.sql.gz"
ENC="/root/backups/daily/charity_db_${TS}.sql.gz.enc"
LOG="/root/backups/logs/daily_${TS}.log"

set -a
source /root/charity-connect-backend/.env
set +a

{
  echo "[$(date)] Daily backup started"

  if [ -n "${DATABASE_URL:-}" ]; then
    pg_dump "$DATABASE_URL" > "$TMP"
  else
    : "${POSTGRES_DB:?POSTGRES_DB missing}"
    : "${POSTGRES_USER:?POSTGRES_USER missing}"
    : "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD missing}"
    : "${POSTGRES_HOST:=127.0.0.1}"
    : "${POSTGRES_PORT:=5432}"
    export PGPASSWORD="$POSTGRES_PASSWORD"
    pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" "$POSTGRES_DB" > "$TMP"
  fi

  gzip -9 "$TMP"
  mv "${TMP}.gz" "$GZ"

  openssl enc -aes-256-cbc -pbkdf2 -salt \
    -pass file:/root/backups/.backup_pass \
    -in "$GZ" -out "$ENC"

  rm -f "$GZ"

  ls -1t /root/backups/daily/*.enc 2>/dev/null | tail -n +15 | xargs -r rm -f

  if rclone listremotes | grep -q "^gdrive:$"; then
    rclone copy /root/backups/daily gdrive:charity-backups/daily --transfers 2
  fi

  echo "[$(date)] Daily backup completed"
} >> "$LOG" 2>&1
EOF

chmod 700 /root/backups/backup_daily.sh

cat > /root/backups/backup_weekly.sh << "EOF"
#!/usr/bin/env bash
set -euo pipefail

TS="$(date +%F_%H-%M-%S)"
ARCHIVE="/tmp/charity_weekly_${TS}.tar.gz"
ENC="/root/backups/weekly/charity_weekly_${TS}.tar.gz.enc"
LOG="/root/backups/logs/weekly_${TS}.log"

{
  echo "[$(date)] Weekly backup started"

  tar -czf "$ARCHIVE" \
    /root/charity-connect-backend/.env \
    /etc/systemd/system/charity.service \
    /etc/nginx/sites-available \
    /etc/nginx/sites-enabled \
    /root/charity-connect-backend/app \
    /root/charity-connect-backend/migrations \
    /root/charity-connect-backend/requirements.txt \
    2>/dev/null || true

  openssl enc -aes-256-cbc -pbkdf2 -salt \
    -pass file:/root/backups/.backup_pass \
    -in "$ARCHIVE" -out "$ENC"

  rm -f "$ARCHIVE"

  ls -1t /root/backups/weekly/*.enc 2>/dev/null | tail -n +9 | xargs -r rm -f

  if rclone listremotes | grep -q "^gdrive:$"; then
    rclone copy /root/backups/weekly gdrive:charity-backups/weekly --transfers 2
  fi

  echo "[$(date)] Weekly backup completed"
} >> "$LOG" 2>&1
EOF

chmod 700 /root/backups/backup_weekly.sh

# Cron schedule
( crontab -l 2>/dev/null | grep -v "backup_daily.sh\|backup_weekly.sh"; \
  echo "0 2 * * * /root/backups/backup_daily.sh"; \
  echo "0 3 * * 0 /root/backups/backup_weekly.sh" ) | crontab -

# First run sanity test
/root/backups/backup_daily.sh

echo "Setup complete"
crontab -l | grep backup_
ls -lh /root/backups/daily | tail -n 5
'@

$remoteScript | ssh "$User@$HostName" "bash -s"

Write-Host ""
Write-Host "Done. Automatic backups are now enabled on the VPS." -ForegroundColor Green
Write-Host "Daily: 2:00 AM, Weekly: Sunday 3:00 AM" -ForegroundColor Green
Write-Host ""
Write-Host "Optional next step (offsite free backup): run 'ssh $User@$HostName ""rclone config""' once and set remote name to gdrive." -ForegroundColor Yellow
