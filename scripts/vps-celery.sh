set -euo pipefail
# Celery worker + Redis for Charity Connect (push notifications, live updates).
# Modes: check (read-only) | install | undo
MODE="${1:-check}"
APP=/root/charity-connect-backend
VENV="$APP/venv"
ENVF="$APP/.env"
UNIT=/etc/systemd/system/charity-celery.service
TS=$(date +%Y%m%d_%H%M%S)
cd "$APP"

env_value() { grep -E "^$1=" "$ENVF" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true; }
host_of() { echo "$1" | sed -E 's#^[a-z]+://([^@/]*@)?([^/]*).*#\2#'; }   # strips any password
is_local_redis() { case "$(host_of "$1")" in localhost|localhost:*|127.0.0.1|127.0.0.1:*|"") return 0 ;; *) return 1 ;; esac; }
set_env() {
  if grep -qE "^$1=" "$ENVF"; then sed -i "s|^$1=.*|$1=$2|" "$ENVF"; else printf '\n%s=%s\n' "$1" "$2" >> "$ENVF"; fi
}
queue_lengths() {
  if command -v redis-cli >/dev/null 2>&1 && redis-cli ping >/dev/null 2>&1; then
    echo "  Tasks waiting in queue: notifications=$(redis-cli llen notifications), default=$(redis-cli llen default)"
  fi
}

if [ "$MODE" = "check" ]; then
  . /etc/os-release
  echo "== Server: $PRETTY_NAME"
  free -m | awk 'NR==2{print "  RAM: "$2" MB total, "$7" MB available"}'
  echo "== Backend service (charity.service)"
  echo "  Active: $(systemctl is-active charity.service)  User: $(systemctl show charity.service -p User --value)  Dir: $(systemctl show charity.service -p WorkingDirectory --value)"
  systemctl show charity.service -p ExecStart --value | grep -oE 'argv\[\]=[^;]*' | head -n 1 | sed 's/^/  /' || true
  echo "== Redis"
  if command -v redis-server >/dev/null 2>&1; then
    echo "  Installed: $(redis-server --version | awk '{print $3}')  Active: $(systemctl is-active redis-server 2>/dev/null || true)  Ping: $(redis-cli ping 2>/dev/null || echo no-answer)"
    ss -ltn '( sport = :6379 )' | awk 'NR>1{print "  Listening on: "$4}' || true
  else
    echo "  Not installed"
  fi
  queue_lengths
  echo "== Celery"
  echo "  Package: $("$VENV/bin/celery" --version 2>/dev/null || echo missing)"
  systemctl list-units --all --no-legend 2>/dev/null | grep -i celery | sed 's/^/  Unit: /' || echo "  No Celery service on this server"
  echo "== .env settings (values hidden)"
  for k in REDIS_URL CELERY_BROKER_URL CELERY_RESULT_BACKEND CELERY_WORKERS_ENABLED; do
    v=$(env_value "$k")
    if [ -n "$v" ]; then
      case "$k" in CELERY_WORKERS_ENABLED) echo "  $k=$v" ;; *) echo "  $k -> host $(host_of "$v")" ;; esac
    else echo "  $k not set"; fi
  done
  for k in VAPID_PRIVATE_KEY WEB_PUSH_PRIVATE_KEY; do
    v=$(env_value "$k")
    [ -z "$v" ] && continue
    case "$v" in
      *.pem) if [ -f "$v" ] || [ -f "$APP/$v" ]; then echo "  $k: key file found"; else echo "  $k: key FILE MISSING ($v) - push notifications cannot be sent"; fi ;;
      *) echo "  $k: set (inline key)" ;;
    esac
  done
  echo "== Backend log, last 2 hours (push / redis / celery lines)"
  journalctl -u charity.service --since "2 hours ago" --no-pager 2>/dev/null | grep -iE "push|vapid|redis|celery" | tail -n 12 | cut -c1-220 || true
  exit 0
fi

