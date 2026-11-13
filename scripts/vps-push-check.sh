set -uo pipefail
# Read-only: changes nothing.
cd /root/charity-connect-backend
echo "== Push notifications, as the backend sees them"
venv/bin/python - <<'PYEOF'
from sqlalchemy import text
from app.config import settings
from app.database import engine
pub = bool((settings.WEB_PUSH_PUBLIC_KEY or "").strip())
try:
    priv = bool(settings.web_push_private_key_value)
except Exception as exc:
    priv = False
    print("  Private key could not be read:", type(exc).__name__)
print("  Public key set: %s | Private key usable: %s | Subject set: %s" % (pub, priv, bool(settings.WEB_PUSH_SUBJECT)))
print("  => Push notifications %s" % ("ENABLED" if settings.web_push_configured else "DISABLED (no usable keys)"))
print("  Celery workers enabled: %s" % getattr(settings, "CELERY_WORKERS_ENABLED", "(setting not in this code version)"))
with engine.connect() as c:
    try:
        row = c.execute(text(
            "select count(*) filter (where is_active), count(*), max(last_success_at), max(last_failure_at) from push_subscriptions"
        )).fetchone()
        print("  Phones/browsers subscribed: %s active of %s | last success: %s | last failure: %s" % tuple(row))
        reason = c.execute(text(
            "select last_failure_reason from push_subscriptions where last_failure_reason is not null order by last_failure_at desc limit 1"
        )).scalar()
        if reason:
            print("  Last failure reason:", str(reason)[:160])
    except Exception as exc:
        print("  push_subscriptions not readable:", type(exc).__name__)
PYEOF
echo "== Where push keys are configured (names only)"
grep -nE '^\s*(export\s+)?(VAPID|WEB_PUSH)_[A-Z_]*\s*=' .env | sed -E 's/=.*/=<hidden>/' | sed 's/^/  .env line /' || echo "  none in .env"
systemctl show charity.service -p Environment --value | tr ' ' '\n' | grep -E '^(VAPID|WEB_PUSH)_' | sed -E 's/=.*/=<hidden>/' | sed 's/^/  systemd: /' || true
ls -1 *.pem 2>/dev/null | sed 's/^/  key file in app folder: /' || true
echo "== Worker"
echo "  charity-celery.service: $(systemctl is-active charity-celery.service)"
ping_out=$(venv/bin/celery -A app.workers.celery_app:celery inspect ping -t 10 2>&1)
if echo "$ping_out" | grep -q pong; then echo "  Worker answers: pong"; else echo "  Ping got no reply (not an error by itself): $(echo "$ping_out" | tail -n 1 | cut -c1-160)"; fi
echo "  Tasks the worker finished in the last hour: $(journalctl -u charity-celery.service --since '1 hour ago' --no-pager | grep -c 'succeeded in' || true)"
echo "  Task errors in the last hour: $(journalctl -u charity-celery.service --since '1 hour ago' --no-pager | grep -cE 'raised unexpected|ERROR/' || true)"
echo "  Tasks waiting: notifications=$(redis-cli llen notifications), default=$(redis-cli llen default)"
echo "== Backend log since the restart"
since=$(systemctl show charity.service -p ActiveEnterTimestamp --value)
echo "  Redis connection errors: $(journalctl -u charity.service --since "$since" --no-pager | grep -c 'Connect call failed' || true)"
journalctl -u charity.service --since "$since" --no-pager | grep -iE "vapid|web push is disabled|push delivery failed" | tail -n 5 | cut -c1-200 | sed 's/^/  /' || true
