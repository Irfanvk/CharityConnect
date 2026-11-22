set -euo pipefail
# Give a pgAdmin login role rights on the app's tables (new tables are created by the app as its
# own DB user, so other roles can't see them until granted).
# Modes: check (read-only) | apply <role>  (grants on all tables + sequences, and default
# privileges so tables the app creates later are granted automatically).
MODE="${1:-check}"
ROLE="${2:-}"
APP="${APP_DIR:-/root/charity-connect-backend}"
PY="${PY:-$APP/venv/bin/python}"
cd "$APP"
"$PY" - "$MODE" "$ROLE" <<'PYEOF'
import sys
from sqlalchemy import text
from app.database import engine

mode, role = sys.argv[1], sys.argv[2]
with engine.begin() as c:
    me = c.execute(text("select current_user")).scalar()
    tables = c.execute(text("""
        select c.oid, c.relname, pg_get_userbyid(c.relowner) owner
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r','p') order by c.relname""")).all()
    roles = c.execute(text("""
        select rolname, rolsuper from pg_roles
        where rolcanlogin and rolname not like 'pg\\_%' order by rolname""")).all()
    print(f"\n  App connects as: {me}   tables in public: {len(tables)}")
    owners = sorted({t.owner for t in tables})
    print(f"  Table owners: {', '.join(owners)}")
    print("\n  Login roles and tables they can NOT read:")
    for r in roles:
        if r.rolsuper:
            print(f"    {r.rolname}: superuser (sees everything)")
            continue
        missing = [t.relname for t in tables
                   if not c.execute(text("select has_table_privilege(:r, :o, 'SELECT')"),
                                    {"r": r.rolname, "o": t.oid}).scalar()]
        print(f"    {r.rolname}: " + (f"{len(missing)} missing -> {', '.join(missing)}" if missing else "all OK"))

    if mode != "apply":
        sys.exit(0)
    names = {r.rolname: r for r in roles}
    if role not in names:
        raise SystemExit(f"\n  Role '{role}' is not a login role here. Nothing changed.")
    if role == me:
        raise SystemExit(f"\n  '{role}' is the app's own user; it already owns its tables. Nothing changed.")
    q = '"' + role.replace('"', '""') + '"'
    mine = [t for t in tables if t.owner == me]
    others = [t for t in tables if t.owner != me]
    for t in mine:
        c.execute(text(f'grant select, insert, update, delete, references, trigger on table public."{t.relname}" to {q}'))
    c.execute(text(f"grant usage on schema public to {q}"))
    c.execute(text(f"grant usage, select, update on all sequences in schema public to {q}"))
    c.execute(text(f"alter default privileges for role {me} in schema public "
                   f"grant select, insert, update, delete, references, trigger on tables to {q}"))
    c.execute(text(f"alter default privileges for role {me} in schema public "
                   f"grant usage, select, update on sequences to {q}"))
    print(f"\n  Granted {role} read/write on {len(mine)} tables owned by {me}, all sequences,")
    print(f"  and default rights on tables {me} creates from now on.")
    if others:
        print(f"  Not touched (owned by someone else): {', '.join(t.relname for t in others)}")
PYEOF
