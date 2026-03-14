# GitHub Copilot — CharityConnect: Remaining Work Master Prompt
# Organisation: POYYATHABAIL JAMA'ATH GCC COMMITTEE
# Date: 2026-03-14
# Paste this entire file into GitHub Copilot Chat

---

## 1. PROJECT OVERVIEW

CharityConnect is a charity membership management web app + installable PWA for a ~200–300 member GCC committee. The app is under active development and integration is already significantly underway. This prompt describes what has been built, what is still missing, and exactly what to implement next.

---

## 2. CONFIRMED TECH STACK

**Backend** (`charity-connect-backend`):
- FastAPI (Python), SQLAlchemy 2.0, PostgreSQL, Pydantic v2
- JWT auth (Bearer token, 60-min expiry, `access_token` canonical key)
- Roles: `superadmin` > `admin` > `member`
- Passlib bcrypt for password hashing
- Uvicorn ASGI server
- File uploads: local `app/uploads/proofs/` (max 3MB, jpg/png/pdf)

**Frontend** (`CharityConnect`):
- React 18 + Vite, JavaScript (JSConfig, no strict TS)
- TanStack Query v5 for all server state
- React Router v6 for routing
- Radix UI / Shadcn UI components (Card, Button, Table, Badge, Dialog, Toast, Progress, etc.)
- React Hook Form + Zod for all forms
- Tailwind CSS for styling
- Lucide React for icons
- Sonner / react-hot-toast for notifications
- `import.meta.env.VITE_API_URL` for base URL (env-configured)

---

## 3. WHAT IS ALREADY BUILT AND WORKING ✅

**Backend (all confirmed working as of 2026-03-14):**
- JWT auth: `POST /auth/login` (username OR email auto-detect), `POST /auth/register` (invite-code gated, returns 201 + token + user), `GET /auth/me`, `POST /auth/logout`
- Invite system: `POST /invites/`, `GET /invites/`, `GET /invites/{id}`, `PUT /invites/{id}`, `POST /invites/validate`
- Members: `GET /members/`, `GET /members/me`, `GET /members/{id}`, `PUT /members/{id}` (writable: monthly_amount, address, status only)
- `POST /members/` → superadmin only, supports offline onboarding (member_id/full_name/phone/email payload, auto-links/creates member user)
- `POST /members/import` → superadmin only, accepts .csv/.xlsx, row-level summaries, optional challan history creation
- Challans: `POST /challans/`, `GET /challans/`, `GET /challans/{id}`, `GET /challans/member/{id}`, `PATCH /challans/{id}/approve`, `PATCH /challans/{id}/reject`, `POST /challans/{id}/upload-proof`
- Bulk challans: `POST /challans/bulk-create`, `GET /admin/bulk-pending-review`, `GET /admin/bulk/{bulk_group_id}`, `PATCH /admin/bulk/{bulk_group_id}/approve`, `PATCH /admin/bulk/{bulk_group_id}/reject`
- Campaigns: `POST /campaigns/`, `GET /campaigns/`, `GET /campaigns/{id}`, `PUT /campaigns/{id}` (and PATCH alias), `DELETE /campaigns/{id}`
- Notifications: `POST /notifications/`, `GET /notifications/`, `GET /notifications/unread/count`, `PUT /notifications/{id}/read`, `POST /notifications/mark-all-read`, `PUT /notifications/{id}`, `DELETE /notifications/{id}`, `GET /notifications/admin/sent`, `DELETE /notifications/admin/sent`
- Files: `POST /files/upload`
- Users: `GET /users/`
- Audit logs: `GET /audit-logs/`, `POST /audit-logs/`
- Health: `GET /health`
- OpenAPI: `GET /openapi/v1.json`

**Frontend (all confirmed working as of 2026-03-14):**
- Auth: Login (username or email), Register with invite code (real-time username validation), logout in header
- Role-split dashboard: superadmin/admin view vs member view (member sees profile, challan insights, upcoming dues, campaign participation)
- Admin dashboard: Bulk Operations tab (bulk-pending-review queue, Approve All / Reject All)
- Members page: list, admin edit form (writable fields only, fresh-fetch before open, destructive toast on fetch fail)
- Challans page: list (role-scoped), create (single month), bulk create (multi-month → bulk-create endpoint), proof upload, approve/reject actions, re-upload on rejected, "Proof Uploaded" UI label derived from pending+proof_uploaded_at
- Campaigns page: list, create, edit (PATCH canonical), delete
- Notifications page: list, unread count badge, mark read, mark all read; create (admin, POST /notifications/ canonical)
- Admin Reports: 3-tab suite (Members, Donations, Challans) with period filters and per-tab CSV export
- Audit Logs page: list with filters (frontend normalizes backend field names)
- Invites page: create, list, view/edit invite detail
- API client hardened: FormData header safety, backend error parsing (detail string or detail[].msg), 401 → auth:expired event

