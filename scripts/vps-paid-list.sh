set -euo pipefail
# Compare the committee's full paid list (JSON from cash-sheet-to-json.py) with the app.
# Modes: check (read-only) | apply | apply-with-advance (backup CSV first, one transaction, only the clear cases;
# months after this month are added only with apply-with-advance).
# Anything unclear is listed under "NEEDS YOUR DECISION" and never changed.
MODE="$1"
SHEET_JSON="$2"
APP="${APP_DIR:-/root/charity-connect-backend}"
PY="${PY:-$APP/venv/bin/python}"
cd "$APP"
"$PY" - "$MODE" "$SHEET_JSON" <<'PYEOF'
import csv, difflib, json, re, sys
from collections import defaultdict
from datetime import datetime

from app.database import SessionLocal
from app.models.models import Challan, ChallanStatus, ChallanType, Member, User
from app.services import fee_history

mode, sheet_path = sys.argv[1], sys.argv[2]
base = sheet_path[:-5]
sheet = json.load(open(sheet_path, encoding="utf-8"))
NOTE = "From committee paid list (%s)" % datetime.now().strftime("%Y-%m-%d")
this_month = datetime.now().strftime("%Y-%m")
norm = lambda s: re.sub(r"[^a-z]", "", (s or "").lower())


def canon(code):  # MEM-203 and MEM-0203 are the same member number
    m = re.match(r"^MEM-0*(\d+)$", (code or "").strip().upper())
    return f"MEM-{int(m.group(1)):04d}" if m else (code or "").strip().upper()


def year_of(mo):
    y, m = int(mo[:4]), int(mo[5:])
    return f"{y}-{y + 1}" if m >= 8 else f"{y - 1}-{y}"


def handed_in(c):
    return bool(c.proof_path or c.proof_uploaded_at or c.bulk_group_id)


db = SessionLocal()
groups = defaultdict(list)                       # MEM-0203 -> [member records]
for m in db.query(Member).filter(Member.member_code.isnot(None)).all():
    groups[canon(m.member_code)].append(m)
q = db.query(Challan).filter(Challan.type == ChallanType.MONTHLY, Challan.month.isnot(None))
if mode == "apply":
    q = q.with_for_update()
by_member_month = defaultdict(list)
for c in q.all():
    by_member_month[(c.member_id, c.month)].append(c)

# Names confirmed by the committee as the same person (the sheet uses a short or local name).
CONFIRMED_SAME_NAME = {"MEM-0003", "MEM-0005", "MEM-0009", "MEM-0016", "MEM-0029", "MEM-0076", "MEM-0156",
                       "MEM-0200", "MEM-0205"}
# Approved payments entered under the wrong months (confirmed 2026-11-20): (member, from, to).
# The payment keeps its proof, amount and number; only the month changes.
MOVES = [("MEM-0200", "2025-04", "2025-12"), ("MEM-0200", "2025-05", "2026-01"),
         ("MEM-0200", "2025-06", "2026-02"), ("MEM-0200", "2025-07", "2026-03")]
moves_done, moves_skipped, placeholders_removed = [], [], []
for code, old, new in MOVES:
    recs = groups.get(code, [])
    if len(recs) != 1:
        moves_skipped.append((code, old, new, "member not found once"))
        continue
    mid = recs[0].id
    src = [c for c in by_member_month.get((mid, old), []) if c.status == ChallanStatus.APPROVED]
    dest = by_member_month.get((mid, new), [])
    if len(src) != 1:
        moves_skipped.append((code, old, new, "%d paid payments in %s (expected 1) - maybe already moved" % (len(src), old)))
        continue
    if any(c.status == ChallanStatus.APPROVED or handed_in(c) for c in dest):
        moves_skipped.append((code, old, new, "%s already has a payment" % new))
        continue
    c = src[0]
    moves_done.append((code, c, old, new, bool(c.proof_path)))
    for p in dest:                     # an empty 'not paid yet' row in the new month is no longer needed
        placeholders_removed.append((code, p.id, new, p.status.value, p.amount))
        db.delete(p)
    by_member_month[(mid, new)] = [c]
    by_member_month[(mid, old)] = [x for x in by_member_month[(mid, old)] if x is not c]
    c.month = new
    if c.bulk_group_id and c.bulk_group is not None and c.bulk_group.months_list:
        months = [new if mo == old else mo for mo in json.loads(c.bulk_group.months_list)]
        c.bulk_group.months_list = json.dumps(sorted(months))

add, mark, ask, missing_in_sheet, dup_info = [], [], [], [], []
same = 0
sheet_codes = set()


def decide(code, name, mo, why, fee="", app=""):
    ask.append([code, name, mo, fee, app, why])


