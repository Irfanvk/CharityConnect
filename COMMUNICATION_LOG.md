# Communication Log (Frontend + Backend)

**Project:** CharityConnect  
**Purpose:** Decisions, meeting minutes, and action items  
**Owner:** Integration Lead  
**Last Updated:** 2026-06-01

---

## Decision Log

| Date | Decision | Owner | Status | Notes |
|------|----------|-------|--------|-------|
| 2026-08-26 | Outstanding Receivables PDF export changed to a compact member matrix | Frontend | ✅ | The PDF now groups unpaid challans by member and shows monthly/campaign counts, amounts, total challan count, and total outstanding amount per member. The on-screen paginated drill-down and detailed CSV export remain unchanged. |
| 2026-08-26 | Reports receivables and Campaigns donor lists optimized for reliable production use | Both | ✅ | Backend added `GET /challans/outstanding` with database-side unpaid count/amount aggregation and bounded pagination. Reports now loads receivables totals without downloading all challans, paginates the drill-down list, preserves complete CSV/PDF export behavior, and defers full challan history until Donations/Challans tabs are used. Campaigns donor-list loading is on demand with a loading state; existing API contracts, permissions, data, and closeable list behavior are preserved. |
| 2026-08-08 | Campaign donation flow switched to pending approval before it reaches member statements | Both | ✅ | Members can donate from Campaigns page; frontend submits to the new campaign donation route, backend stores the donation as a pending challan, and Profile/MemberDashboard only count approved challans. Recurring donation stays separate. |
| 2026-06-01 | Community directory: member ID hidden from regular members | Frontend | ✅ | In `Community.jsx` member directory cards, the `member_code`/`member_id` sub-line is now conditionally rendered — visible only when `isAdmin` is true. Regular members see only the member name and status badge. Admins/superadmins still see the code in grey below the name. No backend changes required. |
| 2026-06-01 | Community page rewritten as full member directory + MemberWatermark screenshot accountability | Frontend | ✅ | **Community.jsx** completely rewritten (305 lines, single export): role-split queries (admin uses existing `GET /members/` with limit 300; members use new `GET /members/community`); full-width 3-col responsive grid with live search (name/ID); stats row (total members, active, collection, balance); spending pie chart (recharts) by fund-utilization category; collection timeline grid (today/week/month/year/all-time). **MemberWatermark.jsx** (new): fixed `position:fixed` overlay, SVG `data:image/svg+xml` tile encoded as background-image, repeated at 260×120 px, rotated −30 °, 4.5 % opacity, `pointer-events:none`, z-index 40 — imperceptible in normal UI use but clearly legible in any screenshot/screen-recording, enabling admins to identify the source member. Admins and superadmins are excluded (no overlay). **Layout.jsx** updated to import and wrap the entire app shell in `<MemberWatermark>` so every authenticated page carries the watermark — not just Community. **MemberDashboard.jsx** updated: removed the confusing "Member list preview is not available for your role yet." message; replaced with a "Fellow Members" dashed card showing up to 10 member pills and a "See all members →" ghost button linking to the Community page; falls back to a direct link if list is empty. Backend endpoints (`GET /members/community`, `GET /challans/community-stats`, fund-utilization summary access) were already committed and pushed in a prior session. |
| 2026-05-25 | App rebranded from CharityHub to **PMB GCC PORTAL** | Frontend | ✅ | App name changed to `PMB GCC PORTAL`, tagline/description set to `PMB GCC - Official Charity App`. Updated: browser `<title>`, `<meta description>`, apple-mobile-web-app-title, PWA `manifest.json` (name/short_name/description), `APP_BRAND` constants in `appPaths.js`, Android/iOS/PWA install prompt text, PDF headers and footers in Reports and FinancialSummaryPanel, invite message in Settings, and Landing page body text. Internal storage keys and SVG asset file paths intentionally left unchanged to avoid breaking existing user data. |
| 2026-05-25 | Profile page refactored — all users get avatar and per-field edit access | Frontend | ✅ | Avatar camera (change) and remove buttons now permanently visible for all roles — no longer gated behind an admin-only "Edit Profile" toggle. Per-field pencil buttons for email, username, full name, phone, and address are now shown for **all roles** (previously member-only). Role-based flow: members go through the existing `profile_update` request → admin approval → notification pipeline; admins/superadmins get a direct-save dialog calling `PUT /users/{id}`. Removed the admin-only inline edit form (`editing` state, `formData`, `handleSave`) that bypassed the request system. Email now has an edit button (was missing for all roles). No backend changes required. |
| 2026-05-25 | Login page crash (temporal dead zone) fixed | Frontend | ✅ | `redirectTarget` was declared with `const` after the `useEffect` that referenced it in `Login.jsx`, causing `ReferenceError: Cannot access 'redirectTarget' before initialization` on every page load. Fixed by moving `returnToParam`, `isSafeReturnTo`, and `redirectTarget` declarations above the `useEffect`. No backend changes required. |
| 2026-05-01 | Login page hardened with UX and security best practices | Frontend | ✅ | Added show/hide password toggle (Eye/EyeOff). Already-authenticated users are redirected away via `useEffect` on `isAuthenticated`. Username is trimmed before submit to prevent accidental whitespace rejections. HTTP status codes mapped to user-friendly messages: 401/403 → "Invalid username or password.", 429 → rate-limit notice, 5xx/network → server unavailable message. No backend changes required. |
| 2026-05-01 | App-wide safety, security, and quality audit completed and fixes applied | Frontend | ✅ | **Security:** Open redirect in `Login.jsx` patched (only relative paths starting with `/` and not `//` accepted as `returnTo`); `localStorage.setItem('user', …)` dead code removed (PII leak). **Routing:** `'Import'` added to `SUPERADMIN_PAGES` set in `App.jsx` — `/Import` was previously accessible to any authenticated user. **Resilience:** `AppErrorBoundary` class component wraps the entire app tree in `App.jsx`; unhandled render errors show a friendly reload screen instead of a white crash. **Auth:** `auth:expired` handler in `AuthContext.jsx` now guards against redirect loop by returning early if already on the login path. **Queries:** `query-client.js` retry policy changed from flat `retry: 1` to a function that skips retries on 4xx (prevents double-firing `auth:expired` on 401). **UX:** `Members.jsx` `createMutation` and `updateMutation` now have `onError` toast handlers — previously silent failures. `Layout.jsx` non-admin pending-request count polling now uses `limit: 1` + `page.total` instead of fetching 200 full records. `FinancialSummaryPanel.jsx` PDF colour constants moved to module level. No backend changes required. |
| 2026-05-01 | Financial Position summary panel added to admin Reports page | Frontend | ✅ | New `FinancialSummaryPanel` component (`src/components/reports/FinancialSummaryPanel.jsx`) rendered above report tabs for admin/superadmin only. Displays 6 metric cards: Gross Receipts, Total Disbursements, Net Balance (highlighted), MTD Receipts, YTD Receipts, Outstanding Receivables. Receivables card is clickable and opens a drill-down dialog showing all pending/generated challans in a table. All data sourced from existing backend endpoints: `GET /challans/collection-stats` (TanStack key `["challans","collection-stats"]`) and `GET /fund-utilizations/summary` (key `["fund-utilizations","summary"]`). CSV and PDF exports available for both the summary statement and the receivables drill-down. PDF uses `Rs.` prefix (jsPDF Helvetica cannot render ₹ U+20B9). Outstanding Receivables label includes `as of [date]` throughout UI, CSV header, and PDF. No new backend endpoints needed. | Backend now supports `from_month` query override in payable-months logic and route; frontend challan form now includes start-month control, selectable month range flow, and from-month aware fetching. Pending: run post-deploy smoke checks on Render/Netlify and sync backend-repo changelog entry if backend repo log is maintained separately. |
| 2026-04-20 | Cloudinary integrated as primary file storage for uploads, avatars, and payment proofs; replaces previous Cloudflare R2/local-disk approach | Both | ✅ | Backend: `cloudinary==1.44.2` installed; `file_handler.py` rewritten to use Cloudinary SDK with local-disk fallback for dev; `config.py` extended with `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET/CLOUDINARY_FOLDER`; `file_routes.py` gains `POST /files/upload/avatar` and `DELETE /files/delete`. Frontend: `apiPaths.js` updated with `files.uploadAvatar` and `files.deleteFile` paths; `filesApi.js` exports `uploadAvatar()` and `deleteFile()`; `charityClient.js` `files` namespace extended with matching methods |
| 2026-04-08 | Member identity popover standardized to include avatar/full name/member id/address/phone/direct-message action | Frontend | ✅ | Shared `UserProfilePopover` enhanced and used by admin-facing identity triggers (Members/Challans/Settings user tables where popover is already present) |
| 2026-04-07 | Members selector moved from basic dropdown to combo-box pattern with improved searchability | Both | ✅ | Frontend switched control type; backend follow-up added server-side filtering support for combo-box query behavior |
| 2026-04-01 | Invite-code sharing expanded with WhatsApp-first workflow | Both | ✅ | Added WhatsApp share flow for admin invites; backend/frontend message composition and invocation aligned |
| 2026-03-31 | Profile avatar support implemented end-to-end | Both | ✅ | Avatar fields surfaced in user/member UI and backend responses/storage handling updated |
| 2026-03-31 | Challan CORS and campaign update regressions resolved | Both | ✅ | Addressed integration breakages affecting challan actions and campaign update consistency |
| 2026-03-30 | Collection-stats visibility control added for member-facing dashboards | Frontend | ✅ | Added admin preference toggle and member visibility gating for collection stats widgets |
| 2026-03-30 | iPhone-specific layout compatibility pass (attempt 2) | Frontend | ✅ | Additional responsive fixes for iOS viewport and interaction edge cases |
| 2026-03-28 | Notifications/API call reliability enhancement pass | Both | ✅ | Improved notification behavior and API-call resilience/consistency |
| 2026-03-26 | iPhone runtime/layout compatibility pass (attempt 1) | Frontend | ✅ | Early iOS fixes applied prior to later cleanup pass |
| 2026-03-25 | API and README contract documentation corrected | Both | ✅ | Updated docs to match active runtime contract and integration flow |
| 2026-03-24 | Request-folder structural issue fixed | Frontend | ✅ | Restored correct request module wiring and folder flow |
| 2026-03-18 | Frontend notification state moved to shared React context | Frontend | ✅ | Added provider for `notifications`, `unreadCount`, polling refresh, and read actions to avoid duplicate per-page unread logic |
| 2026-03-18 | Notifications page aligned to backend feed and patch-read contracts | Both | ✅ | Consumes `GET /notifications/feed`; uses `PATCH /notifications/read` for selective and mark-all read updates |
| 2026-03-18 | Superadmin chart widgets now consume backend dashboard aggregates | Both | ✅ | Dashboard wired to `GET /admin/dashboard/charts` for campaign progress, monthly donations, and top donors (`recharts` rendering) |
| 2026-03-18 | v2.12 member requests UI migrated to explicit member/admin flows | Frontend | ✅ | Added dedicated pages and routing for `/requests` (member) and `/admin/requests` (admin), plus role-based navigation badge for pending requests |
| 2026-03-18 | Profile change requests aligned to backend approval workflow | Frontend | ✅ | Profile screen now submits `monthly_amount_change`, `profile_update`, and `complaint/suggestion/general` requests with pending-request guardrails |
| 2026-03-18 | Request outcome UX added to notifications | Frontend | ✅ | Notifications now render request-specific icons for `Request Approved` and `Request Update` events |
| 2026-03-18 | Backend CORS configuration hardened with environment-driven allow list | Backend | ✅ | Updated `config.py` to read `ALLOWED_ORIGINS` from env variable; updated `.env.example` with production configuration guidance |
| 2026-03-18 | Import wizard page completed with 3-step CSV upload UI | Frontend | ✅ | Created `src/pages/Import.jsx`: Step 1 drag-drop upload (Members required, Challans/Campaign optional), Step 2 CSV preview with warning notes, Step 3 progress tracking + result badges |
| 2026-03-18 | Campaign import note added to wizard about "Inaugural Donation" campaign requirement | Frontend | ✅ | Step 2 preview shows warning when campaign payments CSV detected; user reminded that required campaigns must exist before import |
| 2026-03-18 | Add Member dialog enhanced with invite code creation reminder | Frontend | ✅ | Blue info box in dialog footer (new members only): "After adding, create an invite code so this member can set their own password." |
| 2026-03-18 | Import wizard registered in navigation and routing system | Frontend | ✅ | Added `Import` to `ROUTE_KEYS`, `PAGE_PATHS`, `pages.config.js`; added nav item with Upload icon (superadmin-only) in Layout |
| 2026-03-18 | Member dashboard enhanced with Upcoming Dues section | Frontend | ✅ | Shows pending monthly challans grouped by month; displays outstanding badge + Pay Now button per record; total Due amount summary |
| 2026-03-18 | Query keys standardization completed with factory pattern | Frontend | ✅ | Created `src/lib/queryKeys.js` with queryKeys factory covering: members, challans, campaigns, notifications, invites, audit logs, health, import status |
| 2026-03-18 | Backend health check endpoint confirmed operational | Frontend | ✅ | `GET /health` endpoint verified in `main.py`; frontend `checkBackendHealth()` probes endpoint with 5s timeout |
| 2026-03-18 | Offline detection banner enabled for all users | Frontend | ✅ | Created `src/components/OfflineBanner.jsx`; listens to browser online/offline events; displays yellow banner during connectivity loss |
| 2026-03-18 | Backend health status banner added to startup sequence | Frontend | ✅ | Created `src/components/BackendHealthBanner.jsx` + `src/lib/healthCheck.js`; shows yellow status banner with retry logic (8s intervals) until backend online |
| 2026-03-18 | Android install prompt implemented with beforeinstallprompt handler | Frontend | ✅ | Created `src/components/AndroidInstallPrompt.jsx`; Shows Install/Later buttons; calls `deferredPrompt.prompt()` on Android devices |
| 2026-03-18 | iOS install prompt implemented with fallback share guidance | Frontend | ✅ | Created `src/components/IOSInstallPrompt.jsx`; Shows only on iOS non-standalone mode; share icon directs to add-to-home-screen flow |
| 2026-03-18 | PWA update prompt integrated for safe service worker updates | Frontend | ✅ | Created `src/components/PWAUpdatePrompt.jsx`; uses `virtual:pwa-register/react` with Update Now (reload) + Later buttons |
| 2026-03-18 | Device utility library created for iOS and storage detection | Frontend | ✅ | Created `src/lib/device.js`: exports `isIOSDevice()` (checks Safari + maxTouchPoints), `isStandalone()`, `safeLocalStorage()` (try/catch for Private mode) |
| 2026-03-18 | Token security hardened with in-memory storage + session expiry event | Both | ✅ | Created `src/lib/tokenManager.js`; charityClient now stores token in-memory with localStorage fallback; dispatches `auth:expired` on 401; AuthContext handles graceful session timeout |
| 2026-03-18 | Netlify SPA configuration added for production deployment | Frontend | ✅ | Created `public/_redirects` (wildcard SPA rewrite) and `netlify.toml` (build config, asset cache, security headers, manifest headers) |
| 2026-03-16 | Frontend is now production-prepped for Vercel hosting | Frontend | ✅ | Added `vercel.json` (SPA rewrites, security headers, immutable asset cache), updated `.env.example`, and documented backend CORS requirements for deployed frontend domains |
| 2026-03-15 | Campaigns now support goal mode (`targeted`/`unlimited`) and duration mode (`fixed`/`open`) in frontend and API contract docs | Frontend | ✅ | Form submits `target_mode`, `end_date_mode`, nullable `target_amount`, nullable `end_date`; campaign cards/reports/dashboard now render unlimited and open-ended campaigns safely |
| 2026-03-15 | Dashboard and Campaign screens now load full paginated datasets for reliable totals | Frontend | ✅ | Replaced single-page fetch behavior with skip/limit batching for members, campaigns, and challans to avoid default limit caps (ex: active members showing 20) |
| 2026-03-15 | Campaign payment import visibility fixed by backend aggregate fields on campaign responses | Both | ✅ | Backend now returns `collected_amount` + `participants_count` per campaign from approved campaign challans; frontend still includes safe fallback aggregation from challans |
| 2026-03-15 | Wipe operation now shows dismissible 10-second result notification | Frontend | ✅ | Members page displays in-page wipe result banner with close icon and auto-dismiss timer after success/failure |
| 2026-03-15 | Superadmin wipe password confirmation validated server-side against stored hash for all 3 entries | Backend | ✅ | `/admin/system/wipe` verifies each confirmation attempt via `verify_password` against `actor.password_hash`; no plaintext password persistence |
| 2026-03-15 | Added dedicated CSV imports for monthly challan history and campaign payments | Both | ✅ | Superadmin can import files from Members page; backend creates challan rows and auto-resolves/creates campaign records for campaign payment imports |
| 2026-03-14 | Members panel pagination enabled with page-size options (20/50/100) | Frontend | ✅ | Added page navigation + range summary; pagination resets correctly on search/sort/page-size changes |
| 2026-03-14 | Members page now fetches full member set via paginated batching (skip/limit loop) | Frontend | ✅ | Fixes issue where only first 100 members were visible after import |
| 2026-03-14 | Added superadmin-only wipe action in Members page with typed confirmation (`WIPE`) and options to keep admins + wipe file storage | Both | ✅ | Frontend dialog calls backend `/admin/system/wipe`; backend preserves superadmins always |
| 2026-03-14 | Backend `/members/import` expanded to accept historical CSV variants (`si_no`, `username`, `period`, campaign rows) | Backend | ✅ | Import now links by member_code/username/email/phone, supports campaign challans, and auto-creates campaign from `suggested_campaign_name` when missing |
| 2026-03-14 | Members import UX now includes file guidance and static template links under superadmin import controls | Frontend | ✅ | Added links for members/monthly/campaign templates and auto-enable donation mode for challan/campaign file names |
| 2026-03-14 | Members page actions aligned to superadmin-only creation policy | Frontend | ✅ | Non-superadmin users no longer see Add Member action; UI now mirrors backend authorization for member create/import |
| 2026-03-14 | Added members import UI workflow for CSV/XLSX ingestion | Frontend | ✅ | Superadmin can upload `.csv/.xlsx`, toggle include donation history, and submit import to backend |
| 2026-03-14 | Added member import API client integration and import summary callbacks | Frontend | ✅ | Added `API_PATHS.members.import` and `charityClient.members.importFromFile`; success/error toasts show created/linked/challan/skipped stats |
| 2026-03-14 | Updated members delete visibility guard to role-based superadmin check | Frontend | ✅ | Consolidated UI checks to `user.role === "superadmin"` for consistency with backend policy |
| 2026-03-08 | Standardized documentation policy: future updates go only to CHANGELOG/COMMUNICATION_LOG/API changelog files | Both | ✅ | Removed temporary merge/integration summary docs from root; avoid creating one-off summary markdown files going forward |
| 2026-03-08 | Fixed audit logs 422 validation error (empty query param handling) | Both | ✅ | Frontend filters empty params; Backend normalizer maps user_id/action/entity_type to formatted fields; Audit Logs page now functional |
| 2026-03-08 | Fixed admin bulk operations 500 error (auth context mismatch in dict-based JWT) | Backend | ✅ | Added _is_admin_role() helper for safe dict access in admin routes; All 4 endpoints now return 200 |
| 2026-03-08 | Enhanced login authentication to accept username OR email (auto-detection) | Both | ✅ | Single identifier field in backend; Frontend updated with "Username or Email" label; Full end-to-end testing passed |
| 2026-03-08 | Enforced username uniqueness across all users with 409 CONFLICT response | Both | ✅ | Backend returns 409 on duplicate; Frontend validates format (3-30 chars, alphanumeric+underscore/hyphen); Real-time UI feedback |
| 2026-03-08 | Enhanced registration form with real-time username validation and inline error display | Frontend | ✅ | Added validateUsername() function; Shows green/red feedback during form entry; Comprehensive test suite all passed |
| 2026-03-04 | Frontend enforces global unauthorized session handling (401 → token clear + login redirect + returnTo) | Frontend | ✅ | Applies to protected API calls with login/register exclusions to avoid redirect loops |
| 2026-03-04 | Frontend added one-time "Session expired" toast on login after forced unauthorized redirect | Frontend | ✅ | Toast is bridged via sessionStorage marker and shown only once per invalidation event |
| 2026-03-04 | Frontend implemented bulk challan v1.1 integration (create + pending review + approve/reject-all actions) | Frontend | ✅ | Dashboard tab and challan multi-month bulk-create routing completed |
| 2026-03-03 | Backend implemented bulk challan operations v1.1 (models, schemas, routes, audit logging) | Backend | ✅ | Complete implementation: POST /challans/bulk-create, GET /admin/bulk-pending-review, PATCH approve/reject endpoints |
| 2026-03-03 | Bulk challan operations enable 200+ member scalability | Both | ✅ | v1.1 enhancement: Month multi-select, single-action approval, 10x admin speedup |
| 2026-03-03 | Frontend API client hardened with response/payload compatibility mappings | Frontend | ✅ | Added aliases for date and member fields, FormData header safety, and standardized backend error parsing |
| 2026-03-03 | Challan approval/rejection/proof flows aligned to documented backend endpoints | Frontend | ✅ | Uses dedicated `/approve`, `/reject`, and `/upload-proof` methods instead of generic update assumptions |
| 2026-03-03 | Audit log create payload mapped to backend schema | Frontend | ✅ | Maps `action_type/target_*` to backend `action/entity_*` fields to avoid contract clashes |
| 2026-03-03 | Admin member edit now fetches latest record before opening editable form fields | Frontend | ✅ | Prevents stale values and aligns edit state with persisted backend data |
| 2026-03-03 | Member detail fetch failures in admin edit flow now surface destructive toast feedback | Frontend | ✅ | Provides immediate operator feedback instead of silent failure |
| 2026-03-02 | Admin Reports page rebuilt into modular 3-tab reporting suite with per-report CSV export | Frontend | ✅ | Members/Donations/Challans tabs with period filters and tab-specific CSV schema |
| 2026-03-03 | Implement bulk challan creation and approval operations (v1.1) | Backend | 🔄 | Reduce admin workload from 5 min to 30 sec per bulk payment; handle 200+ members efficiently |
| 2026-03-02 | Frontend migrated to canonical notification and invite contract usage | Frontend | ✅ | Removed `/notifications/send` fallback; invite expiry display uses `expiry_date` |
| 2026-03-01 | Active frontend flows migrated from deprecated `entities.*` to resource APIs | Frontend | ✅ | Aligns runtime behavior with resource client contract |
| 2026-03-01 | Notifications page switched to supported notification methods with compatibility aliases | Frontend | ✅ | Resolved `Notification.create is not a function` runtime issue |
| 2026-03-01 | Dashboard render hardened against undefined datasets post-login | Frontend | ✅ | Prevents post-login blank-screen crash |
| 2026-03-01 | Non-admin users get a dedicated member dashboard view | Frontend | ✅ | Member profile, challan insights, upcoming dues, campaign participation |
| 2026-03-01 | Dashboard render path split by role (`superadmin` / `admin` / `member`) | Frontend | ✅ | Prevents mixed admin/member UI exposure |
| 2026-03-01 | Challans UI derives "Proof Uploaded" from `pending + proof_uploaded_at` | Frontend | ✅ | Keeps UI readable while preserving backend status model |
| 2026-03-01 | Non-admin challan visibility constrained to linked member record (fallback: creator email) | Frontend | ✅ | Access-scope hardening in Challans page |
| 2026-03-01 | Rejected challans support proof re-upload for authorized users | Frontend | ✅ | Requires backend to keep transition-to-pending behavior |
| 2026-02-26 | Frontend auth redirect handled by context state (not global 401 hard redirect) | Frontend | ✅ | Superseded by 2026-03-04 global 401 handling update; original approach prevented login loop and session bounce |
| 2026-02-26 | Login success flow updates context session immediately | Frontend | ✅ | Removes race between login and auth guard |
| 2026-02-26 | Logout action must be visible in app shell for authenticated users | Frontend | ✅ | Added header-level logout button |
| 2026-02-26 | Public app settings call is optional when app_id missing | Frontend | ✅ | Skip endpoint to avoid 404 noise |
| 2026-02-24 | Use resource-specific API routes (no generic /entities) | Backend | ✅ | Avoid abstraction mismatch |
| 2026-02-24 | Login accepts email and username | Backend | ✅ | Aligns with frontend Login.jsx |
| 2026-02-24 | Add /files/upload endpoint | Backend | ✅ | Matches frontend proof upload flow |
| 2026-02-24 | Registration collects username + password | Frontend | ✅ | Required for auth flow |
| 2026-02-24 | Disable RecurringDonation and Request in Phase 1 | Both | ✅ | Phase 2 feature set |

