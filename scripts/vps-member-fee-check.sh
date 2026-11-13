set -uo pipefail
# Read-only: which member record a login is linked to, its monthly fee, and how join dates look. Changes nothing.
# Usage on the VPS (via vps-member-fee-check.ps1): bash -s -- LOGIN_OR_NAME
WHO="${1:-noumicool}"
cd /root/charity-connect-backend
venv/bin/python - "$WHO" <<'PYEOF'
import sys
from sqlalchemy import text
from app.database import engine

who = sys.argv[1]
like = "%" + who + "%"
with engine.connect() as c:
    print("== Logins / members matching '%s'" % who)
    rows = c.execute(text("""
        select u.id, u.username, u.role::text, u.is_active, m.id, m.member_code, m.full_name, u.phone,
               m.monthly_amount, m.status, m.join_date::date, m.created_at::date
        from users u left join members m on m.user_id = u.id
        where u.username ilike :w or u.email ilike :w or u.full_name ilike :w
           or m.full_name ilike :w or m.member_code ilike :w
        order by u.id
    """), {"w": like}).fetchall()
    if not rows:
        print("  nothing found")
    for r in rows:
        print("  login #%s %s (role %s, active %s) -> member #%s %s '%s' phone %s | fee %s | status %s | joined %s | created %s" % tuple(r))
        if r[4] is None:
            continue
        for o in c.execute(text("""
            select m.id, m.member_code, m.full_name, u.username, m.monthly_amount, m.join_date::date
            from members m join users u on u.id = m.user_id
            where m.id <> :i and (lower(coalesce(m.full_name,'')) = lower(coalesce(:n,'#'))
                                  or (coalesce(:p,'') <> '' and u.phone = :p))
        """), {"i": r[4], "n": r[6], "p": r[7]}).fetchall():
            print("      other record with the same name or phone: member #%s %s '%s' login %s | fee %s | joined %s" % tuple(o))

    print("\n== Across all members")
    q = lambda sql: c.execute(text(sql)).scalar()
    print("  members                                   : %s" % q("select count(*) from members"))
    print("  fee 0 or empty                            : %s" % q("select count(*) from members where coalesce(monthly_amount,0) <= 0"))
    print("  no join date                              : %s" % q("select count(*) from members where join_date is null"))
    print("  join date = the day the record was made   : %s" % q("select count(*) from members where join_date::date = created_at::date"))
    print("  join date in Aug 2024 or earlier          : %s" % q("select count(*) from members where join_date < date '2024-09-01'"))
    print("\n== Monthly payments whose amount is not the member's fee (not rejected)")
    print("  created by           | status    | count | members | first..last created")
    for r in c.execute(text("""
        select case when ch.created_by_user_id is null then 'unknown / import'
                    when ch.created_by_user_id = m.user_id then 'the member'
                    else 'an admin' end as who,
               ch.status::text, count(*), count(distinct ch.member_id),
               min(ch.created_at)::date, max(ch.created_at)::date
        from challans ch join members m on m.id = ch.member_id
        where ch.type::text in ('MONTHLY','monthly') and ch.status::text not in ('REJECTED','rejected')
          and coalesce(m.monthly_amount,0) > 0 and abs(ch.amount - m.monthly_amount) > 0.01
        group by 1, 2 order by 1, 2
    """)).fetchall():
        print("  %-20s | %-9s | %5s | %7s | %s..%s" % tuple(r))
    print("  (admin-entered ones may be on purpose, e.g. a part payment; the list below shows the latest)")
    for r in c.execute(text("""
        select ch.id, m.member_code, ch.month, ch.amount, m.monthly_amount, ch.status::text, u.username, ch.created_at::date
        from challans ch join members m on m.id = ch.member_id left join users u on u.id = ch.created_by_user_id
        where ch.type::text in ('MONTHLY','monthly') and ch.status::text not in ('REJECTED','rejected')
          and coalesce(m.monthly_amount,0) > 0 and abs(ch.amount - m.monthly_amount) > 0.01
          and ch.created_by_user_id is not null and ch.created_by_user_id <> m.user_id
        order by ch.created_at desc limit 15
    """)).fetchall():
        print("  challan #%s %s %s: amount %s, fee %s, %s, entered by %s on %s" % tuple(r))

    print("\n  join month | members")
    for r in c.execute(text("select to_char(join_date,'YYYY-MM'), count(*) from members group by 1 order by 1")).fetchall():
        print("  %-10s | %s" % tuple(r))
PYEOF