---

## 4. WHAT IS CONFIRMED INCOMPLETE / MISSING 🔧

These are the remaining gaps. Implement all of them.

---

### 4A. HISTORICAL DATA IMPORT — FRONTEND WIZARD (superadmin only)

**Backend is already built** (`POST /members/import` exists as of 2026-03-14). The frontend needs the UI.

**Create: `src/pages/admin/ImportPage.jsx`**

A 3-step wizard (use Shadcn `Stepper` pattern or simple step state):

**Step 1 — Upload Files**
- Three file inputs (or drag-drop zones using Shadcn Card):
  1. **Members CSV** (`member_import.csv`) — required
  2. **Monthly Challans CSV** (`challan_history_monthly.csv`) — optional
  3. **Campaign Payments CSV** (`campaign_payments.csv`) — optional
- Each zone shows filename + row count when a valid CSV is selected (parse client-side with PapaParse or native FileReader + split lines)
- Show expected column headers under each zone as helper text
- "Preview" button — disabled until Members CSV is loaded
- Add a "Download Template" link per file (link to static CSV template files in `/public/templates/`)

**Step 2 — Preview**
- For each loaded CSV, show a summary card:
  - Total rows detected
  - Sample: first 3 rows in a compact table
  - Column validation: green check if all required columns present, red error if missing
- "Confirm Import" button (disabled if any column validation fails)
- "Back" button

**Step 3 — Import Progress + Result**
- Sequential upload: Members first, then Challans, then Campaign Payments
- Progress bar per file (use Shadcn Progress component)
- POST to `POST /members/import` with `multipart/form-data`, field `file`
- On each completion show a result badge: `Imported: N | Skipped: N | Errors: N`
- Expandable error list (Shadcn Collapsible)
- On full completion: "Go to Members →" button linking to `/admin/members`

**Data notes for this import specifically:**
- Members CSV columns: `si_no, full_name, username, monthly_amount, status, join_year, notes`
- Challan CSV columns: `challan_id, username, si_no, type, month, amount, status, payment_method, notes`
- Campaign payments CSV columns: `campaign_payment_id, username, si_no, full_name, type, amount, period, status, payment_method, notes, suggested_campaign_name`
- One member (SI:150, Iqbal Haji Baraka, monthly_amount=50000) is a legitimate high-value recurring donor — treat as normal import, monthly_amount is correct
- Three members (SI:7, SI:23, SI:112) have campaign/one-time payments in `campaign_payments.csv` — these are "Inaugural Donation" payments from a campaign named **"Inaugural Donation — POYYATHABAIL JAMA'ATH GCC COMMITTEE"**. Create this campaign first if it doesn't exist, then link their challans.
- SI:23 (Salam Adakalakatte) has monthly_amount=0 — honorary/non-paying member, import normally

**Route:** `/admin/import` — superadmin role only (403 for admin role)
**Sidebar:** Add "Import Data" menu item with `Upload` icon (lucide-react), visible to superadmin only

---

### 4B. MEMBER ONBOARDING — ADMIN OFFLINE FORM (superadmin only)

**Backend is already built** (`POST /members/` supports offline onboarding payload as of 2026-03-14).

The frontend needs a form to add a single member manually (for new members who join after the initial import).

**Add to Members page:** A "Add Member" button (admin/superadmin) that opens a Shadcn Dialog with:

```
Full Name*         (text input)
Phone              (text input)
Email              (email input)
Username*          (text input, real-time uniqueness hint)
Monthly Amount*    (number input, min 0)
Address            (textarea)
Status             (Select: active / inactive / suspended, default: active)
Notes              (textarea, optional)
```

On submit: `POST /members/` with payload. Backend auto-creates the linked user account with a temporary password.
After success: invalidate `['members']` query, show success toast, close dialog.