for rec in sheet["members"]:
    code = f"MEM-{rec['si']:04d}"
    sheet_codes.add(code)
    name = rec["name"]
    recs = groups.get(code, [])
    paid = sorted(mo for mo in rec["paid"] if mo >= "2024-08")
    if not recs:
        decide(code, name, "", f"member not in the app ({len(paid)} paid months in the sheet)")
        continue
    ids = [m.id for m in recs]
    rows = lambda mo: [c for i in ids for c in by_member_month.get((i, mo), [])]
    blocked = None
    if len(recs) > 1:
        blocked = "two member records for this number (" + ", ".join(m.member_code for m in recs) + ") - merge first"
        for m in recs:
            u = db.get(User, m.user_id)
            n_paid = sum(1 for (i, _), cs in by_member_month.items() if i == m.id for c in cs if c.status == ChallanStatus.APPROVED)
            dup_info.append([code, m.member_code, m.id, m.full_name or "", u.username if u else "", m.monthly_amount, m.status, n_paid])
    m0 = recs[0]
    ratio = difflib.SequenceMatcher(None, norm(name), norm(m0.full_name)).ratio()
    if not blocked and ratio < 0.6 and code not in CONFIRMED_SAME_NAME:
        blocked = f"name in the app looks different ({m0.full_name}, {ratio:.0%} alike)"
    if blocked:
        decide(code, name, "", blocked)
    latest = rec["fees"][sorted(rec["fees"])[-1]]
    if abs(latest - float(m0.monthly_amount or 0)) > 0.5:
        decide(code, name, "", "monthly fee differs: sheet %s, app %s" % (latest, m0.monthly_amount), latest, m0.monthly_amount)
    app_paid = {mo for i in ids for (j, mo), cs in by_member_month.items() if j == i and any(c.status == ChallanStatus.APPROVED for c in cs)}
    for mo in sorted(app_paid - set(paid)):
        if mo >= "2024-08":
            amt = sum(c.amount for c in rows(mo) if c.status == ChallanStatus.APPROVED)
            missing_in_sheet.append([code, name, mo, amt])
    for mo in paid:
        fee = float(rec["fees"].get(year_of(mo), 0))
        cs = rows(mo)
        appr = [c for c in cs if c.status == ChallanStatus.APPROVED]
        if appr:
            amt = sum(c.amount for c in appr)
            if abs(amt - fee) > 0.5:
                decide(code, name, mo, "paid in both, amount differs", fee, amt)
            else:
                same += 1
            continue
        if blocked:
            decide(code, name, mo, "sheet P, app not paid (member needs a decision first)", fee)
            continue
        if fee <= 0:
            decide(code, name, mo, "sheet P but the sheet fee is 0", fee)
            continue
        app_fee = float(fee_history.fee_for(db, m0, mo) or 0)
        open_rows = [c for c in cs if c.status in (ChallanStatus.GENERATED, ChallanStatus.PENDING)
                     and not handed_in(c) and not c.reversed_at]
        if not cs:
            if abs(app_fee - fee) > 0.5:
                decide(code, name, mo, "sheet P, no record in app; sheet fee %s but app fee for that month %s" % (fee, app_fee), fee, app_fee)
            else:
                add.append((m0, mo, fee))
        elif len(cs) == 1 and open_rows:
            c = open_rows[0]
            if abs(c.amount - fee) > 0.5:
                decide(code, name, mo, "sheet P, app 'not paid yet' row has a different amount", fee, c.amount)
            else:
                mark.append((c, code, name))
        else:
            states = ", ".join(sorted("%s%s%s" % (c.status.value, " with proof" if handed_in(c) else "", " reversed" if c.reversed_at else "") for c in cs))
            decide(code, name, mo, "sheet P, app has: " + states, fee, ", ".join(str(c.amount) for c in cs))

not_in_sheet = sorted(k for k in groups if k not in sheet_codes)

# ---- report (codes only on screen; names are in the CSV files) ----
print("\n  Sheet members: %d   App member numbers: %d" % (len(sheet["members"]), len(groups)))
print("  Paid in both (same amount): %d months" % same)
print("\n  WILL BE UPDATED (clear cases):")
if moves_done or moves_skipped:
    print("    Move paid months to the right month (same proof and amount): %d" % len(moves_done))
    for code, c, old, new, proof in moves_done:
        print("      %s %s -> %s  Rs %s  %s%s" % (code, old, new, int(c.amount), c.challan_no or "CH-%s" % c.id, "  (has proof)" if proof else ""))
    for code, pid, mo, st, amt in placeholders_removed:
        print("      remove empty 'not paid yet' row %s %s (%s, Rs %s)" % (code, mo, st, int(amt)))
    for code, old, new, why in moves_skipped:
        print("      SKIPPED %s %s -> %s: %s" % (code, old, new, why))
