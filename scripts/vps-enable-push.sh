set -euo pipefail
# Turns on web push: new VAPID keys generated on this server, written to .env (backed up first).
cd /root/charity-connect-backend
ENVF=.env
TS=$(date +%Y%m%d_%H%M%S)
env_value() { grep -E "^$1=" "$ENVF" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true; }
set_env() { if grep -qE "^$1=" "$ENVF"; then sed -i "s|^$1=.*|$1=$2|" "$ENVF"; else printf '\n%s=%s\n' "$1" "$2" >> "$ENVF"; fi; }

for k in WEB_PUSH_PUBLIC_KEY WEB_PUSH_PRIVATE_KEY VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY; do
  if [ -n "$(env_value "$k")" ]; then echo "STOP: $k already has a value; not overwriting it. Nothing was changed."; exit 1; fi
done

mkdir -p /root/backups/manual && chmod 700 /root/backups /root/backups/manual
cp "$ENVF" "/root/backups/manual/env_before_push_keys_$TS" && chmod 600 "/root/backups/manual/env_before_push_keys_$TS"
echo "Step 1: .env backed up to /root/backups/manual/env_before_push_keys_$TS"

KEYS=$(venv/bin/python - <<'PYEOF'
import base64
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
k = ec.generate_private_key(ec.SECP256R1())
pem = k.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
pub = k.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
print(base64.urlsafe_b64encode(pub).rstrip(b"=").decode())
print(base64.b64encode(pem).decode())
PYEOF
)
PUB=$(echo "$KEYS" | sed -n 1p); PRIV=$(echo "$KEYS" | sed -n 2p)
[ ${#PUB} -gt 80 ] && [ ${#PRIV} -gt 100 ] || { echo "STOP: key generation failed. Nothing was changed."; exit 1; }
set_env WEB_PUSH_PUBLIC_KEY "$PUB"
set_env WEB_PUSH_PRIVATE_KEY "$PRIV"
SUBJ=$(env_value WEB_PUSH_SUBJECT)
case "$SUBJ" in ""|*example.com*|*localhost*) set_env WEB_PUSH_SUBJECT "https://poyyathabailgcc.com"; SUBJ_NOTE="set to https://poyyathabailgcc.com" ;; *) SUBJ_NOTE="kept as it was" ;; esac
chmod 600 "$ENVF"
unset KEYS PRIV
echo "Step 2: new push keys written to .env (private key never shown); subject $SUBJ_NOTE"

echo "Step 3: restarting the backend and worker (a few seconds of downtime)"
systemctl restart charity.service
systemctl restart charity-celery.service
sleep 12

echo "Step 4: checks"
venv/bin/python -c "
from app.config import settings
print('  Push notifications:', 'ENABLED' if settings.web_push_configured else 'STILL DISABLED')
"
echo "  charity.service: $(systemctl is-active charity.service)   charity-celery.service: $(systemctl is-active charity-celery.service)"
code=$(curl -s -o /tmp/pk.json -w '%{http_code}' http://127.0.0.1:8000/notifications/push/public-key || true)
echo "  /notifications/push/public-key -> HTTP $code, enabled=$(grep -o '"enabled":[a-z]*' /tmp/pk.json 2>/dev/null | cut -d: -f2)"
rm -f /tmp/pk.json
echo "  Worker ping (full answer):"
timeout 25 venv/bin/celery -A app.workers.celery_app:celery inspect ping -t 10 2>&1 | tail -n 4 | sed 's/^/    /' || true
journalctl -u charity.service --since "-20 sec" --no-pager | grep -iE "vapid|push" | tail -n 3 | cut -c1-200 | sed 's/^/  /' || true