---

## Pending Items

- 2026-08-08: Verify the new campaign donate dialog and backend approval flow in a deployed environment so only approved donations appear in member statements.
- 2026-08-08: Decide whether recurring-donation should remain visible in the Campaigns page if the backend proxy remains disabled for that Phase 2 path.

## 2026-03-04 - Frontend to Backend Communication (Unauthorized Session Handling Update)

## 2026-04-22 - Frontend to Backend Communication (Pending Tracker Update)

**Summary:** Previously identified challan month-selection gaps are now implemented across backend and frontend. This update also records the remaining pending verification/documentation items.

### Completed Since Prior Pending List

1. **Backend payable-months enhancements**
   - Added optional `from_month=yyyy-MM` support in payable-months route.
   - Updated service start-month resolution to support explicit month override and avoid new-member empty-month edge cases.

2. **Frontend challan form enhancements**
   - Added start-month selection control for monthly challans.
   - Added from-month-aware payable-month fetch behavior.
   - Added improved monthly-selection experience for range and multi-month payment handling.

### Pending Items (Backend + Frontend)

1. **Production smoke verification (pending)**
   - Validate Netlify frontend + Render backend flow for payable months with `from_month` scenarios:
     - Start from specific month (example: January 2026)
     - Current month onward
     - Include upcoming months

