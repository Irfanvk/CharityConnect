# Communication Log (Frontend + Backend)

**Project:** CharityConnect  
**Purpose:** Decisions, meeting minutes, and action items  
**Owner:** Integration Lead  
**Last Updated:** 2026-03-02

---

## Decision Log

| Date | Decision | Owner | Status | Notes |
|------|----------|-------|--------|-------|
| 2026-03-02 | Admin Reports page rebuilt into modular 3-tab reporting suite with per-report CSV export | Frontend | ✅ | Added Members, Donations, Challans report modules with period filters and tab-specific export schemas |
| 2026-03-02 | Frontend migrated to canonical notification and invite contract usage | Frontend | ✅ | Removed `/notifications/send` fallback and moved Settings invite expiry display to `expiry_date` only |
| 2026-03-01 | Active frontend flows migrated from deprecated `entities.*` to resource APIs | Frontend | ✅ | Removes runtime deprecation noise and aligns with resource client contract |
| 2026-03-01 | Notifications page switched to supported notification methods with compatibility aliases | Frontend | ✅ | Fixes `Notification.create is not a function` runtime error |
| 2026-03-01 | Dashboard render hardened against undefined datasets post-login | Frontend | ✅ | Prevents blank-screen crash after login |
| 2026-03-01 | Non-admin users get a dedicated member dashboard view | Frontend | ✅ | Member profile, challan insights, upcoming dues, campaign participation |
| 2026-03-01 | Dashboard render path split by role (`superadmin` / `admin` / `member`) | Frontend | ✅ | Prevents mixed admin/member UI exposure |
| 2026-03-01 | Challans UI derives "Proof Uploaded" from `pending + proof_uploaded_at` | Frontend | ✅ | Keeps UI readable while preserving backend status model |
| 2026-03-01 | Non-admin challan visibility constrained to linked member record (fallback: creator email) | Frontend | ✅ | Access-scope hardening in Challans page |
| 2026-03-01 | Rejected challans support proof re-upload for authorized users | Frontend | ✅ | Requires backend to keep transition-to-pending behavior |
| 2026-02-26 | Frontend auth redirect handled by context state (not global 401 hard redirect) | Frontend | ✅ | Prevents login loop and session bounce |
| 2026-02-26 | Login success flow updates context session immediately | Frontend | ✅ | Removes race between login and auth guard |
| 2026-02-26 | Logout action must be visible in app shell for authenticated users | Frontend | ✅ | Added header-level logout button |
| 2026-02-26 | Public app settings call is optional when app_id missing | Frontend | ✅ | Skip endpoint to avoid 404 noise |
| 2026-02-24 | Use resource-specific API routes (no generic /entities) | Backend | ✅ | Avoid abstraction mismatch |
| 2026-02-24 | Login accepts email and username | Backend | ✅ | Aligns with frontend Login.jsx |
| 2026-02-24 | Add /files/upload endpoint | Backend | ✅ | Matches frontend proof upload flow |
| 2026-02-24 | Registration collects username + password | Frontend | ✅ | Required for auth flow |
| 2026-02-24 | Disable RecurringDonation and Request in Phase 1 | Both | ✅ | Phase 2 feature set |

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

---

## 2026-03-01 - Backend to Frontend Communication (Challan Contracts Aligned)

**Summary:** Backend confirms March 1 challan contracts are now aligned with frontend expectations.

### Backend Implementation Confirmations

1. **Create-on-behalf support (admin/superadmin)**
   - Admin/superadmin can create challans on behalf of any active member using `member_id`.

2. **Proof upload/re-upload on behalf (admin/superadmin)**
   - Admin/superadmin can upload and re-upload proof for member challans.

3. **Rejected challan re-upload transition**
   - Re-upload is supported for rejected challans.
   - Re-upload transitions challan back to review state (`pending`).

### Backend Contract Confirmations

1. **Proof upload state model remains**
   - Persisted status after proof upload: `pending`.
   - `proof_uploaded_at` is set.

