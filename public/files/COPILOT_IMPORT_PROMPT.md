# GitHub Copilot Prompt — Historical Member Import Feature
# CharityConnect | FastAPI + React + PostgreSQL
# Copy the entire contents of this file and paste into Copilot Chat

---

## Context

I am building CharityConnect, a charity membership management platform for **POYYATHABAIL JAMA'ATH GCC COMMITTEE**.

**Stack:**
- Backend: FastAPI (Python), SQLAlchemy 2.0, PostgreSQL, Pydantic v2, JWT auth
- Frontend: React + Vite, TanStack Query, Radix UI / Shadcn, React Hook Form + Zod, Tailwind CSS
- Auth: Role-based (superadmin, admin, member)

**Existing relevant models (already in `app/models/models.py`):**
```python
class User:        id, username, full_name, email, phone, password_hash, role, is_active, created_at
class Member:      id, user_id, member_code, monthly_amount, address, status, join_date, created_at, updated_at
class Challan:     id, member_id, type, month, campaign_id, amount, payment_method, proof_path, status,
                   notes, created_at, approved_at, approved_by, bulk_group_id
class Campaign:    id, title, description, target_amount, start_date, end_date, is_active, created_by, created_at
```

**Challan types:** `monthly` | `campaign`
**Challan statuses:** `pending` | `approved` | `rejected`
**Member statuses:** `active` | `inactive` | `suspended`

---

## What I Need You to Build

I have 3 CSV files with historical data to import (205 members, 5916 monthly challans, 3 campaign payments). I need you to implement a **complete bulk import system** with:

1. A backend FastAPI endpoint to accept CSV uploads
2. A React frontend admin page to upload the CSVs and preview before confirming
3. A standalone Python script for one-time seeding directly to the database

---

## Task 1 — Backend: Bulk Import API Endpoint

Create `app/routes/import_routes.py`:

```
POST /admin/import/members          — Upload member_import.csv
POST /admin/import/challans         — Upload challan_history_monthly.csv  
POST /admin/import/campaign-payments — Upload campaign_payments.csv
POST /admin/import/preview          — Dry-run any CSV, return what WOULD be imported
GET  /admin/import/status           — Returns counts of members/challans/campaign_payments already in DB
```

**Rules for each endpoint:**
- Admin/superadmin only (use existing JWT auth dependency)
- Accept `multipart/form-data` with a `file` field (CSV)
- Parse CSV in-memory using Python's `csv` module (no temp files)
- Return a structured JSON response:
  ```json
  {
    "imported": 180,
    "skipped": 25,
    "errors": ["SI:150 - monthly_amount=50000, flagged for review"],
    "warnings": ["3 members have placeholder emails"],
    "duration_ms": 1240
  }
  ```
- **Idempotent**: skip records that already exist (check by username for members, by member_id+month for challans)
- Use SQLAlchemy session with proper rollback on error
- Hash passwords using passlib bcrypt (use existing `pwd_context` from `app/utils/auth.py`)
- For members: default password = env var `IMPORT_DEFAULT_PASSWORD` (default: `"Welcome@2024!"`)
- For members: generate placeholder email as `{username}@imported.local`
- For members: generate member_code as `MEM-{si_no:04d}`
- For members: set `join_date = 2024-08-01` (start of records)
- For challans: `approved` status rows should also set `approved_at = {month}-01`
- For campaign payments: if `campaign_id` is NULL in CSV, save challan with `campaign_id=NULL` and add a warning in response
- Log each import operation to the `audit_logs` table using the existing audit service

**CSV column mappings:**

`member_import.csv`:
```
si_no, full_name, username, monthly_amount, status, join_year, notes
```

`challan_history_monthly.csv`:
```
challan_id, username, si_no, type, month, amount, status, payment_method, notes
```

`campaign_payments.csv`:
```
campaign_payment_id, username, si_no, full_name, type, amount, period, status, payment_method, notes, suggested_campaign_name
```

---

## Task 2 — Frontend: Admin Import Page

Create `src/pages/admin/ImportPage.jsx` (or `.tsx`):

**Layout:** A 3-step wizard inside the existing admin layout

**Step 1 — Upload**
- 3 file drop zones (or file inputs), one per CSV type:
  - Members (`member_import.csv`)
  - Monthly Challans (`challan_history_monthly.csv`)
  - Campaign Payments (`campaign_payments.csv`)
- Each shows a green checkmark when a valid CSV is selected
- "Preview Import" button (disabled until at least Members CSV is selected)
- Add a download link for each CSV template so admins can re-download the format

**Step 2 — Preview**
- Call `POST /admin/import/preview` for each uploaded CSV
- Show a summary table per file:
  - Total rows in file
  - Will be imported: N
  - Will be skipped (already exist): N
  - Warnings: list
  - Errors: list (red)