2. **Backend-repo changelog sync (pending if maintained separately)**
   - If backend changelog is tracked in the backend repository, mirror this payable-month update there for parity.

3. **Custom domain rollout validation (pending until domains are registered)**
   - Re-run notification and challan regression checks once custom domains replace default `*.netlify.app` and `*.onrender.com` hosts.

## 2026-03-18 - Frontend to Backend Communication (v2.12 Request Lifecycle)

**Summary:** Frontend request flows were migrated to the v2.12 member-request lifecycle with explicit member/admin routes and approval-aware profile actions.

### Frontend Changes Applied

1. **Dedicated request pages and route split**
   - Added member requests view at `/requests`.
   - Added admin moderation view at `/admin/requests`.
   - Preserved compatibility by mapping legacy requests page export to member requests.

2. **Profile-driven request submission**
   - Monthly amount change now submits `request_type=monthly_amount_change` with `requested_amount`.
   - Field updates (`full_name`, `phone`, `address`) now submit `request_type=profile_update` with structured `requested_changes`.
   - Added general request submission types: `complaint`, `suggestion`, `general`.

3. **Pending request awareness in navigation and forms**
   - Sidebar now shows pending request badge count for both member and admin contexts.
   - Profile action buttons are disabled when a pending request already exists for the same field/change type.

