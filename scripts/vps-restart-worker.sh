#!/usr/bin/env bash
# Restart the Celery worker so it runs the latest backend code (it sends the push notifications).
set -u
echo "== Restarting the notification worker"
systemctl restart charity-celery.service
sleep 5
systemctl is-active charity-celery.service
echo "== Worker log (last 15 lines)"
journalctl -u charity-celery.service -n 15 --no-pager | cut -c1-200
echo "== Code version on the server"
cd /root/charity-connect-backend && git log --oneline -1