The new member will not have app access yet. Show a note in the dialog: *"After adding, create an invite code for this member so they can set their own password."*

---

### 4C. CAMPAIGN — "INAUGURAL DONATION" SEED

The historical data includes one-time inaugural donations for 3 members (SI:7, SI:23, SI:112) amounting to ₹10,000 + ₹1,000 + ₹5,000 = ₹16,000.

These belong to a campaign called **"Inaugural Donation — POYYATHABAIL JAMA'ATH GCC COMMITTEE"**.

**On the Campaigns page or as part of the import flow:**
- If this campaign does not already exist, the import wizard (Step 1) should prompt: *"3 campaign payments detected. A campaign named 'Inaugural Donation — POYYATHABAIL JAMA'ATH GCC COMMITTEE' will be created automatically during import if it doesn't exist."*
- The backend import endpoint should receive the campaign name and create it if missing, then link the 3 campaign challans to it.
- Campaign fields: title="Inaugural Donation — POYYATHABAIL JAMA'ATH GCC COMMITTEE", description="One-time inaugural donations collected at committee formation", target_amount=0, is_active=false (historical/closed)

---

### 4D. PWA — INSTALLABLE WEB APP

Make the React Vite app installable on Android and iOS home screens.

**Install `vite-plugin-pwa`:**
```bash
npm install -D vite-plugin-pwa
```

**Update `vite.config.js`:**
```js
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'CharityConnect — POYYATHABAIL JAMA\'ATH',
        short_name: 'CharityConnect',
        description: 'Membership & donation management for POYYATHABAIL JAMA\'ATH GCC COMMITTEE',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api') || url.port === '8000',
            handler: 'NetworkOnly',  // Never cache API calls
          },
        ],
      },
    }),
  ],
})
```

**Update `index.html`:**
```html
<meta name="theme-color" content="#16a34a" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="CharityConnect" />
<link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
```

**Create `src/components/InstallBanner.jsx`:**
- Captures `beforeinstallprompt` event (Android Chrome auto-prompt)
- Shows a bottom banner: "Add CharityConnect to your home screen for quick access"
- "Install" button triggers the browser install prompt
- "Later" dismisses (store dismissed flag in sessionStorage)
- For iOS Safari: shows manual instructions: "Tap Share → Add to Home Screen"
- Hidden when already installed (`display-mode: standalone` matches)
- Place `<InstallBanner />` in the main authenticated layout, below the app shell

**Place icons:** Add `public/icons/icon-192x192.png` and `public/icons/icon-512x512.png` (use the committee logo or a placeholder green charity icon — 512×512 PNG)

---

### 4E. BACKEND HARDENING (missing items not yet in codebase)

**4E-1. Fix CORS for production**
```python
# app/main.py
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(CORSMiddleware, allow_origins=origins, ...)
```
Keep `allow_origins=["*"]` only for local dev. Use env var in production.

**4E-2. Add rate limiting to auth endpoints**
```bash
pip install slowapi
```
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# In auth_routes.py:
@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, ...): ...