4. **Request outcome visualization**
   - Notifications UI now differentiates request outcomes using title-based icon rendering for approval/update statuses.

### Backend Confirmation Requested

- Keep canonical request enums stable:
  - `request_type`: `monthly_amount_change`, `profile_update`, `complaint`, `suggestion`, `general`
  - `status`: `pending`, `approved`, `rejected`
- Preserve admin moderation endpoints:
  - `GET /admin/requests/`
  - `PATCH /requests/{id}/approve`
  - `PATCH /requests/{id}/reject`
- Preserve member endpoints:
  - `POST /requests/`, `GET /requests/`, `DELETE /requests/{id}`

### Status

- Frontend implementation complete for v2.12 request lifecycle.

**Summary:** Frontend now treats backend `401` responses as an expired/invalid session event and forces a clean re-login flow.

### Frontend Changes Applied

1. **Global unauthorized interception in API client**
   - On `401`, frontend now clears stored `auth_token` and redirects to login with `returnTo`.
   - Redirect is skipped for `/auth/login` and `/auth/register` requests.

2. **Session-expired user feedback**
   - A one-time marker is set before redirect.
   - Login route consumes marker and shows destructive toast:
     - `Session expired`
     - `Please sign in again to continue.`

3. **Loop prevention behavior**
   - If already on login page, frontend does not force another redirect.
   - Toast marker is removed immediately after showing to avoid repeated messages.

### Backend Confirmation Requested

- Keep `401` as canonical response for invalid/missing/expired JWT on protected endpoints.
- Preserve structured error response compatibility (`detail` string or `detail[]`).
- Continue `403` usage for role/permission denial when token is valid.

### Status

- Frontend implementation complete and documented in Patch 1.9.

---

## Meeting Minutes

### 2026-02-24 - Phase 1 Integration Readiness
**Attendees:** Backend team, Frontend team  
**Agenda:** Align API contracts, confirm Phase 1 readiness, schedule integration testing  
**Notes:**  
- Frontend completed API client refactor, Login/Register updates, and proof upload integration.
- Backend implemented email/username login and /files/upload endpoint.
- Integration testing can start once services are running locally.

**Action Items:**
- [ ] Frontend to start integration testing using INTEGRATION_TESTING_GUIDE.md. (Owner: Frontend, Due: 2026-02-25)
- [ ] Backend to monitor auth and upload logs during testing. (Owner: Backend, Due: 2026-02-25)
- [ ] Both teams to schedule a 2-hour joint testing session. (Owner: Both, Due: 2026-02-25)

---

## Frontend Status Report (2026-02-24)

**Completed:**
- API client refactored (resource-specific routes)
- Login accepts email or username
- Registration with username + password
- ProofUpload integrated with /files/upload endpoint
- Build system working (dist/ directory produced)

**Ready for Backend Coordination:**
- Waiting on backend confirmations below

---

## Backend Confirmation Checklist

**Port Configuration:**
- Backend running on http://localhost:8000
- CORS enabled for http://localhost:5173

**Critical Endpoints:**
- POST /auth/login - Accept email or username + password
- POST /auth/register - Username + password with invite code
- POST /files/upload - File upload (3MB max, JPG/PNG/PDF)
- GET/POST /members - CRUD operations
- GET/POST /challans - CRUD operations
- GET/POST /campaigns - CRUD operations
- GET /notifications - Notification polling

**Authentication:**
- Token format confirmed (JWT bearer)
- Token expiration behavior documented
- Token location in response confirmed (access_token)

**Blockers to Flag:**
- Standardized error response format across endpoints
- Validation error format (field-level vs message-only)
- File upload response format for /files/upload

**Testing Requirements:**
- Mock/test data seeded in database
- Test user credentials shared for login testing
- Sample files available for upload testing (optional)

---

## Backend Readiness Checklist

- [ ] Backend server running on http://localhost:8000
- [ ] Swagger UI accessible at http://localhost:8000/docs
- [ ] Database reachable and tables created
- [ ] Admin test user available
- [ ] Member test user available
- [ ] Valid invite code available
- [ ] /auth/login accepts email or username
- [ ] /auth/register creates user + member with invite
- [ ] /files/upload accepts JPG/PNG/PDF under 3MB
- [ ] CORS allows http://localhost:5173
- [ ] Logs monitored during integration tests

---

## 📨 Message to Frontend Team (2026-02-24)

**Status:** Backend is ready for Phase 1 integration testing

**Backend Environment:**
- Base URL: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- CORS: Enabled for `http://localhost:5173`

**Test Credentials:**
```
Admin User:
  Email: admin@charityconnect.com
  Username: admin
  Password: [TO BE SEEDED - Backend will provide]

Member User:
  Email: member@charityconnect.com
  Username: testmember
  Password: [TO BE SEEDED - Backend will provide]

Valid Invite Code: [TO BE SEEDED - Backend will provide]
```

