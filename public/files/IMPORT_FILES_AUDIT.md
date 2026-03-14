# Import Files Audit (Checked 2026-03-14)

## Scope Checked
- `public/files/COPILOT_MASTER_PROMPT.md`
- `public/files/COPILOT_IMPORT_PROMPT.md`
- `public/files/import_historical_data.py`
- `public/files/member_import.csv`
- `public/files/challan_history_monthly.csv`
- `public/files/campaign_payments.csv`

## Already Done in Codebase (Do Not Repeat)
- Superadmin-only member import endpoint exists: `POST /members/import`
- Frontend member import action exists on `src/pages/Members.jsx`
- PWA already configured (`vite-plugin-pwa`, manifest, install button)

## Actions Taken Now
- Updated `import_historical_data.py` to match current DB schema:
  - Removed `users.full_name` insert usage (column does not exist)
  - Removed `challans.notes` insert usage (column does not exist)
  - Script now aligns with current `users` and `challans` table fields

## Important Mismatch Found
Current backend endpoint `/members/import` expects member-centric columns such as:
- `member_code/member_id`, `full_name/name`, `phone/mobile`, `email`, `address`, `monthly_amount`, `join_date`, `status`
- optional donation columns in same file: `month/donation_month`, `amount/donation_amount`, `payment_method`, `donation_status`

But `public/files/*.csv` are split into 3 historical files with different headers.
They are valid for the standalone script flow, not direct upload to `/members/import` as-is.

## Nonsensical / Outdated Prompt Commands (Ignored)
- Commands instructing creation of `/admin/import/*` endpoints conflict with current implemented API (`/members/import` already live).
- Prompt SQL/model assumptions using `users.full_name` and `challans.notes` are outdated for current schema.
- Re-running already implemented PWA setup instructions is unnecessary.

## Recommended Next Safe Step
- Use the fixed standalone script for one-time historical import, OR
- Build a dedicated 3-file import wizard + transform service if business wants in-app import from these exact three CSVs.