@router.post("/register")
@limiter.limit("5/minute")
async def register(request: Request, ...): ...
```

**4E-3. Add `approved_at` column to Challans if not present**
```python
# In Challan model:
approved_at = Column(DateTime, nullable=True)
```
Generate Alembic migration if not already done.

**4E-4. Move file uploads to Cloudinary (prevents data loss on redeploy)**
```bash
pip install cloudinary
```
```python
# app/utils/file_handler.py
import cloudinary.uploader
result = cloudinary.uploader.upload(file_bytes, folder="charity-connect/proofs", resource_type="auto")
return result["secure_url"]
```
Add env vars: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

**4E-5. Startup health check banner in frontend**
```js
// src/lib/healthCheck.js
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch { return false; }
}
```
In root App layout: if health check fails, show a yellow banner "Service is starting up, please wait…" — auto-retry every 10 seconds and dismiss when backend responds.

---

### 4F. FRONTEND — TOKEN MANAGEMENT HARDENING

Replace direct `localStorage.getItem('token')` usage with an in-memory token manager:

```js
// src/lib/tokenManager.js
let _token = null;
export const tokenManager = {
  get: () => _token,
  set: (t) => { _token = t; },
  clear: () => { _token = null; },
};
```

In the API client, use `tokenManager.get()`. On 401 response, call `tokenManager.clear()` and dispatch `window.dispatchEvent(new Event('auth:expired'))`.

In `AuthContext`, listen for `auth:expired` and redirect to `/login` with a toast: "Your session has expired. Please log in again."

---

### 4G. FRONTEND — OFFLINE BANNER

```jsx
// src/components/OfflineBanner.jsx
export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    window.addEventListener('online', () => setOffline(false));
    window.addEventListener('offline', () => setOffline(true));
  }, []);
  if (!offline) return null;
  return (
    <div className="bg-yellow-500 text-white text-center py-2 text-sm font-medium">
      You are offline — some features may be unavailable
    </div>
  );
}
```
Add to main layout above the app shell.

---

### 4H. MEMBER DASHBOARD — UPCOMING DUES WIDGET

The member dashboard exists but needs a "Upcoming Dues" section showing unpaid monthly challans clearly.

In the member dashboard (`src/pages/MemberDashboard.jsx` or equivalent):

Add a section that:
1. Fetches `GET /challans/member/{member_id}` (or `/challans/` filtered to current member)
2. Filters challans where `status = 'pending'` and `type = 'monthly'`
3. Sorts by `month` ascending
4. Renders a table or card list: Month | Amount | Status | Action
5. "Pay Now" button per row → navigates to challan create flow pre-filled with that month
6. Total outstanding amount shown as a summary badge at the top

---

### 4I. QUERY KEY STANDARDIZATION

Ensure all TanStack Query keys follow this single source of truth to prevent cache fragmentation:

```js
// src/lib/queryKeys.js
export const queryKeys = {
  me:                   ['auth', 'me'],
  members:              (f) => ['members', f ?? 'all'],
  member:               (id) => ['members', id],
  challans:             (f) => ['challans', f ?? 'all'],
  challan:              (id) => ['challans', id],
  challansByMember:     (mid) => ['challans', 'member', mid],
  bulkPending:          ['challans', 'bulk', 'pending'],
  bulkGroup:            (id) => ['challans', 'bulk', id],
  campaigns:            ['campaigns'],
  campaign:             (id) => ['campaigns', id],
  notifications:        ['notifications'],
  notificationsUnread:  ['notifications', 'unread'],
  notificationsSent:    ['notifications', 'sent'],
  invites:              (f) => ['invites', f ?? 'all'],
  invite:               (id) => ['invites', id],
  users:                (f) => ['users', f ?? 'all'],
  auditLogs:            (f) => ['audit-logs', f ?? 'all'],
  health:               ['health'],
};
```

Replace all inline query key strings/arrays throughout the codebase with these keys.

---

## 5. LOCKED API CONTRACTS (DO NOT CHANGE)

These are confirmed and must not be modified:

| Contract | Value |
|----------|-------|
| Token response key | `access_token` |
| Register success status | `201` with `{ access_token, token_type, user }` |
| Auth errors | `401` invalid/expired token, `403` wrong role |
| Member writable fields | `monthly_amount`, `address`, `status` only |
| Challan month format | `YYYY-MM` string |
| Notification create | `POST /notifications/` only (not `/send`) |
| Invite expiry field | `expiry_date` canonical |
| Bulk approve endpoint | `PATCH /admin/bulk/{bulk_group_id}/approve` |
| Bulk reject endpoint | `PATCH /admin/bulk/{bulk_group_id}/reject` |
| Member import auth | superadmin only (403 for admin) |
| Error shape | `{ detail: string }` or `{ detail: [{type, loc, msg, input}] }` |

---

## 6. DATA FACTS (for seeding / import)

- Organisation: **POYYATHABAIL JAMA'ATH GCC COMMITTEE**
- **205 members** to import from historical Excel records
- Monthly amounts: ₹500 (178 members), ₹1000 (18), ₹2000 (4), ₹1500 (1), ₹750 (2), ₹50000 (1 — legitimate high-value donor)
- **Period 1:** Aug 2024 – Dec 2025 (17 months of history)
- **Period 2:** Jan 2026 – present (ongoing)
- **634 paid challans** confirmed from historical data
- **3 inaugural/one-time payments** (SI:7 ₹10,000; SI:23 ₹1,000; SI:112 ₹5,000) → belong to campaign **"Inaugural Donation — POYYATHABAIL JAMA'ATH GCC COMMITTEE"**
- SI:23 (Salam Adakalakatte) is an honorary member with monthly_amount=0
- All imported users get temporary password from env `IMPORT_DEFAULT_PASSWORD` (default: `Welcome@2024!`)
- Placeholder emails are `username@imported.local` — real emails/phones to be added by admin later
- Import is idempotent (safe to run multiple times — skips existing records)

**Import CSV files (already generated, place in backend root):**
- `member_import.csv` — 205 rows
- `challan_history_monthly.csv` — 5916 rows
- `campaign_payments.csv` — 3 rows

---

## 7. DEPLOYMENT TARGET

- **Frontend:** Vercel (free tier), env var `VITE_API_URL=https://api.<domain>`
- **Backend:** Render (free tier or $7/mo starter), env vars as above
- **Database:** Supabase PostgreSQL (free tier, 500MB)
- **File storage:** Cloudinary (free tier, 25GB)
- **Domain:** One custom domain via Cloudflare (free DNS + SSL)
  - `yourdomain.com` → Vercel (frontend)
  - `api.yourdomain.com` → Render (backend)