**Endpoint Contracts:**

1. **POST /auth/login**
   - Request: `{ "email": "...", "password": "..." }` OR `{ "username": "...", "password": "..." }`
   - Success: `200 { "access_token": "eyJ...", "token_type": "bearer" }`
   - Error: `401 { "detail": "Invalid credentials" }`

2. **POST /auth/register**
   - Request: `{ "username": "...", "email": "...", "password": "...", "full_name": "...", "invite_code": "..." }`
   - Success: `201 { "access_token": "...", "token_type": "bearer" }`
   - Error: `400 { "detail": "Invalid invite code" }` or `409 { "detail": "Email/username already exists" }`

3. **POST /files/upload**
   - Request: `multipart/form-data` with `file` field
   - Success: `200 { "file_url": "/uploads/proofs/uuid-filename.jpg", "filename": "uuid-filename.jpg" }`
   - Error: `400 { "detail": "File too large (max 3MB)" }` or `400 { "detail": "Invalid file type. Only JPG, PNG, PDF allowed" }`

**Standard Error Response Format:**
```json
{
  "detail": "Human-readable error message"
}
```

**Authentication Header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
- Token expires in 60 minutes
- Include header in all protected endpoint requests

**Next Steps:**
1. Backend team will seed test users and invite code (ETA: within 1 hour)
2. Backend will share actual credentials via this log
3. Frontend can begin testing sequence from INTEGRATION_TESTING_GUIDE.md:
   - T1: Login with Email
   - T2: User Registration
   - T3: File Upload with Proof
4. Schedule 2-hour joint testing session for real-time issue resolution

**Questions or Blockers?**
- Add them to "Open Questions" section below

---

## Open Questions
- Backend: confirm canonical login token key (`access_token` preferred) and keep backward compatibility for existing key variants during transition.
- Backend: confirm `/auth/me` returns a full user object for valid token in all environments.
- Backend: confirm `/health` endpoint availability and expected lightweight response.

---

## 2026-02-26 - Frontend to Backend Communication (Auth Stabilization)

**Summary:** Frontend patch 1.1 resolved login-loop/logout-visibility issues and now requests contract confirmations below.

### Items to Communicate to Backend

1. **Token response contract alignment**
   - Frontend now accepts `access_token`, `accessToken`, `token`, and nested `data.*` variants.
   - Request backend to standardize on `access_token` as canonical response key.

2. **/auth/me reliability requirement**
   - If token is valid: return full user payload.
   - If invalid/expired: return `401` only.
   - Avoid returning `200` with null body for authenticated checks.

3. **Public settings by app id behavior**
   - Frontend now skips `GET /api/apps/public/prod/public-settings/by-id/{appId}` when app id is not configured.
   - Request backend to document expected response for missing/invalid app id.

4. **Health endpoint contract**
   - Frontend startup checks `GET /health`.
   - Request backend to keep this endpoint stable and unauthenticated for reachability checks.

### Frontend Validation Completed

- `npm run lint` → ✅ Pass
- `npm run build` → ✅ Pass

---

## 2026-02-26 - Backend Contract Follow-up (Post-Review)

**Status:** Backend updated for auth contract alignment.

### Backend Changes Applied

1. **`POST /auth/register` response aligned**
   - Now returns token payload shape:
     - `access_token`
     - `token_type`
     - `user`
   - Status code set to `201`.

2. **Register request backward compatibility improved**
   - `full_name` is now accepted as an optional field in register payload (ignored by backend for now).

3. **Conflict responses standardized for registration**
   - Duplicate username → `409`.
   - Duplicate email → `409`.

4. **`GET /auth/me` invalid-auth behavior tightened**
   - Missing/invalid/stale token now returns `401` (no null/200 fallback).

### What Frontend Should Do

1. Prefer `access_token` as canonical key (existing fallback handling can remain temporarily).
2. For registration flow, consume returned token directly after successful `201`.
3. Handle `409` in registration UI for duplicate username/email.

### Notes

- `/health` remains stable and unauthenticated.
- `/files/upload` contract remains aligned (`file_url`, `filename`; JPG/PNG/PDF up to 3MB).

---

## 2026-03-01 - Backend to Frontend Communication (Unauthorized Triage)

**Summary:** Frontend reported `Unauthorized`. Backend reviewed and aligned auth/authorization behavior to match frontend expectations and role-based route access.

### Backend Findings

1. **Service reachability affects auth checks**
   - If backend is down/unreachable on `http://localhost:8000`, frontend may surface auth-like failures.
   - `GET /health` remains the first startup verification endpoint.

2. **Role check mismatch fixed in backend routes**
   - Some route logic was checking `current_user.is_admin` (non-existent in JWT payload).
   - Updated to role-based checks using JWT `role` (`admin`/`superadmin`).

3. **Current token payload contract (canonical)**
   - `access_token` contains JWT with `sub` and `role` claims.
   - Frontend should continue using `Authorization: Bearer <token>` for protected endpoints.

### Frontend Contract Alignment (Actionable)

1. **Use role-appropriate endpoints**
   - Member self profile: `GET /members/me`.
   - Member attempting `GET /members/` should expect authorization denial (admin-only route).

2. **Auth error handling expectation**
   - Invalid/missing/expired token: backend returns `401` with `{ "detail": "Invalid token" }`.
   - Permission mismatch (valid token, wrong role): backend returns `403`.

3. **Startup check sequence**
   - Step 1: Confirm `GET /health` is reachable.
   - Step 2: Perform `POST /auth/login` and store `access_token`.
   - Step 3: Confirm session via `GET /auth/me`.

### Status for Frontend Team

- Backend auth contract remains: canonical token key is `access_token`.
- Register flow remains: `POST /auth/register` returns `201` with token payload.
- Unauthorized triage fix is applied on backend side for member/challan role checks.

---

## 2026-03-01 - Frontend to Backend Communication (Challans Integration)

**Summary:** Frontend challan workflow was aligned with role-based visibility and direct resource APIs. No hard blocker, but contract confirmations are needed.

### Items to Communicate to Backend

1. **Proof-upload state contract**
   - Frontend treats uploaded proof as:
     - `status = pending`
     - `proof_uploaded_at` populated
   - Please confirm this remains the canonical behavior.

2. **Rejected → Re-upload transition**
   - Frontend now allows authorized users to re-upload proof for rejected challans.
   - Please confirm backend expects this update and transitions challan back to review (`pending`).

3. **Canonical status list**
   - Frontend assumes persisted statuses are only:
     - `generated`, `pending`, `approved`, `rejected`
   - "Proof Uploaded" is rendered as a derived UI label only.

4. **Data visibility consistency**
   - Frontend now scopes non-admin visibility to member-linked challans.
   - Please confirm backend list endpoint authorization rules match this scope for defense-in-depth.

### Frontend Validation Completed

- `npm run lint` → ✅ Pass

### Backend Response (2026-03-01)

1. **Proof-upload state contract**
   - ✅ Confirmed: proof upload sets challan to `pending` and populates `proof_uploaded_at`.

2. **Rejected → Re-upload transition**
   - ✅ Implemented: rejected challans now support proof re-upload and transition back to `pending`.

3. **Canonical status list**
   - ✅ Confirmed: persisted statuses remain `generated`, `pending`, `approved`, `rejected`.
   - ✅ Confirmed: "Proof Uploaded" remains a frontend-derived display state.

4. **Data visibility consistency**
   - ✅ Confirmed: member visibility is constrained to own member-linked challans; admin can access all challans.

---

## 2026-03-01 - Message to Backend (Access Rules Confirmation)

**Context:** Frontend challan flow has been updated and access behavior is now explicit by role.

### Confirmed Frontend Behavior

1. **Member users (non-admin)**
   - Cannot create challan for another member.
   - Cannot upload/re-upload proof for another member.
   - Can only view and act on challans linked to their own member identity.

2. **Admin users**
   - Can create challans on behalf of any active member.
   - Can view all challans.
   - Can upload/re-upload proof on behalf of any member (for eligible challan statuses).
   - Can approve/reject submitted proofs.

### Required Backend Enforcement

