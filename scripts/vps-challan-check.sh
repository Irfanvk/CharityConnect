set -uo pipefail
# Read-only: how "pending" payments look in the live database. Changes nothing.
# Usage on the VPS (via vps-challan-check.ps1): bash -s -- [MEMBER_CODE]
CODE="${1:-MEM-0016}"
cd /root/charity-connect-backend
venv/bin/python - "$CODE" <<'PYEOF'
import sys
from sqlalchemy import text
from app.database import engine

code = sys.argv[1]
with engine.connect() as c:
    print("== All pending payments, split by whether something was actually submitted")
    rows = c.execute(text("""
        select coalesce(entry_source, '-') as source,
               (proof_path is not null or proof_uploaded_at is not null) as has_proof,
               (bulk_group_id is not null) as in_bulk_group,
               count(*), min(month), max(month), min(created_at)::date, max(created_at)::date
        from challans where status::text in ('PENDING', 'pending')
        group by 1, 2, 3 order by 4 desc
    """)).fetchall()
    print("  source | proof? | bulk? | count | months | created")
    for r in rows:
        print("  %-6s | %-6s | %-5s | %5s | %s..%s | %s..%s" % tuple(r))

    month = c.execute(text("select to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM')")).scalar()
    n = c.execute(text("""
        select count(distinct member_id) from challans
        where status::text in ('PENDING','pending') and month = :m
          and proof_path is null and proof_uploaded_at is null and bulk_group_id is null
          and coalesce(entry_source,'') <> 'admin'
    """), {"m": month}).scalar()
    print("\n== Members with a 'pending' %s payment that has NO proof (would wrongly skip reminders): %s" % (month, n))

    print("\n== Status of all payments")
    for r in c.execute(text("select status::text, count(*) from challans group by 1 order by 2 desc")).fetchall():
        print("  %-10s %s" % tuple(r))

    print("\n== %s" % code)
    m = c.execute(text("select m.id, m.monthly_amount, m.join_date::date, u.is_active from members m join users u on u.id = m.user_id where m.member_code = :c"), {"c": code}).fetchone()
    if not m:
        print("  not found")
    else:
        print("  monthly amount %s | joined %s | account active %s" % (m[1], m[2], m[3]))
        for r in c.execute(text("""
            select month, amount, status::text, coalesce(entry_source,'-'),
                   (proof_path is not null or proof_uploaded_at is not null), bulk_group_id is not null, created_at::date
            from challans where member_id = :i order by month desc limit 12
        """), {"i": m[0]}).fetchall():
            print("  %s  %8s  %-9s source=%-6s proof=%-5s bulk=%-5s created %s" % tuple(r))
PYEOF
