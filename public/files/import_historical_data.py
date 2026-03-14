#!/usr/bin/env python3
"""
CharityConnect — Historical Data Import Script v2
Organisation: POYYATHABAIL JAMA'ATH GCC COMMITTEE

Imports:
  - 205 members (from paid_list_2025.xlsx + paid_list_2026.xlsx)
  - Monthly challan history: Aug 2024 → present (approved = paid, pending = unpaid)
  - Campaign/one-time payments: 3 members had extra payments beyond monthly

Usage:
    # 1. Place this script + the 3 CSVs in your backend root
    # 2. Set DATABASE_URL in .env
    # 3. Run:
    python import_historical_data.py

    # Dry-run (no DB writes):
    python import_historical_data.py --dry-run

Files needed alongside this script:
    member_import.csv
    challan_history_monthly.csv
    campaign_payments.csv

⚠️  Before running:
    - Confirm SI:150 (Iqbal Haji Baraka, monthly=50000) is correct
    - Confirm SI:23 (Salam Adakalakatte, monthly=0) is honorary
    - Create at least one Campaign in the system named 
      "General Fund / One-Time Contribution 2024-2025" for campaign payments to link to
    - Change IMPORT_DEFAULT_PASSWORD or set in .env
"""

import csv
import os
import sys
from datetime import datetime, date
from dotenv import load_dotenv

load_dotenv()

DRY_RUN = '--dry-run' in sys.argv
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/charity_connect")
DEFAULT_TEMP_PASSWORD = os.getenv("IMPORT_DEFAULT_PASSWORD", "Welcome@2024!")

if DRY_RUN:
    print("🔍 DRY RUN MODE — no database writes will occur\n")

try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker
    from passlib.context import CryptContext
except ImportError:
    print("❌ Missing packages. Run: pip install sqlalchemy psycopg2-binary passlib[bcrypt] python-dotenv")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MEMBER_FILE = os.path.join(SCRIPT_DIR, "member_import.csv")