Please confirm backend authorization mirrors these rules on all relevant endpoints (`/challans`, challan update/proof upload, approve/reject), so role checks are enforced server-side and not only by frontend UI.

### Backend Response (2026-03-01)

- ✅ Implemented: members cannot create challans for other members.
- ✅ Implemented: members cannot upload/re-upload proof for other members.
- ✅ Implemented: admin/superadmin can create challans on behalf of any active member.
- ✅ Implemented: admin/superadmin can upload/re-upload proof for member challans.
- ✅ Enforced: approve/reject endpoints remain admin-protected.

---

## 2026-03-01 - Frontend to Backend Communication (Member Dashboard Rollout)

**Summary:** Frontend introduced a dedicated member dashboard experience and requests confirmation that backend data contracts remain stable for member-scoped rendering.

### Items to Communicate to Backend

1. **Member profile endpoint reliability**
   - Member dashboard relies on member self profile + linked identity fields.
   - Please confirm `/members/me` remains stable for member role and returns consistent member linkage fields.

2. **Member-linked challan consistency**
   - Dashboard calculations use member-linked challans as primary source.
   - Please keep `member_id` consistently set on challans tied to members.

3. **Role-based dashboard safety**
   - Frontend now hard-splits dashboard views by role.
   - Please confirm backend role checks remain strict on admin-only endpoints (members list, audit/admin operations).

### Frontend Validation Completed

- `npm run lint` → ✅ Pass

### Backend Response (2026-03-01)

1. **Member profile endpoint reliability**
   - ✅ Confirmed: `/members/me` remains member-scoped and stable for authenticated member users.

2. **Member-linked challan consistency**
   - ✅ Confirmed: challans are persisted with `member_id`; dashboard member-linked calculations remain valid.

3. **Role-based dashboard safety**
   - ✅ Confirmed: admin-only routes (e.g., members list, challans list, approve/reject operations) are server-side role protected.

---

## 2026-03-01 - Backend to Frontend Communication (Invite Payload Compatibility)

**Summary:** Frontend invite creation request returned `422` because payload used `expires_at` while backend previously required `expiry_date`.

### Backend Fix Applied

1. **Accepted invite expiry aliases**
   - ✅ Backend now accepts both `expiry_date` and `expires_at` in invite create payload.

2. **Backward compatibility for extra fields**
   - ✅ Backend now ignores extra frontend fields in invite create request payload (does not fail validation).

3. **Validation behavior**
   - ✅ If neither `expiry_date` nor `expires_at` is provided, backend returns clear validation error.
   - ✅ Expiry must be a future datetime.

### Frontend Guidance

- `expiry_date` remains the canonical field for future consistency.
- Existing frontend requests using `expires_at` will continue to work.

---

## 2026-03-01 - Frontend Migration Checklist (API Contract Freeze v1)

**Goal:** Move frontend to canonical endpoints/fields and avoid future 422/405 regressions.

### Required Endpoint/Method Usage

1. **Invite create payload**
   - ✅ Canonical: `expiry_date`
   - ⚠️ Temporary compatibility: `expires_at` (supported for one release window)

2. **Challan admin actions**
   - ✅ Canonical: `PATCH /challans/{challan_id}/approve`
   - ✅ Canonical: `PATCH /challans/{challan_id}/reject`

3. **Notification create**
   - ✅ Canonical: `POST /notifications/`
   - ⚠️ Deprecated alias: `POST /notifications/send` (transition only)

4. **Admin invite management**
   - ✅ Use `GET /invites/` for all invites (supports filters/sort/pagination)
   - ✅ Keep `GET /invites/pending` only for pending-focused workflows
   - ✅ Invite detail/edit available: `GET /invites/{invite_id}`, `PUT /invites/{invite_id}`

5. **Admin utility endpoints now available**
   - ✅ `GET /users/`
   - ✅ `GET /audit-logs/`
   - ✅ `POST /audit-logs/`
   - ✅ `PUT /notifications/{notification_id}`
   - ✅ `DELETE /notifications/{notification_id}`

### Error Handling Contract

- ✅ All 4xx/5xx now normalized to `detail[]` structure with:
  - `type`
  - `loc`
  - `msg`
  - `input`

### Source of Truth

- ✅ OpenAPI v1: `/openapi/v1.json`
- ✅ Contract baseline doc: `API_CONTRACT_BASELINE.md`
- ✅ Change history: `API_CHANGELOG.md`

### Transition Window

- `expires_at` and `/notifications/send` remain temporarily supported for one release window.
- Frontend should migrate to canonical contract in this cycle and remove fallback usage after confirmation.

---

## 2026-03-02 - Backend Acknowledgment (Registration + Invite Contract)

**Summary:** Frontend handoff for registration/invite flow is acknowledged and reflected in backend contract baseline.

### Confirmed Contract

1. **Registration flow**
   - ✅ 2-step model accepted: invite verification in UI, then `POST /auth/register`.
   - ✅ Register payload fields supported: `invite_code`, `username`, `password`, `email`, `full_name`, `phone`, `address`, `monthly_amount`.

2. **Invite behavior**
   - ✅ Invite code format aligned to `INV-XXXXXX` for newly generated invites.
   - ✅ Canonical expiry field remains `expiry_date`.
   - ✅ `expires_at` remains temporarily supported as a compatibility alias.
   - ✅ Backend enforces invite validity (pending/unused, unexpired, single-use).

3. **Contract governance**
   - ✅ Any method/path changes will be recorded in `API_CHANGELOG.md` before rollout.

---

## 2026-03-02 - Pending Register (Open Items)

**Purpose:** Single list of active pending items across backend/frontend integration.

- [x] Frontend migrate invite payload fully to canonical `expiry_date` in active UI flows.  
   **Owner:** Frontend | **Target:** current release cycle

- [x] Frontend migrate notification create fully to `POST /notifications/` and treat `/notifications/send` as unavailable.  
   **Owner:** Frontend | **Target:** current release cycle

- [ ] Backend announce deprecation removal date for `expires_at` alias.  
   **Owner:** Backend | **Target:** next changelog entry

- [ ] Frontend validate all new admin APIs in integration QA (`/users/`, `/audit-logs/`, full `/invites/` management, notification edit/delete).  
   **Owner:** Frontend | **Target:** integration test pass

- [ ] Joint session to close legacy action items from 2026-02-24 checklist and mark completed items.  
   **Owner:** Both teams | **Target:** next sync meeting

- [ ] Confirm production env readiness separately (database reachability, server run command consistency, CORS + health check uptime).  
   **Owner:** Backend | **Target:** pre-release checklist

---

## 2026-03-02 - Backend to Frontend Communication (Notification Contract Sync)

**Summary:** Notification route/service updates are now reflected in active backend behavior and should be treated as the current contract.

### Backend State Confirmed

1. **Create notification endpoint**
   - ✅ Use `POST /notifications/` (admin-only) for notification creation.

2. **Notification admin controls**
   - ✅ `PUT /notifications/{notification_id}` available for admin update.
   - ✅ `DELETE /notifications/{notification_id}` available for admin deletion.

3. **User-scope protection**
   - ✅ `GET /notifications/{notification_id}` is ownership-scoped.
   - ✅ `PUT /notifications/{notification_id}/read` is ownership-scoped.
   - ✅ Non-owned notification IDs return `404`.

4. **Performance/behavior updates**
   - ✅ Unread count uses SQL `COUNT`.
   - ✅ Mark-all-read uses bulk update and returns `{ marked_read, message }`.

### Frontend Guidance

- Use `POST /notifications/` as canonical create path in all active UI flows.
- Keep notification detail/read actions scoped to the authenticated user.
- Treat `/notifications/send` as unavailable in current integration runs.

### Contract Reference

- See `API_CHANGELOG.md` → `2026-03-02` for the matching notification contract update record.

---

## 2026-03-02 - Frontend to Backend Communication (Canonical Contract Enforcement + Reports)

**Summary:** Frontend confirmed canonical notification/invite usage and completed reports module rebuild; backend reviewed API impact.

### Frontend Updates Acknowledged

1. **Canonical contract enforcement**
   - ✅ Frontend removed deprecated notification create fallback and now uses only `POST /notifications/`.
   - ✅ Frontend invite expiry rendering uses canonical `expiry_date`.

