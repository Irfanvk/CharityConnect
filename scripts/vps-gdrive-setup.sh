#!/usr/bin/env bash
# Run through Setup-Google-Drive-Backups.cmd (the .ps1 fills in __TOKEN__ with the Google sign-in).
# Sets up the rclone remote "gdrive" with the "drive.file" scope: rclone can only see and change
# files it created itself, never anything else in the Drive. The backups are copied (never synced
# or deleted) into the folder "charity-backups". The backup key is never uploaded.
set -euo pipefail
ROOT=/root/backups

echo "== rclone on the server"
if ! command -v rclone >/dev/null 2>&1; then
  apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq rclone
fi
rclone version 2>/dev/null | sed -n 1p  # sed reads everything (head would cut rclone off)

TOKEN="$(cat <<'TOKEN_EOF'
__TOKEN__
TOKEN_EOF
)"
if grep -qs '^\[gdrive\]' /root/.config/rclone/rclone.conf; then
  rclone config delete gdrive
fi
rclone config create gdrive drive scope drive.file token "$TOKEN" --non-interactive >/dev/null
chmod 600 /root/.config/rclone/rclone.conf 2>/dev/null || true
echo "Google Drive connected (access: only files created by this backup)"

echo "== Nightly scripts: reliable Google Drive check"
for f in "$ROOT/backup_daily.sh" "$ROOT/backup_weekly.sh"; do
  if [ -f "$f" ]; then sed -i "s#rclone listremotes 2>/dev/null | grep -q '^gdrive:\$'#grep -qsF '[gdrive]' /root/.config/rclone/rclone.conf#" "$f"; fi
done
grep -h "gdrive" "$ROOT/backup_daily.sh" 2>/dev/null | sed -n 1p || true

echo "== Weekly settings backup: copy to Google Drive too"
if [ -f "$ROOT/backup_weekly.sh" ] && ! grep -q 'gdrive:charity-backups/weekly' "$ROOT/backup_weekly.sh"; then
  cat >> "$ROOT/backup_weekly.sh" <<'WEEKLY_EOF'
if command -v rclone >/dev/null 2>&1 && grep -qs '^\[gdrive\]' /root/.config/rclone/rclone.conf; then
  if rclone copy "$ROOT/weekly" gdrive:charity-backups/weekly --max-age 15d >> "$ROOT/logs/weekly.log" 2>&1; then
    echo "[$(date '+%F %T')] copied to Google Drive" >> "$ROOT/logs/weekly.log"
  else
    echo "[$(date '+%F %T')] WARNING: copy to Google Drive failed" >> "$ROOT/logs/weekly.log"
  fi
fi
WEEKLY_EOF
  echo "Added"
else
  echo "Already there"
fi

echo "== First copy now"
rclone mkdir gdrive:charity-backups
rclone copy "$ROOT/daily" gdrive:charity-backups/daily
rclone copy "$ROOT/weekly" gdrive:charity-backups/weekly
echo "Files in the Google Drive folder 'charity-backups':"
rclone lsf -R gdrive:charity-backups
echo "DONE"