CHALLAN_FILE = os.path.join(SCRIPT_DIR, "challan_history_monthly.csv")
CAMPAIGN_PAY_FILE = os.path.join(SCRIPT_DIR, "campaign_payments.csv")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def run_import():
    db = SessionLocal()
    stats = {
        'members_created': 0, 'members_skipped': 0,
        'challans_created': 0, 'challans_skipped': 0,
        'campaign_pays_created': 0, 'campaign_pays_skipped': 0,
        'errors': []
    }

    print("=" * 65)
    print("  CharityConnect — Historical Data Import v2")
    print("  POYYATHABAIL JAMA'ATH GCC COMMITTEE")
    print("=" * 65)
    print(f"  DB:       {DATABASE_URL[:50]}...")
    print(f"  Password: {DEFAULT_TEMP_PASSWORD}")
    print(f"  Dry run:  {DRY_RUN}")
    print()

    # -------------------------------------------------------
    # STEP 1 — Members
    # -------------------------------------------------------
    print("📋 Step 1: Importing members & users...")
    user_map = {}       # username -> user_id
    member_map = {}     # username -> member_id

    with open(MEMBER_FILE, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            username = row["username"].strip()
            full_name = row["full_name"].strip()
            monthly_amount = float(row["monthly_amount"] or 0)
            si_no = int(row["si_no"])
            notes = row.get("notes", "")

            existing_user = db.execute(
                text("SELECT id FROM users WHERE username = :u"),
                {"u": username}
            ).fetchone()

            if existing_user:
                user_map[username] = existing_user[0]
                existing_member = db.execute(
                    text("SELECT id FROM members WHERE user_id = :uid"),
                    {"uid": existing_user[0]}
                ).fetchone()
                if existing_member:
                    member_map[username] = existing_member[0]
                stats['members_skipped'] += 1
                continue

            if DRY_RUN:
                user_map[username] = f"dry_{si_no}"
                member_map[username] = f"dry_mem_{si_no}"
                stats['members_created'] += 1
                continue

            # Create User
            pw_hash = hash_password(DEFAULT_TEMP_PASSWORD)
            result = db.execute(text("""
                INSERT INTO users (username, email, password_hash, role, is_active, created_at)
                VALUES (:username, :email, :pw_hash, 'member', true, NOW())
                RETURNING id
            """), {
                "username": username,
                "email": f"{username}@imported.local",
                "pw_hash": pw_hash,
            })
            user_id = result.fetchone()[0]
            db.flush()

            # Create Member
            member_code = f"MEM-{si_no:04d}"
            result = db.execute(text("""
                INSERT INTO members (user_id, member_code, monthly_amount, status, join_date, address, created_at)
                VALUES (:uid, :code, :amount, 'active', :join_date, :address, NOW())
                RETURNING id
            """), {
                "uid": user_id,
                "code": member_code,
                "amount": monthly_amount,
                "join_date": date(2024, 8, 1),
                "address": notes if notes else None,
            })
            member_id = result.fetchone()[0]
            db.flush()

            user_map[username] = user_id
            member_map[username] = member_id
            stats['members_created'] += 1

    if not DRY_RUN:
        db.commit()
    print(f"  ✅ Created: {stats['members_created']}  |  ⏭️  Skipped: {stats['members_skipped']}")

    # -------------------------------------------------------
    # STEP 2 — Monthly Challans
    # -------------------------------------------------------
    print()
    print("💰 Step 2: Importing monthly challan history...")

    with open(CHALLAN_FILE, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            username = row["username"].strip()
            month = row["month"].strip()
            amount = float(row["amount"] or 0)
            status = row["status"].strip()

            if amount == 0:
                continue

            member_id = member_map.get(username)
            if not member_id:
                stats['errors'].append(f"No member for {username}, skipping {month}")
                continue

            if DRY_RUN:
                stats['challans_created'] += 1
                continue

            existing = db.execute(
                text("SELECT id FROM challans WHERE member_id = :mid AND month = :m AND type = 'monthly'"),
                {"mid": member_id, "m": month}
            ).fetchone()

            if existing:
                stats['challans_skipped'] += 1
                continue

            approved_at = f"{month}-01" if status == "approved" else None
            db.execute(text("""
                INSERT INTO challans (member_id, type, month, amount, payment_method, status, created_at, approved_at)
                VALUES (:mid, 'monthly', :month, :amount, :method, :status, NOW(), :approved_at)
            """), {
                "mid": member_id, "month": month, "amount": amount,
                "method": row.get("payment_method", "cash"),
                "status": status,
                "approved_at": approved_at,
            })
            stats['challans_created'] += 1

            if stats['challans_created'] % 500 == 0:
                db.commit()
                print(f"  ... {stats['challans_created']} challans imported")

    if not DRY_RUN:
        db.commit()
    print(f"  ✅ Created: {stats['challans_created']}  |  ⏭️  Skipped: {stats['challans_skipped']}")

    # -------------------------------------------------------
    # STEP 3 — Campaign / One-time Payments
    # -------------------------------------------------------
    print()
    print("🎯 Step 3: Importing campaign/one-time payments...")
    print("  NOTE: These link to campaigns. A campaign named")
    print("  'General Fund / One-Time Contribution 2024-2025' must exist.")

    # Find or note the campaign
    campaign_id = None
    if not DRY_RUN:
        result = db.execute(
            text("SELECT id FROM campaigns WHERE title ILIKE '%one-time%' OR title ILIKE '%general fund%' LIMIT 1")
        ).fetchone()
        if result:
            campaign_id = result[0]
            print(f"  Found campaign ID: {campaign_id}")
        else:
            print("  ⚠️  No matching campaign found. Campaign challans will be saved WITHOUT campaign_id.")
            print("       Create the campaign first, then run: UPDATE challans SET campaign_id=<id> WHERE notes ILIKE '%one-time%'")

    with open(CAMPAIGN_PAY_FILE, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            username = row["username"].strip()
            amount = float(row["amount"] or 0)

            member_id = member_map.get(username)
            if not member_id:
                stats['errors'].append(f"No member for {username} campaign payment")
                continue

            if DRY_RUN:
                stats['campaign_pays_created'] += 1
                print(f"  [DRY] Would create campaign challan: {username} ₹{amount:,.0f}")
                continue

            existing = db.execute(
                text("SELECT id FROM challans WHERE member_id = :mid AND type = 'campaign' AND amount = :amt"),
                {"mid": member_id, "amt": amount}
            ).fetchone()

            if existing:
                stats['campaign_pays_skipped'] += 1
                continue

            db.execute(text("""
                INSERT INTO challans (member_id, type, month, campaign_id, amount, payment_method, status, created_at, approved_at)
                VALUES (:mid, 'campaign', NULL, :campaign_id, :amount, 'cash', 'approved', NOW(), NOW())
            """), {
                "mid": member_id,
                "campaign_id": campaign_id,
                "amount": amount,
            })
            stats['campaign_pays_created'] += 1

    if not DRY_RUN:
        db.commit()
    print(f"  ✅ Created: {stats['campaign_pays_created']}  |  ⏭️  Skipped: {stats['campaign_pays_skipped']}")

    # -------------------------------------------------------
    # SUMMARY
    # -------------------------------------------------------
    print()
    print("=" * 65)
    print("📊 Import Summary")
    print("=" * 65)

    if not DRY_RUN:
        total_members = db.execute(text("SELECT COUNT(*) FROM members")).scalar()
        total_challans = db.execute(text("SELECT COUNT(*) FROM challans")).scalar()
        approved = db.execute(text("SELECT COUNT(*) FROM challans WHERE status = 'approved'")).scalar()
        pending = db.execute(text("SELECT COUNT(*) FROM challans WHERE status = 'pending'")).scalar()
        print(f"  Members in DB:          {total_members}")
        print(f"  Total challans in DB:   {total_challans}")
        print(f"    Approved (paid):      {approved}")
        print(f"    Pending (unpaid):     {pending}")
    else:
        print(f"  Would create members:   {stats['members_created']}")
        print(f"  Would create challans:  {stats['challans_created']}")
        print(f"  Would create campaign:  {stats['campaign_pays_created']}")

    if stats['errors']:
        print(f"\n  ⚠️  {len(stats['errors'])} warnings:")
        for e in stats['errors'][:10]:
            print(f"    - {e}")

    print()
    print("⚠️  POST-IMPORT MANUAL ACTIONS REQUIRED:")
    print("  1. SI:150 Iqbal Haji Baraka (monthly=50,000, pending=850,000)")
    print("     → Verify with admin. If wrong, update manually via admin panel.")
    print("  2. SI:23 Salam Adakalakatte (monthly=0, one-time ₹1,000)")
    print("     → Mark as 'inactive' or 'honorary' in member settings if needed.")
    print("  3. 3 campaign payments (SI:7, 23, 112) need a campaign to be assigned.")
    print("     → Create campaign in admin panel, then link via SQL or admin UI.")
    print("  4. All 205 users have password:", DEFAULT_TEMP_PASSWORD)
    print("     → Share passwords with members or set up invite-based reset.")
    print("  5. Phone numbers & real emails not in source — add via admin panel.")
    print()
    print("✅ Import complete!")
    db.close()


if __name__ == "__main__":
    run_import()