2. **Reports module rebuild**
   - ✅ Frontend rebuilt admin reports into tabbed modules (`Members`, `Donations`, `Challans`) with period filters and per-tab CSV export.

### Backend Assessment (API/Feature Impact)

1. **New APIs required**
   - ✅ None required for current frontend rollout.

2. **Role/access coverage for report data sources**
   - ✅ `GET /members/` is admin-protected.
   - ✅ `GET /challans/` is admin-protected.
   - ✅ `GET /campaigns/` remains authenticated-user readable by design; frontend reports remain admin-only at UI level.

3. **Audit logging note**
   - ✅ Existing `POST /audit-logs/` is available for best-effort export audit events.

### Backend Action Items

- [ ] Publish deprecation removal date for `expires_at` compatibility alias in `API_CHANGELOG.md`.
- [ ] Keep monitoring integration for any reports-related payload edge cases; add dedicated report endpoints only if scale/performance requires.

---

## 2026-03-02 - Backend to Frontend Communication (Dashboard Welcome Name Fix)

**Summary:** Backend updated auth/member response payloads so dashboard welcome messaging can render a concrete user name instead of generic fallback text.

### Backend Changes Applied

1. **Response schema extension**
   - ✅ `UserResponse` now includes optional `full_name`.
   - ✅ `MemberResponse` now includes optional `full_name`.

2. **Fallback behavior for name resolution**
   - ✅ Backend now resolves `full_name` from username when a dedicated full-name field is not persisted.

3. **Endpoint impact**
   - ✅ `GET /auth/me` now returns `full_name`.
   - ✅ `GET /members/me` now returns `full_name`.

### Frontend Guidance

- Prefer welcome label resolution order: `full_name` → `username`.
- Keep existing fallback text only as last resort if both fields are absent.

---

## Backend Confirmation (2026-03-03) - Contract Alignment Points

**Summary:** Backend reviewed frontend's 2026-03-03 contract alignment questions and confirms canonical behaviors below. Documentation updated to reflect confirmations.

### Confirmed Backend Contract Points

#### 1. Member Write Contract Completeness ✅
- **Confirmed writable fields:** `monthly_amount`, `address`, `status`
- **Read-only fields:** `full_name` (derived), `phone`/`email` (User record), `member_code` (generated)
- **Not implemented:** `city`, `notes` (require schema extension)
- **Frontend Action:** If admin edit requires additional fields, submit backend contract extension request

#### 2. Notification Audience Model ✅
- **List response:** User-scoped (per-user storage model)
- **Audience metadata:** Not persisted in response; apply at creation time only
- **Broadcast behavior:** System creates multiple records (one per eligible user)
- **Frontend behavior:** Treat responses as inherently user-scoped for display/filtering

#### 3. Audit Log Payload Keys ✅
- **Canonical keys:** `action`, `entity_type`, `entity_id` (required)
- **Optional keys:** `user_id`, `old_values`, `new_values`, `ip_address`
- **Extra keys:** Safely ignored; no validation errors
- **Frontend guidance:** Pre-stringify JSON value fields; map frontend schema to canonical keys

#### 4. Challan Monthly Multi-Month Behavior ✅
- **Single-month model:** Each challan = one month
- **Multi-month submission:** Create separate challans or aggregate (frontend responsibility)
- **Canonical field:** `month` (YYYY-MM): required for monthly type
- **Frontend options:** Per-month separation (recommended) or frontend-side aggregation

#### 5. Member Detail Endpoint Reliability ✅
- **Guarantee:** Returns complete member record for admin edit forms
- **Error handling:** Clear error responses (404/403/500) for surface-level admin feedback
- **Fresh read:** Recommended before edit dialog opens to prevent stale values

### Documentation Updates Applied

- Updated [FRONTEND_API_REFERENCE.md](FRONTEND_API_REFERENCE.md) with new section "Frontend-Backend Contract Alignment (2026-03-03)"
- Added detailed confirmations and implementation guidance for each alignment point
- Clarified member edit field scope in `PUT /members/{id}` documentation
- Documented challan single-month behavior explicitly

### No Action Items for Backend

All confirmed behaviors are already implemented and documented. Frontend can proceed with current contract.

---

## Reference Links
- INTEGRATION_TESTING_GUIDE.md
- CHANGE_REPORT.md
- FRONTEND_ALIGNMENT_COMPLETE.md - Full alignment summary (2026-03-03)
- FRONTEND_ALIGNMENT_QUICK_REFERENCE.md - Alignment matrix and quick ref (2026-03-03)
- BULK_OPERATIONS_SPEC.md - Bulk challan operations specification (v1.1)

---

## 2026-03-03 - ALIGNMENT COMPLETE ✅

**Summary:** All frontend contract clarification requests processed, confirmed, and documented.

### Frontend Questions Raised (2026-03-03)
1. Member write contract completeness
2. Notification audience model for list responses
3. Audit log accepted payload keys
4. Challan monthly multi-month behavior
5. Member detail endpoint reliability for edit flows

### Backend Confirmations & Documentation
✅ All 5 questions answered and confirmed  
✅ New alignment section added to FRONTEND_API_REFERENCE.md  
✅ New COMMUNICATION_LOG section added  
✅ New files created:
- FRONTEND_ALIGNMENT_COMPLETE.md (comprehensive summary)
- FRONTEND_ALIGNMENT_QUICK_REFERENCE.md (matrix + checklist)

### Canonical Contracts (Locked)
- ✅ Member writable fields: `monthly_amount`, `address`, `status` only
- ✅ Notification responses: User-scoped, no persisted audience metadata
- ✅ Audit log payload: Canonical keys + optional, extra keys safely ignored
- ✅ Challan monthly: Single month per request (multi-month = separate requests)
- ✅ Member detail: Complete record available for admin edit forms

### Frontend Next Steps
1. Review alignment section in [FRONTEND_API_REFERENCE.md](FRONTEND_API_REFERENCE.md)
2. Update member edit form (restrict to canonical writable fields)
3. Implement challan multi-month handling (choose Option A or B)
4. Verify audit log payload mapping
5. Test member detail fetch for edit flows

### Status
- Backend: ✅ Ready (no action items)
- Frontend: ✅ Ready to implement with locked contracts
- Documentation: ✅ Complete and locked

**Integration Lead Sign-off:** All alignment confirmations documented and ready for frontend implementation.
- API_CONTRACT_BASELINE.md
- API_CHANGELOG.md

---

## 2026-03-03 - OPERATIONAL EFFICIENCY ENHANCEMENT (Bulk Challan Operations) 🎯

### Problem Statement
**Real-world operation:** 200+ members, 5 admins, bulk payments in single receipt
- Member pays 500 Rs with one proof for 5 months (100 Rs × 5 months)
- Current solution: Create 5 separate challans → Admin reviews same proof 5 times → 5 approve actions
- **Admin time per bulk payment:** 5 minutes
- **Scalability ceiling:** ~300 members (admin workload unsustainable)

**Goal:** Reduce admin workflow from 5 minutes to 30 seconds while maintaining audit trail

### Solution: Bulk Operations Backend Enhancement (v1.1)

#### New Endpoints

**1. POST /challans/bulk-create**
- Create multiple challans linked to single proof
- Request:
  ```json
  {
    "months": ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"],
    "amount_per_month": 100,
    "proof_file_id": "uuid-proof-123",
    "notes": "Q1 bulk payment"
  }
  ```
- Response: `{ "bulk_group_id": "bulk-20260303-001", "created_challans": 5, "challan_ids": [...], "status": "pending_approval" }`

**2. GET /admin/bulk-pending-review**
- Admin dashboard of pending bulk operations
- Response: Array of bulk groups with member info, months, total amount, proof, status
- Filters: Created in last N days, pending vs approved, sort by member name

**3. PATCH /admin/bulk/{bulk_group_id}/approve**
- Single action approves all linked challans
- Request: `{ "approved": true, "admin_notes": "Proof verified" }`
- Response: `{ "status": "approved", "approved_challans": 5, "bulk_group_id": "..." }`