- **Production CORS:** `ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com`

---

## 8. REMAINING OPEN ITEMS FROM COMMUNICATION LOG

These items from the decision log are still pending or need verification:

| Item | Owner | Action |
|------|-------|--------|
| Deprecation removal date for `expires_at` alias | Backend | Add to `API_CHANGELOG.md` |
| Validate new admin APIs in integration QA (`/users/`, `/audit-logs/`, full `/invites/` management, notification edit/delete) | Frontend | Integration test pass |
| Joint session to close legacy action items from 2026-02-24 | Both | Schedule sync |
| Production env readiness (database reachability, CORS, health check uptime) | Backend | Pre-release checklist |
| Bulk challan live end-to-end test with real seeded data (5+ members with pending bulk groups) | Both | Run seed script, validate in app |

---

## 9. IMPLEMENTATION PRIORITY ORDER

Implement in this sequence:

1. **`4I` — Query key standardization** (foundational, do this first)
2. **`4F` — Token manager + auth:expired handling** (security)
3. **`4G` — Offline banner** (quick, high UX value)
4. **`4E-1` — CORS env var fix** (security, 5-minute change)
5. **`4E-5` — Health check startup banner** (prevents user confusion on Render cold start)
6. **`4H` — Member dashboard upcoming dues widget** (member-facing UX)
7. **`4B` — Add Member offline form dialog** (admin workflow)
8. **`4A` — Import wizard page** (superadmin, bulk data onboarding)
9. **`4C` — Inaugural Donation campaign seeding** (tied to import)
10. **`4D` — PWA manifest + service worker + install banner** (mobile experience)
11. **`4E-2` — Rate limiting on auth** (security hardening)
12. **`4E-4` — Cloudinary file uploads** (production data safety)

---

## 10. FILE STRUCTURE AFTER FULL IMPLEMENTATION

```
src/
  lib/
    tokenManager.js          ← NEW (4F)
    queryKeys.js             ← NEW (4I)
    healthCheck.js           ← NEW (4E-5)
    apiClient.js             ← MODIFY (use tokenManager)
  components/
    InstallBanner.jsx        ← NEW (4D)
    OfflineBanner.jsx        ← NEW (4G)
  pages/
    admin/
      ImportPage.jsx         ← NEW (4A)
    MemberDashboard.jsx      ← MODIFY (add 4H upcoming dues)
    Members.jsx              ← MODIFY (add 4B Add Member dialog)

public/
  icons/
    icon-192x192.png         ← NEW (4D)
    icon-512x512.png         ← NEW (4D)
  templates/
    member_import.csv        ← NEW (template download)
    challan_history_monthly.csv ← NEW (template download)
    campaign_payments.csv    ← NEW (template download)

vite.config.js               ← MODIFY (add VitePWA plugin)
index.html                   ← MODIFY (PWA meta tags)

# Backend:
app/
  main.py                    ← MODIFY (CORS env var, slowapi)
  utils/
    file_handler.py          ← MODIFY (Cloudinary)
  models/models.py           ← VERIFY (approved_at on Challan)

import_historical_data.py    ← NEW (standalone seed script, root level)
member_import.csv            ← DATA (root level, for import)
challan_history_monthly.csv  ← DATA (root level, for import)
campaign_payments.csv        ← DATA (root level, for import)
```

---

End of prompt.