2. **Canonical persisted status vocabulary remains**
   - `generated`, `pending`, `approved`, `rejected`.
   - “Proof Uploaded” remains frontend UI-derived only.

3. **Visibility scope remains role-based**
   - Member visibility is self-scoped.
   - Admin can access all challans.

### Frontend Follow-up

- No required change for member flow.
- Optional UI enhancement only: explicitly expose admin create-on-behalf and re-upload-on-behalf actions where needed.

---

## 2026-03-01 - Frontend to Backend Communication (Patch 1.4 Alignment)

**Summary:** Frontend completed migration to resource-specific client methods across active pages and fixed notification/dashboard runtime stability issues.

### Items to Communicate to Backend

1. **No contract changes requested**
   - Frontend changes are internal refactor/stability improvements.
   - Existing backend endpoints and contracts remain valid.

2. **Notification flow compatibility**
   - Frontend now uses resource notifications methods consistently.
   - Compatibility aliases were added client-side to avoid transient breakage.

3. **Role-based dashboard and challan behavior remains unchanged**
   - Existing March 1 backend challan/access confirmations continue to apply.

### Frontend Validation Completed

- `npm run lint` → ✅ Pass
- `npm run build` → ✅ Pass

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

---

## 2026-03-02 - Frontend Contract Migration (Canonical Endpoint Enforcement)

**Summary:** Frontend completed required contract hardening from the API freeze notes by removing deprecated notification create fallback and moving invite UI rendering to canonical expiry field usage.

### Frontend Changes Applied

1. **Notification create contract hardened**
   - ✅ Removed client fallback to deprecated `POST /notifications/send`.
   - ✅ Frontend now uses only canonical `POST /notifications/` for create flows.

2. **Notification API path cleanup**
   - ✅ Removed deprecated `notifications.send` alias from frontend API path config.

3. **Invite expiry field usage migrated**
   - ✅ Invite creation already uses canonical `expiry_date`.
   - ✅ Settings invite list display now reads canonical `expiry_date` only (legacy `expires_at` display fallback removed).

### Backend Communication (for log + awareness)

1. **Deprecation timeline request**
   - Please publish final removal date for backend compatibility aliases (`expires_at`, `/notifications/send`) in `API_CHANGELOG.md`.

2. **Canonical-only run confirmation**
   - Frontend integration runs now treat `POST /notifications/send` as unavailable by design.

3. **Regression watch**
   - If backend still emits invite records without `expiry_date`, Settings expiry column will intentionally remain blank under canonical mode.

### Frontend Validation Completed

- `npm run lint` → ✅ Pass

---

## 2026-03-02 - Frontend to Backend Communication (Reports Module Rebuild)

**Summary:** Frontend rebuilt Admin Reports into a modular multi-report page with independent analytics sections and CSV exports.

### Frontend Changes Applied

1. **Report module architecture**
   - ✅ Added report components for:
     - Member Activity
     - Donation Summary
     - Challan Status
   - ✅ Added shared report period filter component (monthly/yearly/all-time).

2. **Reports page rewrite**
   - ✅ Replaced old single-report flow with tabbed admin reports (`Members`, `Donations`, `Challans`).
   - ✅ Added per-tab CSV export using report-specific columns.

3. **Validation**
   - ✅ `npm run lint` passed.
   - ✅ `npm run build` passed.

### Items to Communicate to Backend

1. **No new API contract requested**
   - Reports module uses existing endpoints only (`/members/`, `/challans/`, `/campaigns/`).

2. **Access expectations**
   - Reports remain admin/superadmin-only in frontend.
   - Please keep backend role protection strict on report data source endpoints.

3. **Optional reliability note**
   - Export action logs via `POST /audit-logs/` as best-effort; export download should not fail if audit log write fails.

---

## Reference Links
- INTEGRATION_TESTING_GUIDE.md
- CHANGE_REPORT.md