**4. PATCH /admin/bulk/{bulk_group_id}/reject**
- Single action rejects all linked challans
- Request: `{ "reason": "Proof unclear", "action": "delete" }`
- Response: Confirmation with bulk_group_id

#### Database Changes

**New Table: `challan_bulk_groups`**
```sql
CREATE TABLE challan_bulk_groups (
    id SERIAL PRIMARY KEY,
    bulk_group_id VARCHAR(50) UNIQUE,
    member_id INT NOT NULL,
    months TEXT[],
    challan_ids INT[],
    total_amount DECIMAL,
    proof_file_id VARCHAR(255),
    status VARCHAR(20),
    admin_notes TEXT,
    approved_by INT,
    approved_at TIMESTAMP,
    created_by INT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

ALTER TABLE challans ADD COLUMN bulk_group_id VARCHAR(50);
```

#### Admin Workflow (Frontend)

1. Dashboard shows: "Ahmed Khan - 5 months, 500 Rs, pending"
2. Click to view: Single proof preview + 5 months listed
3. Click "Approve All" → One action updates all 5 challans
4. Status changes to approved → Member notified

#### Impact Analysis

| Metric | Current | With Bulk | Improvement |
|--------|---------|-----------|-------------|
| Admin time per bulk payment | 5 min | 30 sec | **10x faster** |
| Proof reviews per month | 5 | 1 | **80% reduction** |
| 200 members @ 4 bulk/yr | 40 hours | 6.7 hours | **33 hours saved** |

#### Implementation Status

- [x] Database migration created
- [x] Models updated (BulkChallanGroup)
- [x] Schemas created (BulkChallanCreate, BulkChallanResponse)
- [x] Routes implemented (bulk-create, bulk-pending-review, bulk-approve, bulk-reject)
- [x] Services updated (bulk_create logic, bulk_approve logic)
- [x] Audit logging added (bulk_* actions)
- [x] API documentation updated
- [x] Frontend integration guide updated (v1.1)

### Backend Implementation Complete (2026-03-03) ✅

All v1.1 bulk operations implemented and ready for testing. See details in next section below.

---

## 2026-03-04 - Frontend to Backend Communication (Bulk Operations Implemented)

**Summary:** Frontend has implemented the bulk operations integration against v1.1 documentation.

### Completed on Frontend

1. **Challan create flow routing**
   - Monthly multi-select now routes to `POST /challans/bulk-create` for multi-month submissions.

2. **Admin dashboard tab**
   - Added `Bulk Operations` tab with pending queue from `GET /admin/bulk-pending-review`.

3. **Bulk actions**
   - Added `Approve All` via `PATCH /admin/bulk/{bulk_group_id}/approve`.
   - Added `Reject All` via `PATCH /admin/bulk/{bulk_group_id}/reject` with reason capture.

### Validation Status

- Frontend compile/build: ✅ Pass
- Live API validation with seeded 5+ members: ⏳ Pending backend-connected integration run

### Request to Backend Team

- Please share test dataset/credentials for at least 5 members with pending bulk groups (or seed script reference) so we can complete end-to-end validation in one pass.

---

## 2026-03-03 - Backend Confirmation (Bulk Operations v1.1 Implementation Complete)

**Summary:** Backend has implemented complete bulk challan operations system per operational efficiency enhancement plan.

### Backend Implementation Complete ✅

**1. Database Models** ([app/models/models.py](app/models/models.py))
   - ✅ New model: `BulkChallanGroup`
   - ✅ Updated `Challan` model: Added `bulk_group_id` foreign key

**2. Pydantic Schemas** ([app/schemas/schemas.py](app/schemas/schemas.py))
   - ✅ 10 new schemas for bulk operations (Create, Response, List, Approve, Reject, Details)

**3. API Routes** ([app/routes/bulk_challan_routes.py](app/routes/bulk_challan_routes.py))
   - ✅ `POST /challans/bulk-create`
   - ✅ `GET /admin/bulk-pending-review`
   - ✅ `GET /admin/bulk/{bulk_group_id}`
   - ✅ `PATCH /admin/bulk/{bulk_group_id}/approve`
   - ✅ `PATCH /admin/bulk/{bulk_group_id}/reject`

**4. Router Integration**
   - ✅ Registered and included in main app

**5. Authorization & Audit**
   - ✅ Role-based access control enforced
   - ✅ Complete audit logging (bulk_create, bulk_approve, bulk_reject)

**6. Documentation**
   - ✅ API reference updated with 5 endpoints
   - ✅ Integration guide updated to v1.1.0
   - ✅ Implementation documented in communication log

### Response to Frontend Request: Test Data Setup

**Step 1: Database Migration**

Run this SQL to add the new table (or restart server for auto-creation):

```sql
CREATE TABLE challan_bulk_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bulk_group_id VARCHAR(50) UNIQUE NOT NULL,
    member_id INTEGER NOT NULL,
    amount_per_month FLOAT NOT NULL,
    total_amount FLOAT NOT NULL,
    proof_file_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending_approval' NOT NULL,
    months_list TEXT NOT NULL,
    challan_ids_list TEXT NOT NULL,
    admin_notes TEXT,
    approved_by_admin_id INTEGER,
    rejection_reason TEXT,
    created_by_user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(id),
    FOREIGN KEY (approved_by_admin_id) REFERENCES users(id)
);

ALTER TABLE challans ADD COLUMN bulk_group_id VARCHAR(50);
CREATE INDEX idx_challans_bulk_group_id ON challans(bulk_group_id);
```

**Step 2: Seed Test Data**

Create file `seed_bulk_test_data.py`:

```python
from app.database import SessionLocal
from app.models.models import User, Member, BulkChallanGroup, Challan, UserRole, ChallanType, ChallanStatus
from datetime import datetime
import json

db = SessionLocal()

# Create 5 test members
members = []
for i in range(1, 6):
    user = db.query(User).filter(User.username == f"testmember{i}").first()
    if not user:
        user = User(
            username=f"testmember{i}",
            email=f"member{i}@test.com",
            password_hash="$2b$12$test",
            role=UserRole.MEMBER,
            is_active=True
        )
        db.add(user)
        db.flush()
        
        member = Member(
            user_id=user.id,
            member_code=f"MEM{i:04d}",
            monthly_amount=100.0,
            address=f"Test Address {i}",
            status="active"
        )
        db.add(member)
        db.flush()
        members.append(member)

# Create 2 pending bulk groups
for i, member in enumerate(members[:2]):
    months = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"]
    challan_ids = []
    
    for month in months:
        challan = Challan(
            member_id=member.id,
            type=ChallanType.MONTHLY,
            month=month,
            amount=100.0,
            status=ChallanStatus.PENDING,
            bulk_group_id=f"bulk-20260303-{i:03d}"
        )
        db.add(challan)
        db.flush()
        challan_ids.append(challan.id)
    
    bulk_group = BulkChallanGroup(
        bulk_group_id=f"bulk-20260303-{i:03d}",
        member_id=member.id,
        amount_per_month=100.0,
        total_amount=500.0,
        proof_file_id=f"test-proof-{i:03d}.jpg",
        status="pending_approval",
        months_list=json.dumps(months),
        challan_ids_list=json.dumps(challan_ids),
        created_by_user_id=member.user_id,
        notes=f"Test bulk payment {i+1}"
    )
    db.add(bulk_group)

db.commit()
print("✅ Seeded: 5 members, 2 pending bulk groups (10 challans)")
db.close()
```

**Step 3: Test with Swagger**

1. Start backend: `http://localhost:8000`
2. Open Swagger: `http://localhost:8000/docs`
3. Test endpoints:
   - `GET /admin/bulk-pending-review` → Should return 2 pending
   - `PATCH /admin/bulk/bulk-20260303-000/approve` → Approve 5 challans
   - `POST /challans/bulk-create` → Create new bulk

### Integration Testing Ready ✅

- Backend server: ✅ http://localhost:8000
- Swagger docs: ✅ http://localhost:8000/docs
- All 5 bulk endpoints: ✅ Implemented
- Test seed script: ✅ Provided above
- Admin credentials: Use existing admin account

**Status:** Backend v1.1 fully implemented and ready for end-to-end testing. 🚀
