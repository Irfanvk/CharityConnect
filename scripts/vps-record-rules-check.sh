set -uo pipefail
# Read-only, before deploying the record rules: changes nothing.
#  1. Duplicate months: members with two or more live (not rejected) payments for one month.
#     The new database rule is only added when there are none.
#  2. New members waiting for approval: after the deploy they can't log in until an admin
#     approves them (Members page, "New members to approve").
#  3. Backups: is the nightly backup installed, when did it last succeed, is a copy kept off
#     this server (Google Drive)?
APP="${APP_DIR:-/root/charity-connect-backend}"
PY="${PY:-$APP/venv/bin/python}"
ROOT="${BACKUP_ROOT:-/root/backups}"
cd "$APP"
"$PY" - <<'PYEOF'
from sqlalchemy import text
from app.database import engine

with engine.connect() as c:
    print("\n== 1. Two or more live payments for the same member and month")
    rows = c.execute(text("""
        select m.member_code, ch.month, count(*) as n,
               string_agg(ch.id::text || ':' || ch.status::text || coalesce(':' || ch.bulk_group_id, ''), ', '
                          order by ch.id) as payments
        from challans ch join members m on m.id = ch.member_id
        where ch.type::text in ('MONTHLY', 'monthly') and ch.status::text not in ('REJECTED', 'rejected')
        group by m.member_code, ch.month having count(*) > 1
        order by m.member_code, ch.month""")).all()
    if not rows:
        print("   None. The database rule will be added on the next start.")
    else:
        print(f"   {len(rows)} found. The database rule will NOT be added until these are sorted out:")
        for r in rows[:50]:
            print(f"   {r.member_code} {r.month}: {r.n} payments (id:status[:bulk]) {r.payments}")
        if len(rows) > 50:
            print(f"   ... and {len(rows) - 50} more")

    print("\n== 2. New members (joined by invite) not approved yet")
    try:
        rows = c.execute(text("""
            select m.member_code, coalesce(m.full_name, '') as name, m.monthly_amount, m.join_date::date as joined,
                   (select count(*) from challans ch where ch.member_id = m.id
                      and (ch.status::text in ('APPROVED','approved','REJECTED','rejected')
                           or ch.proof_path is not null or ch.bulk_group_id is not null)) as payments
            from members m where m.fee_confirmed = false order by m.join_date""")).all()
    except Exception as exc:  # column added by the previous deploy; should exist
        rows = []
        print(f"   (could not read: {exc.__class__.__name__})")
    if not rows:
        print("   None.")
    else:
        print(f"   {len(rows)} waiting. After the deploy they can't log in until an admin approves them:")
        for r in rows:
            print(f"   {r.member_code} {r.name} - chose Rs {r.monthly_amount:,.0f}, joined {r.joined}, payment records: {r.payments}")
PYEOF

echo
echo "== 3. Backups"
if crontab -l 2>/dev/null | grep -q "backup_daily.sh"; then
  echo "   Nightly backup: installed ($(crontab -l | grep backup_daily.sh | head -n 1))"
else
  echo "   Nightly backup: NOT installed (no backup_daily.sh in the crontab)"
fi
if [ -f "$ROOT/last_ok" ]; then
  echo "   Last good backup: $(cat "$ROOT/last_ok")"
else
  echo "   Last good backup: none recorded ($ROOT/last_ok missing)"
fi
count="$(find "$ROOT/daily" -name 'charity_db_*.sql.gz.enc' 2>/dev/null | wc -l | tr -d ' ')"
echo "   Backup files on this server: ${count:-0}"
if [ -s "$ROOT/.backup_pass" ]; then echo "   Backup key: present"; else echo "   Backup key: MISSING"; fi
if command -v rclone >/dev/null 2>&1 && grep -qs '^\[gdrive\]' /root/.config/rclone/rclone.conf; then
  echo "   Copy off the server: Google Drive (rclone remote 'gdrive') is set up"
  if grep -qs "rclone.conf" "$ROOT/backup_daily.sh"; then
    echo "   Nightly script: uses the Google Drive check"
  else
    echo "   Nightly script: OLD Google Drive check (run Setup-Google-Drive-Backups.cmd again)"
  fi
  last_copy="$(grep -h "Google Drive" "$ROOT"/logs/daily_*.log 2>/dev/null | tail -n 1 || true)"
  echo "   Last nightly copy to Google Drive: ${last_copy:-none yet (the first one runs at 01:30 server time)}"
  if files="$(rclone lsf -R gdrive:charity-backups 2>/dev/null)"; then
    echo "   Files in Google Drive 'charity-backups': $(printf '%s\n' "$files" | grep -c '\.enc$' || true)"
  else
    echo "   Files in Google Drive: could not list (check the Google sign-in)"
  fi
else
  echo "   Copy off the server: NOT set up (if this server is lost, the backups are lost with it)"
fi
exit 0