- Show a collapsible "Sample rows" table (first 5 rows of each CSV parsed client-side)
- "Confirm Import" button and "Back" button
- Disable Confirm if there are any hard errors

**Step 3 — Progress & Result**
- Upload each CSV sequentially to its endpoint
- Show a progress bar per file
- On completion show a summary card:
  - Members imported: N
  - Monthly challans imported: N  
  - Campaign payments imported: N
  - Any warnings/errors in an expandable list
- "Go to Members" button → navigate to `/admin/members`

**State management:** Use TanStack Query `useMutation` for each import call
**Validation:** Parse CSV client-side first and show column validation errors before uploading (check required columns exist)
**Error handling:** Show toast on network error; inline errors per file on validation failure

**Route:** Add `/admin/import` to the router with admin-only guard. Add a menu item "Import Data" in the admin sidebar (use `Upload` icon from lucide-react).

---

## Task 3 — Standalone Import Script (already provided, just integrate)

The file `import_historical_data.py` in the project root is a standalone script.
Make sure it uses the same `app.database.SessionLocal` and `app.models.models` as the app.
Add it to `.gitignore` exemption (it should be committed as a utility script).
Add a note in `README.md` under a new section "## Initial Data Import".

---

## Task 4 — Data Anomalies to Handle

These 4 members have special cases that the import must handle gracefully:

| SI | Name | Issue | Handling |
|----|------|-------|----------|
| 7 | Ismail Kinnaje | monthly=2000, extra ₹10,000 in total (campaign payment) | Import monthly challans normally; import ₹10,000 as campaign challan |
| 23 | Salam Adakalakatte | monthly=0 (no recurring), has ₹1,000 one-time | Create member with monthly_amount=0; import ₹1,000 as campaign challan; set notes="Honorary member" |
| 112 | Mansoor VK Balipaguli | monthly=500, extra ₹5,000 in total (campaign payment) | Import monthly challans normally; import ₹5,000 as campaign challan |
| 150 | Iqbal Haji Baraka Dharmanagar | monthly=50,000 but ZERO payments, pending=850,000 | Import member with FLAG: add note "REVIEW: high monthly amount, zero payments recorded — verify with admin". Do NOT auto-generate 17 pending challans for this member. Instead create member record only and let admin manually add challans after review. |

---

## Task 5 — Backend Schema Addition (if not already present)

Check `app/models/models.py`. If the `Challan` model does not already have an `approved_at` column, add it:

```python
approved_at = Column(DateTime, nullable=True)
```

And create an Alembic migration:
```bash
alembic revision --autogenerate -m "add_approved_at_to_challans"
alembic upgrade head
```

---

## Notes & Constraints

- Do NOT use pandas or openpyxl in the backend endpoint — use Python's built-in `csv` module only (keep backend dependencies lean)
- The standalone script (`import_historical_data.py`) MAY use pandas if already installed, but the API endpoint must not
- Keep all imports idempotent — safe to run multiple times
- All new backend routes must follow the existing pattern in `app/routes/` (router, dependency injection, service layer)
- All frontend components must use Shadcn UI components (`Card`, `Button`, `Progress`, `Badge`, `Table`, `Alert`) — no new UI libraries
- The import page is admin-only; use the existing `ProtectedRoute` / role guard pattern
- After successful member import, the admin should be able to send invite codes to imported members via the existing `/invites/` endpoint so members can set their own passwords

---

## Expected File Structure After Implementation

```
app/
  routes/
    import_routes.py          ← NEW
  services/
    import_service.py         ← NEW
  
src/
  pages/
    admin/
      ImportPage.jsx          ← NEW
  components/
    import/
      FileDropZone.jsx        ← NEW
      ImportPreviewTable.jsx  ← NEW
      ImportProgressCard.jsx  ← NEW

import_historical_data.py     ← Already exists (standalone script)
member_import.csv             ← Data file (already generated)
challan_history_monthly.csv   ← Data file (already generated)
campaign_payments.csv         ← Data file (already generated)
```

---

## Quick Test After Implementation

```bash
# 1. Start backend
uvicorn app.main:app --reload

# 2. Login as admin and get token
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpass"}'

# 3. Test preview endpoint
curl -X POST http://localhost:8000/admin/import/preview \
  -H "Authorization: Bearer <token>" \
  -F "file=@member_import.csv"

# 4. Run actual import
curl -X POST http://localhost:8000/admin/import/members \
  -H "Authorization: Bearer <token>" \
  -F "file=@member_import.csv"

# 5. Verify
curl http://localhost:8000/members/ \
  -H "Authorization: Bearer <token>"
```

---

End of prompt.