print("    Mark 'not paid yet' months as paid: %d" % len(mark))
n_adv = sum(1 for _, mo, _ in add if mo > this_month)
print("    Add paid months that are missing in the app: %d" % (len(add) - n_adv))
print("    Paid in advance (after %s), added only if you confirm: %d" % (this_month, n_adv))
for code_mo in sorted({(canon(m.member_code), mo) for m, mo, _ in add if mo > this_month})[:12]:
    print("      %s %s" % code_mo)
if n_adv > 12:
    print("      ... see the CSV")
print("\n  PAID IN THE APP BUT BLANK IN THE SHEET (nothing changed, please check the sheet): %d" % len(missing_in_sheet))
for r in missing_in_sheet[:25]:
    print("    %s %s  Rs %s" % (r[0], r[2], int(r[3])))
if len(missing_in_sheet) > 25:
    print("    ... see the CSV")
print("\n  NEEDS YOUR DECISION (nothing changed): %d" % len(ask))
kinds = defaultdict(list)
for r in ask:
    kinds[re.sub(r" \(.*|:.*|;.*", "", r[5])].append(r)
for k, rs in sorted(kinds.items()):
    print("    %s: %d" % (k, len(rs)))
    for r in rs[:8]:
        print("      %s %s %s" % (r[0], r[2], ("sheet %s / app %s" % (r[3], r[4])) if (r[3] != "" or r[4] != "") else ""))
    if len(rs) > 8:
        print("      ... see the CSV")
if dup_info:
    print("\n  Member numbers with two records:")
    for d in dup_info:
        print("    %s: record %s (id %s), login %s, fee %s, %s, paid months %s" % (d[0], d[1], d[2], "yes" if d[4] else "no", d[5], d[6], d[7]))
print("\n  In the app but not in the sheet: %d %s" % (len(not_in_sheet), " ".join(groups[k][0].member_code for k in not_in_sheet[:20])))
odd = sheet.get("odd", [])
if odd:
    print("  Unusual cells in the sheet: %d %s" % (len(odd), "; ".join(odd[:5])))

with open(base + "-report.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["section", "member_code", "name", "month", "sheet_amount", "app_amount", "details"])
    for c, code, name in mark:
        w.writerow(["will mark paid", code, name, c.month, c.amount, c.amount, "challan %s" % c.id])
    for m, mo, fee in add:
        w.writerow(["will add paid", canon(m.member_code), m.full_name, mo, fee, "", "advance" if mo > this_month else ""])
    for r in missing_in_sheet:
        w.writerow(["paid in app, blank in sheet", r[0], r[1], r[2], "", r[3], ""])
    for r in ask:
        w.writerow(["needs decision", r[0], r[1], r[2], r[3], r[4], r[5]])
    for d in dup_info:
        w.writerow(["two records", d[0], d[3], "", "", d[5], "record %s id %s login %s status %s paid months %s" % (d[1], d[2], d[4], d[6], d[7])])
    for k in not_in_sheet:
        for m in groups[k]:
            w.writerow(["in app, not in sheet", m.member_code, m.full_name, "", "", m.monthly_amount, ""])

if not mode.startswith("apply"):
    db.rollback()
    sys.exit(0)
if not add and not mark and not moves_done:
    print("\n  Nothing to update.")
    sys.exit(0)

now = datetime.utcnow()
backup = base + "-changes.csv"
with open(backup, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["action", "challan_id", "member_code", "month", "amount", "old_status", "old_note"])
    for code, c, old, new, _ in moves_done:
        w.writerow(["moved month", c.id, code, new, c.amount, "approved", "was " + old])
    for code, pid, mo, st, amt in placeholders_removed:
        w.writerow(["removed empty row", pid, code, mo, amt, st, ""])
    for c, code, _ in mark:
        w.writerow(["marked paid", c.id, code, c.month, c.amount, c.status.value, c.verification_note or ""])
    for c, code, _ in mark:
        c.status = ChallanStatus.APPROVED
        c.approved_at = now
        c.verification_note = NOTE
    new = []
    for m, mo, fee in add:
        if mo > this_month and mode != "apply-with-advance":
            continue
        c = Challan(member_id=m.id, type=ChallanType.MONTHLY, month=mo, amount=fee, status=ChallanStatus.APPROVED,
                    entry_source="import", approved_at=now, verification_note=NOTE)
        db.add(c)
        new.append((c, m))
    db.flush()
    for c, m in new:
        w.writerow(["added", c.id, m.member_code, c.month, c.amount, "", ""])
db.commit()
print("\n  Done: moved %d, marked paid %d, added %d." % (len(moves_done), len(mark), len(new)))
print("  List of changed records (to undo if needed): %s" % backup)
PYEOF
