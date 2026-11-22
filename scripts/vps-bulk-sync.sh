set -euo pipefail
# Bulk payments (several months, one proof) whose months were approved one by one, so the
# bulk payment itself still says "waiting": no receipt, and "Approve all" is offered again.
# Modes: preview (read-only) | apply (backup CSV first, one transaction).
# Only groups whose months are ALL approved are fixed; mixed ones are listed for a decision.
MODE="${1:-preview}"
APP="${APP_DIR:-/root/charity-connect-backend}"
PY="${PY:-$APP/venv/bin/python}"
BACKUP_DIR="${BACKUP_DIR:-/root/backups/manual}"
cd "$APP"
mkdir -p "$BACKUP_DIR"
"$PY" - "$MODE" "$BACKUP_DIR/bulk_sync_before_$(date +%Y%m%d_%H%M%S).csv" <<'PYEOF'
import csv, sys
from app.database import SessionLocal
import app.services  # noqa: F401 (load order)
from app.models.models import BulkChallanGroup, Challan, ChallanStatus, Member, User

mode, save_to = sys.argv[1], sys.argv[2]
db = SessionLocal()
APPROVED = ChallanStatus.APPROVED


def code(user_id):
    if not user_id:
        return "-"
    m = db.query(Member.member_code).filter(Member.user_id == user_id).scalar()
    u = db.query(User.username).filter(User.id == user_id).scalar()
    return f"{u or user_id}" + (f" ({m})" if m else "")


def months_received(months):
    """What was received for the whole bulk payment: the months' received amounts added up
    (None when a month has none recorded)."""
    values = [c.received_amount for c in months]
    return None if any(v is None for v in values) else round(sum(float(v) for v in values), 2)


fix, mixed, odd, amounts = [], [], [], []
for g in db.query(BulkChallanGroup).order_by(BulkChallanGroup.id).all():
    months = db.query(Challan).filter(Challan.bulk_group_id == g.bulk_group_id).order_by(Challan.month).all()
    if not months:
        continue
    states = [getattr(c.status, "value", c.status) for c in months]
    member = db.query(Member).filter(Member.id == g.member_id).first()
    label = f"{g.challan_no or '-'} / {g.bulk_group_id} {member.member_code if member else '?'} " \
            f"{months[0].month}..{months[-1].month} ({len(months)} months) Rs {sum(float(c.amount or 0) for c in months):,.0f}"
    if g.status == "pending_approval" and all(s == "approved" for s in states):
        last = max(months, key=lambda c: c.approved_at or c.created_at)
        approvers = sorted({code(c.approved_by_admin_id) for c in months})
        fix.append((g, months, last, f"{label}  approved one by one by {', '.join(approvers)}"))
    elif g.status == "pending_approval" and "approved" in states:
        mixed.append(f"{label}  months: " + ", ".join(f"{c.month}={s}" for c, s in zip(months, states)))
    elif (g.status == "approved" and all(s == "approved" for s in states) and g.received_amount is not None
          and abs(float(g.received_amount) - (months_received(months) or 0)) >= 0.005):
        # An earlier run of this script gave the bulk payment ONE month's received amount
        # (e.g. Rs 500 of Rs 2,000), so its receipt showed the wrong amount.
        total = months_received(months)
        amounts.append((g, total, f"{label}  received amount Rs {float(g.received_amount):,.0f} -> "
                                  + (f"Rs {total:,.0f}" if total is not None else "(not recorded)")))
    elif g.status == "approved" and any(s != "approved" for s in states):
        odd.append(f"{label}  bulk says approved but months: " + ", ".join(f"{c.month}={s}" for c, s in zip(months, states)))

print(f"\n  Bulk payments to mark approved (every month already approved): {len(fix)}")
for _, _, _, text in fix:
    print("    " + text)
print(f"\n  Bulk payments showing only one month's received amount (wrong on the receipt): {len(amounts)}")
for _, _, text in amounts:
    print("    " + text)
print(f"\n  Part approved, part not (NOT changed, tell Claude what to do): {len(mixed)}")
for text in mixed:
    print("    " + text)
print(f"\n  Bulk approved but a month is not (NOT changed): {len(odd)}")
for text in odd:
    print("    " + text)
if mode != "apply":
    db.rollback()
    sys.exit(0)
if not fix and not amounts:
    print("\n  Nothing to change.")
    sys.exit(0)

with open(save_to, "w", newline="", encoding="utf-8") as fh:
    w = csv.writer(fh)
    w.writerow(["bulk_group_id", "challan_no", "status", "approved_by_admin_id", "approved_at", "received_amount"])
    for g in [f[0] for f in fix] + [a[0] for a in amounts]:
        w.writerow([g.bulk_group_id, g.challan_no, g.status, g.approved_by_admin_id, g.approved_at, g.received_amount])
print(f"\n  Backup of the old values: {save_to}")

from app.utils.audit import log_audit
for g, months, last, _ in fix:
    g.status = "approved"
    g.approved_by_admin_id = last.approved_by_admin_id
    g.approved_at = last.approved_at
    for field in ("received_on", "transaction_ref", "payment_method", "verification_note"):
        if hasattr(g, field) and getattr(g, field, None) in (None, "") and getattr(last, field, None) not in (None, ""):
            setattr(g, field, getattr(last, field))
    if g.received_amount is None:
        g.received_amount = months_received(months)  # the whole payment, not one month
    log_audit(db, user_id=None, action="bulk_status_synced", entity_type="BulkChallanGroup", entity_id=g.id,
              old_values={"status": "pending_approval"},
              new_values={"status": "approved", "reason": "every month was already approved one by one",
                          "approved_by_admin_id": g.approved_by_admin_id}, auto_commit=False)
for g, total, _ in amounts:
    old = g.received_amount
    g.received_amount = total
    log_audit(db, user_id=None, action="bulk_received_amount_fixed", entity_type="BulkChallanGroup", entity_id=g.id,
              old_values={"received_amount": old},
              new_values={"received_amount": total, "reason": "was one month's amount; now the months added up"},
              auto_commit=False)
db.commit()
if fix:
    print(f"  Done: {len(fix)} bulk payment(s) marked approved. Their receipts now open, and 'Approve all' is gone.")
if amounts:
    print(f"  Done: {len(amounts)} bulk payment(s) now show the full received amount on the receipt.")
PYEOF
