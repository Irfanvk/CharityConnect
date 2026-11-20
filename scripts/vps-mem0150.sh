set -euo pipefail
# MEM-0150 (confirmed by the committee 2026-11-20): not a monthly member for now; his Rs 50,000
# is a one-time contribution to the General Fund campaign, kept as a payment to be made
# (approved later when the proof is uploaded).
# Modes: preview (read-only) | apply (backup CSV first, one transaction).
# Needs the backend version with "monthly member" (deploy first).
MODE="${1:-preview}"
APP="${APP_DIR:-/root/charity-connect-backend}"
PY="${PY:-$APP/venv/bin/python}"
BACKUP_DIR="${BACKUP_DIR:-/root/backups/manual}"
cd "$APP"
mkdir -p "$BACKUP_DIR"
"$PY" - "$MODE" "$BACKUP_DIR/mem0150_before_$(date +%Y%m%d_%H%M%S).csv" <<'PYEOF'
import csv, sys
from datetime import date
from sqlalchemy import inspect, or_
from app.database import SessionLocal, engine
from app.models.models import Campaign, Challan, ChallanStatus, ChallanType, Member, MemberFee
from app.services.challan_state import unpaid_monthly_clause

mode, save_to = sys.argv[1], sys.argv[2]
CODE, AMOUNT = "MEM-0150", 50000.0
if "monthly_member" not in {c["name"] for c in inspect(engine).get_columns("members")}:
    raise SystemExit("  The server does not have the new backend yet (monthly member). Deploy first, then run this again.")
db = SessionLocal()
m = db.query(Member).filter(Member.member_code == CODE).one_or_none()
if m is None:
    raise SystemExit(f"  {CODE} not found - nothing changed.")
unpaid = db.query(Challan).filter(Challan.member_id == m.id, unpaid_monthly_clause()).all()
paid_monthly = db.query(Challan).filter(Challan.member_id == m.id, Challan.type == ChallanType.MONTHLY,
                                        Challan.status == ChallanStatus.APPROVED).count()
fees = db.query(MemberFee).filter(MemberFee.member_id == m.id).count()
matches = db.query(Campaign).filter(or_(Campaign.title.ilike("%general%"), Campaign.title.ilike("%one%time%"))).all()
print(f"\n  {CODE}: monthly fee now Rs {m.monthly_amount:,.0f}, monthly member: {m.monthly_member}")
print(f"  Monthly months paid: {paid_monthly} (these stay)   'Not paid yet' monthly rows: {len(unpaid)}   fee history rows: {fees}")
print("  Campaigns named General / One time:")
for c in matches:
    print(f"    id {c.id}: {c.title} ({'active' if c.is_active else 'closed'})")
if len(matches) != 1:
    print("  STOP: expected exactly one such campaign. All campaigns:")
    for c in db.query(Campaign).order_by(Campaign.id).all():
        print(f"    id {c.id}: {c.title} ({'active' if c.is_active else 'closed'})")
    raise SystemExit("  Nothing changed. Tell Claude which campaign to use.")
camp = matches[0]
existing = db.query(Challan).filter(Challan.member_id == m.id, Challan.type == ChallanType.CAMPAIGN,
                                    Challan.campaign_id == camp.id, Challan.status != ChallanStatus.REJECTED).all()
print(f"  Existing payments of {CODE} to this campaign: {len(existing)}"
      + "".join(f"\n    {c.challan_no or 'CH-%s' % c.id}: Rs {c.amount:,.0f} {c.status.value}" for c in existing))
print("\n  WILL DO:")
print(f"    1. {CODE} becomes 'not a monthly member': fee Rs 0, no month owed;"
      f" remove {len(unpaid)} 'not paid yet' monthly rows")
if any(abs(c.amount - AMOUNT) < 0.5 for c in existing):
    print(f"    2. (skipped) a Rs {AMOUNT:,.0f} payment to '{camp.title}' already exists")
    add = False
else:
    print(f"    2. Create a payment of Rs {AMOUNT:,.0f} to '{camp.title}', not paid yet (approve it when the proof comes)")
    add = True
if mode != "apply":
    db.rollback()
    sys.exit(0)

from app.services import seasonal
from app.services.challan_numbers import next_number

with open(save_to, "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["what", "id", "member_code", "month", "amount", "status", "entry_source", "created_at"])
    w.writerow(["member", m.id, CODE, "", m.monthly_amount, "monthly_member=%s" % m.monthly_member, "", ""])
    for c in unpaid:
        w.writerow(["removed unpaid row", c.id, CODE, c.month, c.amount, c.status.value, c.entry_source, c.created_at])
out = seasonal.set_monthly_member(db, m, False, actor_id=None)   # commits
print(f"  Done 1: not a monthly member, removed {out['removed_unpaid_rows']} rows")
if add:
    c = Challan(member_id=m.id, type=ChallanType.CAMPAIGN, campaign_id=camp.id, amount=AMOUNT,
                status=ChallanStatus.GENERATED, entry_source="self", created_by_user_id=m.user_id,
                challan_no=next_number(db, date.today()),
                entry_notes="One-time contribution (committee decision 2026-11-20)")
    db.add(c)
    db.commit()
    print(f"  Done 2: payment {c.challan_no} for Rs {AMOUNT:,.0f} to '{camp.title}' (not paid yet)")
print(f"  Old values saved to {save_to}")
PYEOF
