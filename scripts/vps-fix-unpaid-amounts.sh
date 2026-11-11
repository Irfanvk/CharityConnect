set -euo pipefail
# Months NOT paid yet (nothing handed in) must show the member's own monthly fee.
# Paid, submitted or rejected payments keep the amount actually paid.
# Modes: preview (read-only) | apply (backup to /root/backups/manual first, one transaction)
MODE="${1:-preview}"
APP="${APP_DIR:-/root/charity-connect-backend}"
BACKUP_DIR="${BACKUP_DIR:-/root/backups/manual}"
PY="${PY:-$APP/venv/bin/python}"
cd "$APP"
mkdir -p "$BACKUP_DIR"
"$PY" - "$MODE" "$BACKUP_DIR/unpaid_amounts_before_$(date +%Y%m%d_%H%M%S).csv" <<'PYEOF'
import csv, sys
from sqlalchemy import text
from app.database import engine

mode, save_to = sys.argv[1], sys.argv[2]
# Same rule as app/services/challan_state.py: monthly, generated or pending, nothing handed in.
UNPAID = """
    c.type::text in ('MONTHLY','monthly')
    and c.status::text in ('GENERATED','generated','PENDING','pending')
    and c.proof_path is null and c.proof_uploaded_at is null and c.bulk_group_id is null
    and coalesce(c.entry_source, '') <> 'admin'
"""
SELECT = f"""
    select c.id, m.member_code, c.month, c.amount, m.monthly_amount
    from challans c join members m on m.id = c.member_id
    where {UNPAID} and coalesce(m.monthly_amount, 0) > 0 and c.amount <> m.monthly_amount
    order by m.member_code, c.month
"""
with engine.connect() as c:
    rows = c.execute(text(SELECT)).fetchall()
members = sorted({r[1] for r in rows})
print("  Months not paid yet with a wrong amount: %d (members affected: %d)" % (len(rows), len(members)))
for r in rows[:12]:
    print("    %s %s: %s -> %s" % (r[1], r[2], r[3], r[4]))
if len(rows) > 12:
    print("    ...")
if mode != "apply" or not rows:
    sys.exit(0)

with engine.begin() as c:  # one transaction
    locked = c.execute(text(SELECT + " for update of c")).fetchall()
    with open(save_to, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["challan_id", "member_code", "month", "old_amount", "new_amount"])
        w.writerows(locked)
    changed = c.execute(text(f"""
        update challans c set amount = m.monthly_amount
        from members m
        where m.id = c.member_id and {UNPAID}
          and coalesce(m.monthly_amount, 0) > 0 and c.amount <> m.monthly_amount
    """)).rowcount
    if changed != len(locked):
        raise SystemExit("  Count mismatch - rolled back, nothing changed.")
    print("  Old amounts saved to %s" % save_to)
    print("  Corrected %d months" % changed)
with engine.connect() as c:
    print("  Check: %d wrong amounts left" % len(c.execute(text(SELECT)).fetchall()))
PYEOF