if [ "$MODE" = "install" ]; then
  mkdir -p /root/backups/manual && chmod 700 /root/backups /root/backups/manual
  cp "$ENVF" "/root/backups/manual/env_before_celery_$TS" && chmod 600 "/root/backups/manual/env_before_celery_$TS"
  echo "  .env backed up to /root/backups/manual/env_before_celery_$TS"

  for k in REDIS_URL CELERY_BROKER_URL; do
    v=$(env_value "$k")
    if [ -n "$v" ] && ! is_local_redis "$v"; then
      echo "  STOP: $k points to another server ($(host_of "$v")). Nothing was changed."; exit 1
    fi
  done

  echo "Step A: Redis (local only)"
  if ! command -v redis-server >/dev/null 2>&1; then
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq redis-server >/dev/null
    echo "  Installed redis-server"
  fi
  systemctl enable --now redis-server >/dev/null 2>&1
  for i in $(seq 1 10); do redis-cli ping >/dev/null 2>&1 && break; sleep 1; done
  redis-cli ping | grep -q PONG || { echo "  STOP: Redis did not start."; exit 1; }
  if ss -ltn '( sport = :6379 )' | awk 'NR>1{print $4}' | grep -vqE '^(127\.0\.0\.1|\[::1\]):6379$'; then
    echo "  STOP: Redis is listening on a public address. Stopping it for safety."; systemctl stop redis-server; exit 1
  fi
  echo "  Redis running, reachable only from this server"

  echo "Step B: settings in .env"
  if [ -z "$(env_value REDIS_URL)" ]; then set_env REDIS_URL "redis://127.0.0.1:6379/0"; fi
  set_env CELERY_WORKERS_ENABLED true
  echo "  REDIS_URL set, CELERY_WORKERS_ENABLED=true"

  echo "Step C: Celery worker service"
  SVC_USER=$(systemctl show charity.service -p User --value); SVC_USER=${SVC_USER:-root}
  cat > "$UNIT" <<UNITEOF
[Unit]
Description=Charity Connect Celery worker (push notifications)
After=network.target redis-server.service
Requires=redis-server.service
# Restarting the backend (every deploy) restarts the worker too, so both run the same code.
PartOf=charity.service

[Service]
Type=simple
User=$SVC_USER
WorkingDirectory=$APP
ExecStart=$VENV/bin/celery -A app.workers.celery_app:celery worker -Q notifications,default --concurrency=2 --loglevel=INFO
Restart=always
RestartSec=5
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target charity.service
UNITEOF
  systemctl daemon-reload
  systemctl enable charity-celery.service >/dev/null 2>&1
  echo "  Created and enabled charity-celery.service (no beat: reminders run inside the backend)"

  echo "Step D: restart backend + start worker (a few seconds of downtime)"
  systemctl restart charity.service
  systemctl restart charity-celery.service
  sleep 10

  echo "Step E: checks"
  echo "  charity.service: $(systemctl is-active charity.service)   charity-celery.service: $(systemctl is-active charity-celery.service)"
  if "$VENV/bin/celery" -A app.workers.celery_app:celery inspect ping -t 10 2>/dev/null | grep -q pong; then
    echo "  Worker answers: pong"
  else
    echo "  WARNING: worker did not answer yet. Recent worker log:"
  fi
  journalctl -u charity-celery.service -n 8 --no-pager | cut -c1-200
  queue_lengths
  exit 0
fi

if [ "$MODE" = "undo" ]; then
  cp "$ENVF" "/root/backups/manual/env_before_celery_undo_$TS" 2>/dev/null || true
  systemctl disable --now charity-celery.service >/dev/null 2>&1 || true
  rm -f "$UNIT"; systemctl daemon-reload
  set_env CELERY_WORKERS_ENABLED false
  set_env CELERY_BROKER_URL ""   # every code version then sends pushes directly again
  systemctl restart charity.service
  sleep 5
  echo "  Worker removed; backend sends notifications directly again. charity.service: $(systemctl is-active charity.service)"
  echo "  (Redis is left running; it is harmless and only reachable from this server.)"
  exit 0
fi

echo "Unknown mode: $MODE"; exit 1
