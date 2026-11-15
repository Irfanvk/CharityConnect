#!/usr/bin/env bash
# Creates ONE temporary test member (login "testmember", member ID TEST-0001) so admins can see
# what a member sees. TEST-0001 is outside the MEM-xxxx sequence. A superadmin can delete it
# from Members later (that also turns off its login).
# The password arrives base64-encoded in TEST_PW_B64 (set by the .ps1); it is never printed.
set -euo pipefail
APP_DIR="${APP_DIR:-/root/charity-connect-backend}"
PY="${PY:-venv/bin/python}"
cd "$APP_DIR"

"$PY" - <<'PYCODE'
import base64, os, sys
from datetime import datetime

try:
    from app.utils.member_codes import next_member_code
except ImportError:
    print("STOP: the server does not have the member-ID fix yet. Deploy the backend first. Nothing was changed.")
    sys.exit(0)

from app.database import SessionLocal
from app.models import AuditLog, Member, User
from app.models.models import UserRole
from app.utils.auth import hash_password

USERNAME = "testmember"
CODE = "TEST-0001"
NAME = "Test Member (temporary)"

password = base64.b64decode(os.environ.get("TEST_PW_B64", "")).decode("utf-8")
if len(password) < 8:
    print("STOP: no password received. Nothing was changed.")
    sys.exit(0)

db = SessionLocal()
try:
    if db.query(User).filter(User.username == USERNAME).first():
        print(f"STOP: a login named '{USERNAME}' already exists. Nothing was changed.")
        sys.exit(0)
    if db.query(Member).filter(Member.member_code == CODE).first():
        print(f"STOP: member ID {CODE} already exists. Nothing was changed.")
        sys.exit(0)

    before = next_member_code(db)
    user = User(username=USERNAME, full_name=NAME, password_hash=hash_password(password),
                role=UserRole.MEMBER, is_active=True)
    db.add(user)
    db.flush()
    member = Member(user_id=user.id, member_code=CODE, full_name=NAME, monthly_amount=500,
                    join_date=datetime.utcnow(), status="active",
                    notes="Temporary test account for admins to see the member view. "
                          "A superadmin can delete it from Members when no longer needed.")
    db.add(member)
    db.flush()
    db.add(AuditLog(user_id=None, action="member_create", entity_type="Member", entity_id=member.id,
                    new_values='{"member_code": "TEST-0001", "note": "temporary test member (script)"}'))
    db.commit()
    after = next_member_code(db)
    print("Created the test member:")
    print(f"  Login (username): {USERNAME}")
    print(f"  Member ID:        {CODE}  (outside the MEM sequence)")
    print(f"  Name:             {NAME}")
    print("  Monthly fee:      Rs 500, joined today")
    print("  Password:         the one you just typed (not shown)")
    print(f"  Next real member ID stays: {after}" + ("" if after == before else f" (was {before}!)"))
finally:
    db.close()
PYCODE
