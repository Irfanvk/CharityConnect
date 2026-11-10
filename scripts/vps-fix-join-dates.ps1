# ONE-OFF, already applied to the live database on 2026-11-10 (204 members). Kept for reference; re-running changes nothing.
# Live database: move members whose joining date is 1 Jan 2024 to 1 Aug 2024.
#
#   Step 1  backup on the VPS: full database dump to /root/backups/manual/
#           (if pg_dump is missing or fails: a full copy of the members table instead)
#   Step 2  count only, changes nothing; also checks if the DB user can create tables
#   Step 3  asks you to type YES
#   Step 4  saves the old dates, changes them in ONE transaction, re-counts
#
# Steps 1+2 are one SSH login and step 4 is another, so you type the VPS password twice.
# It uses the backend's own database connection on the VPS; the database password is never shown.

$ErrorActionPreference = "Stop"
$Server = "root@187.124.20.219"

$remote = @'
set -euo pipefail
MODE="$1"
cd /root/charity-connect-backend
PY=/root/charity-connect-backend/venv/bin/python
mkdir -p /root/backups/manual
chmod 700 /root/backups /root/backups/manual
TS=$(date +%Y%m%d_%H%M%S)

if [ "$MODE" = "check" ]; then
  echo "Step 1 of 4: backup"
  DUMP=/root/backups/manual/charity_db_before_joindate_fix_${TS}.sql.gz
  DUMPED=no
  if command -v pg_dump >/dev/null 2>&1; then
    URL=$("$PY" -c "import re; from app.config import settings; print(re.sub(r'^postgresql\+\w+://', 'postgresql://', settings.DATABASE_URL))")
    if pg_dump "$URL" | gzip > "$DUMP" && [ -s "$DUMP" ] && zcat "$DUMP" | grep -q "PostgreSQL database dump complete"; then
      chmod 600 "$DUMP"
      echo "  Full database backup: $DUMP ($(du -h "$DUMP" | cut -f1))"
      DUMPED=yes
    else
      rm -f "$DUMP"
      echo "  pg_dump did not finish, so saving the members table instead."
    fi
  else
    echo "  pg_dump is not installed, so saving the members table instead."
  fi
  if [ "$DUMPED" = "no" ]; then
    "$PY" - "/root/backups/manual/members_full_before_joindate_fix_${TS}.csv" <<'PYEOF'
import csv, sys
from sqlalchemy import text
from app.database import engine
path = sys.argv[1]
with engine.connect() as c:
    result = c.execute(text("select * from members order by id"))
    rows = result.fetchall()
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(result.keys())
        w.writerows(rows)
print("  Members table backup: %s (%d rows)" % (path, len(rows)))
PYEOF
    chmod 600 /root/backups/manual/members_full_before_joindate_fix_${TS}.csv
  fi
  echo ""
  echo "Step 2 of 4: counting (nothing is changed)"
fi

"$PY" - "$MODE" "/root/backups/manual/members_join_date_before_fix_${TS}.csv" <<'PYEOF'
import csv, sys
from sqlalchemy import text
from app.database import engine

mode, save_to = sys.argv[1], sys.argv[2]
WHERE = "join_date >= '2024-01-01' AND join_date < '2024-01-02'"

with engine.connect() as c:
    db, user = c.execute(text("select current_database(), current_user")).fetchone()
    total = c.execute(text("select count(*) from members")).scalar()
    n = c.execute(text("select count(*) from members where " + WHERE)).scalar()
    print("  Database %s (user %s): %d members, %d with joining date 1 Jan 2024" % (db, user, total, n))
    if mode == "check":
        can_create = c.execute(text("select has_schema_privilege(current_user, 'public', 'CREATE')")).scalar()
        print("  Can the app create new tables: %s" % ("YES" if can_create else "NO"))

if mode == "apply":
    with engine.begin() as c:  # one transaction: all or nothing
        rows = c.execute(text("select id, member_code, join_date from members where " + WHERE + " order by id for update")).fetchall()
        with open(save_to, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["id", "member_code", "join_date"])
            w.writerows(rows)
        changed = c.execute(text(
            "update members set join_date = join_date + (timestamp '2024-08-01' - timestamp '2024-01-01') where " + WHERE
        )).rowcount
        if changed != len(rows):
            raise SystemExit("  Count mismatch - rolled back, nothing changed.")
        print("  Old dates saved to %s" % save_to)
        print("  Changed %d members to 1 Aug 2024" % changed)
    with engine.connect() as c:
        left = c.execute(text("select count(*) from members where " + WHERE)).scalar()
        moved = c.execute(text("select count(*) from members where join_date >= '2024-08-01' and join_date < '2024-08-02'")).scalar()
        print("  Check: %d left on 1 Jan 2024, %d now on 1 Aug 2024" % (left, moved))
PYEOF
'@
# Windows line endings would break bash on the server. PowerShell also adds a
# Windows line break after the piped text, so end with "exit 0" + newline: bash
# stops there and never reads that stray character.
$remote = ($remote -replace "`r`n", "`n") + "`nexit 0`n"

function Invoke-Remote([string]$mode) {
    $remote | ssh $Server "bash -s -- $mode"
    if ($LASTEXITCODE -ne 0) { throw "The server step '$mode' failed (see above). Nothing was changed by this step." }
}

Write-Host ""
Invoke-Remote "check"

Write-Host ""
$answer = Read-Host "Step 3 of 4: type YES to change these members to 1 Aug 2024 (anything else cancels)"
if ($answer -cne "YES") {
    Write-Host "Cancelled. Nothing was changed." -ForegroundColor Yellow
    exit 0
}

Write-Host "`nStep 4 of 4: changing the dates..." -ForegroundColor Cyan
Invoke-Remote "apply"
Write-Host "`nDone." -ForegroundColor Green
