# Changelog - CharityConnect Phase 1

**Document Type:** Technical Change Log  
**Version:** 1.0  
**Created:** February 24, 2026  
**Owner:** Tech Lead  

---

## 📋 Overview

This document records all technical changes, implementations, and decisions made during CharityConnect Phase 1 development. Each change is dated, documented, and cross-referenced with related commits and communications.

**Related Documents:**
- [COMMUNICATION_LOG.md](COMMUNICATION_LOG.md) - Team communications and decisions
- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) - Testing procedures
- [README.md](README.md) - Project overview

---

## 🔍 Version History

| Version | Date | Status | Changes |
|---------|------|--------|---------|
| 1.1 | 2026-02-26 | Patch | Auth/login redirect stabilization, logout visibility, API client hardening |
| 1.0 | 2026-02-24 | Release | Phase 1 MVP complete |

---

## 📅 February 26, 2026 - Auth Stabilization Patch

### 🎯 Objectives Met
- ✅ Fixed login redirect loop back to login page
- ✅ Stabilized post-login auth state handling
- ✅ Made logout action visible and reliable in app shell
- ✅ Removed fragile dev-only token behavior
- ✅ Added startup backend reachability signal for better diagnostics

---

## Frontend Changes (Patch 1.1)

### 1. Login/Auth Session Stabilization

**Impact:** Critical - Fixes blocked sign-in flow  
**Type:** Bug Fix  
**Files Modified:** `src/lib/AuthContext.jsx`, `src/pages/Login.jsx`, `src/App.jsx`

**Change Details:**
- Auth context now reads token from persistent storage consistently.
- Successful login immediately updates shared auth state.
- Stale `auth_required` error state is cleared on valid authentication.
- Redirect-to-login is gated to real unauthenticated state only.
- Post-login navigation uses `/` (main page entry, mapped to Dashboard).

**Result:**
- Successful login remains in authenticated app instead of bouncing back to login.

---

### 2. API Client Hardening

**Impact:** High - Prevents accidental session drops  
**Type:** Reliability Fix  
**Files Modified:** `src/api/charityClient.js`

**Change Details:**
- Removed global forced browser redirect on every `401`.
- Normalized `401` as structured error for auth flow to handle.
- Added tolerant token extraction for multiple backend response shapes:
  - `access_token`
  - `accessToken`
  - `token`
  - nested `data.*` variants
- Added missing `redirectToLogin` helper consumed by auth/layout code.

**Result:**
- Non-auth endpoint failures no longer force immediate login-page navigation.

---

### 3. Layout/Logout UX Fix

**Impact:** High - Restores visible session controls  
**Type:** UX + State Binding Fix  
**Files Modified:** `src/Layout.jsx`

**Change Details:**
- Layout now uses auth-context session state for user controls.
- Logout button is shown in header for authenticated users.
- Sidebar user dropdown uses the same authenticated user source.
- Notification loading switched from deprecated proxy path to resource path.

**Result:**
- Logout action is visible and functional after login.

---

### 4. Dev & Startup Behavior

**Impact:** Medium - Reduces false-positive auth state  
**Type:** Cleanup/Diagnostics  
**Files Modified:** `src/main.jsx`, `src/lib/AuthContext.jsx`, `vite.config.js`

**Change Details:**
- Removed dev-time mock token auto-injection.
- Added backend reachability check at startup with user-friendly error state.
- Added Vite `/api` proxy support via configured backend URL.
- Added local environment defaults via `.env.local` for backend URL wiring.

---

## Validation Summary (2026-02-26)

- `npm run lint` → ✅ pass
- `npm run build` → ✅ pass

---

## Backend Coordination Notes (Generated from Patch 1.1)

Frontend requests backend to confirm/standardize:

1. **Login token response contract**
  - Preferred: `access_token`
  - Supported fallback currently: `accessToken`, `token`, nested `data.*`

2. **Auth identity endpoint behavior**
  - `GET /auth/me` should reliably return user object on valid token.
  - `401` should be used only for invalid/expired/missing token.

3. **Public app settings endpoint**
  - If app-id is required, confirm expected behavior when app-id is absent.
  - Current frontend now skips this call when app-id is unset.

4. **Health check endpoint**
  - Frontend probes `/health`; ensure this endpoint is present and lightweight.

---

## 📅 February 24, 2026 - Phase 1 Launch

### 🎯 Objectives Met
- ✅ API architecture unified
- ✅ Authentication flow implemented
- ✅ File upload system working
- ✅ Frontend fully integrated
- ✅ Ready for staging deployment

---

## Backend Changes

### 1. Authentication - Email/Username Support

**Impact:** High - Critical for user login  
**Type:** Enhancement  
**Files Modified:** 2  
**Time:** 1 hour

**Change Details:**
- **File:** `app/schemas/schemas.py`
  - Updated `UserLogin` model to accept optional `username` and `email` fields
  - Added validation: at least one identifier required
  - Backward compatible with existing `username` only approach

- **File:** `app/services/auth_service.py`
  - Modified `login()` method to check both `username` and `email`
  - First tries email lookup, then username
  - Returns error if neither provided
  - Maintains password verification logic

**API Contract:**
```http
POST /auth/login HTTP/1.1
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "user_123",
    "email": "user@example.com",
    "role": "member",
    "is_active": true
  }
}
```

**Decision Reference:** [COMMUNICATION_LOG.md](COMMUNICATION_LOG.md) - Decision D2  
**Testing:** ✅ Tested with Postman  
**Status:** ✅ Complete & Ready

---

### 2. File Upload - New Endpoint

**Impact:** High - Enables proof uploads  
**Type:** New Feature  
**Files Created:** 1  
**Files Modified:** 2  
**Time:** 2 hours

**Change Details:**
- **File (NEW):** `app/routes/file_routes.py`
  - New route: `POST /files/upload`
  - Accepts multipart/form-data with file uploaded as `file`
  - Validates file size: max 3MB (3,145,728 bytes)
  - Validates file type: `.jpg`, `.jpeg`, `.png`, `.pdf` only
  - Generates unique filename using UUID
  - Saves to `app/uploads/proofs/` directory

- **File:** `app/main.py`
  - Added import: `from app.routes import file_router`
  - Registered router: `app.include_router(file_router)`

- **File:** `app/routes/__init__.py`
  - Exported: `file_router`
  - Added type hints

**API Contract:**
```http
POST /files/upload HTTP/1.1
Authorization: Bearer {token}
Content-Type: multipart/form-data

[Binary file data]
```

**Response (Success):**
```json
{
  "file_url": "/uploads/proofs/a3b2c1d4-e5f6-7890-abcd-ef1234567890.jpg",
  "filename": "a3b2c1d4-e5f6-7890-abcd-ef1234567890.jpg"
}
```

**Response (Error):**
```json
{
  "detail": "File size exceeds 3MB limit"
}
```

**Note:** Kept existing `/challans/{id}/upload-proof` endpoint for backward compatibility

**Decision Reference:** [COMMUNICATION_LOG.md](COMMUNICATION_LOG.md) - Decision D3  
**Testing:** ✅ Tested with Postman  
**Status:** ✅ Complete & Ready

---

## Frontend Changes

### 1. API Client Refactor - Resource-Specific Routes

**Impact:** Critical - Enables all frontend API calls  
**Type:** Architecture Change  
**Files Modified:** 1  
**Lines Changed:** ~200  
**Time:** 6-8 hours

**Change Details:**
- **File:** `src/api/charityClient.js`
  - **Old Pattern:** Generic entity proxy
    ```javascript
    charityClient.entities.Member.list()  // GET /entities/Member
    ```
  - **New Pattern:** Resource-specific methods
    ```javascript
    charityClient.members.list()  // GET /members/
    charityClient.challans.create(data)  // POST /challans/
    ```

**Resources Implemented:**
- `members` - List, get, create, update, delete, query
- `challans` - Full CRUD + workflow (approve, reject, uploadProof)
- `campaigns` - Full CRUD
- `notifications` - List, get, send, mark read, mark all read
- `invites` - List, validate, create, update, delete
- `auditLogs` - List, get, create
- `users` - List, get, update
- `files` - Upload (NEW endpoint)

**Migration Pattern:**
```javascript
// Before
await charityClient.entities.Member.list()

// After
await charityClient.members.list()
```

**Backward Compatibility:**
- Old `entities` proxy mapped to new methods with deprecation warnings
- RecurringDonation and Request throw helpful Phase 1 error
- Gradual migration possible

**Method Signatures:**
```javascript
// Auth
charityClient.auth.login({ email, password })
charityClient.auth.register({ invite_code, username, password, ... })

// Members
charityClient.members.list()          // GET /members/
charityClient.members.me()            // GET /members/me
charityClient.members.get(id)         // GET /members/{id}
charityClient.members.getByCode(code) // GET /members/code/{code}
charityClient.members.create(data)    // POST /members/
charityClient.members.update(id, data) // PUT /members/{id}

// Files (NEW)
charityClient.files.upload(file)      // POST /files/upload
```

**Decision Reference:** [COMMUNICATION_LOG.md](COMMUNICATION_LOG.md) - Decision D1  
**Testing:** ✅ Build passes, no errors  
**Status:** ✅ Complete & Ready

---

### 2. Login Page - New Feature

**Impact:** High - Enables user authentication  
**Type:** New Feature  
**Files Created:** 1  
**Lines:** ~120  
**Time:** 3-4 hours

**Change Details:**
- **File (NEW):** `src/pages/Login.jsx`
  - Email input field (required)
  - Password input field (required)
  - Email validation (RFC format)
  - Error display with Alert component
  - Loading state with spinner
  - Auto-focus on first field
  - "Forgot Password" link placeholder
  - "Register" link for new users
  - Auto-redirect to dashboard on success
  - Token storage in localStorage

**Features:**
- Responsive design (mobile-friendly)
- Keyboard navigation support
- Password field masking
- Form validation before submission
- Clear error messages
- Loading indicator during request
- Token-based session management

**Error Handling:**
- Invalid credentials → 401 error display
- Network errors → timeout message
- Custom error messages from backend

**Related Tests:** [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) - Test 1

**Creation Command:**
```bash
# Created as part of Phase 1 implementation
touch src/pages/Login.jsx
```

**Status:** ✅ Complete & Ready

---

### 3. Registration Page - Enhancement

**Impact:** High - Enables user creation  
**Type:** Enhancement  
**Files Modified:** 1  
**Lines Added:** ~40  
**Time:** 2-3 hours

**Change Details:**
- **File:** `src/pages/Register.jsx`
  - **Added Fields:**
    - Username (required, min 3 chars)
    - Password (required, min 8 chars)
    - Confirm Password (required, must match)
  - **Validation:**
    - Password strength (8+ characters)
    - Password match check
    - Clear error messages for mismatch
  - **Workflow Change:**
    - Old: Create Member directly via `charityClient.entities.Member.create()`
    - New: Call `/auth/register` endpoint via `charityClient.auth.register()`
    - Backend auto-creates User + Member profile
    - Backend auto-generates Member code (MEM-001, etc.)

**API Call:**
```javascript
await charityClient.auth.register({
  invite_code: "INV-ABC123",
  username: "john_doe",
  password: "SecurePass123",
  email: "john@example.com",
  full_name: "John Doe",
  phone: "+1234567890",
  address: "",
  monthly_amount: 100
})
```

**Backend Response Creates:**
1. User account (username + password hash)
2. Member profile (linked to user)
3. Member code (auto-generated: MEM-001, etc.)
4. Marks invite as "used"
5. Returns auth token

**Related Communication:** [COMMUNICATION_LOG.md](COMMUNICATION_LOG.md) - Decision D4  
**Related Tests:** [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) - Test 2

**Status:** ✅ Complete & Ready

---

### 4. Routes Configuration - Public vs Protected

**Impact:** High - Enables public access to auth pages  
**Type:** Architecture  
**Files Modified:** 2  
**Time:** 1 hour

**Change Details:**
- **File:** `src/pages.config.js`
  - Added new `PUBLIC_PAGES` object
  - Moved Login to public access
  - Moved Register to public access
  - Commented out Requests page (Phase 2)

- **File:** `src/App.jsx`
  - Added logic to render public routes first
  - Public routes bypass auth checks
  - Protected routes require valid token
  - Used authentication context to verify

**Route Structure:**
```javascript
export const pagesConfig = {
  mainPage: "Dashboard",
  Pages: PAGES,              // Protected routes
  PUBLIC_PAGES: PUBLIC_PAGES, // Public routes (Login, Register)
  Layout: __Layout,
};
```

**Public Routes Now:**
- `/login` - No authentication required
- `/register` - No authentication required

**Protected Routes:**
- `/dashboard` - Requires authentication
- `/members` - Requires authentication (admin only)
- `/challans` - Requires authentication
- [All other routes]

**Status:** ✅ Complete & Ready

---

### 5. Feature Disabling - RecurringDonation & Request

**Impact:** Medium - Removes Phase 2 features from Phase 1  
**Type:** Scope Management  
**Files Modified:** 4  
**Time:** 1 hour

**Change Details:**
- **File:** `src/pages.config.js`
  - Commented: `import Requests from './pages/Requests'`
  - Removed: "Requests" from PAGES object

- **File:** `src/Layout.jsx`
  - Commented: Requests navigation link
  - Requests no longer appears in sidebar

- **File:** `src/pages/Dashboard.jsx`
  - Disabled: RecurringDonation queries
  - Returns empty array instead of API call
  - Query disabled with `enabled: false`

- **File:** `src/pages/Profile.jsx`
  - Disabled: RecurringDonation queries
  - Returns empty array instead of API call
  - Query disabled with `enabled: false`

- **File:** `src/api/charityClient.js`
  - RecurringDonation entity throws Phase 1 error:
    ```
    "Entity RecurringDonation is not available in Phase 1. 
    It will be implemented in Phase 2."
    ```

**Why Disabled:**
- Not implemented in backend yet
- Not in Phase 1 MVP scope
- Required features: Members, Challans, Campaigns, Notifications
- Will be re-enabled in Phase 2 (2 weeks after MVP)

**Related Communication:** [COMMUNICATION_LOG.md](COMMUNICATION_LOG.md) - Decision D5

**Phase 2 Re-enablement:**
```javascript
// To re-enable in Phase 2:
// 1. Uncomment imports
// 2. Re-enable API queries
// 3. Update backend to add endpoints
```

**Status:** ✅ Complete & Ready for Phase 2

---

### 6. ProofUpload Component - File Upload Integration

**Impact:** High - Enables payment proof uploads  
**Type:** Integration  
**Files Modified:** 1  
**Lines Changed:** ~30  
**Time:** 1 hour

**Change Details:**
- **File:** `src/components/challans/ProofUpload.jsx`
  - **Old Upload Method:**
    ```javascript
    const { file_url } = await charityClient.integrations?.Core?.UploadFile?.(...)
    ```
  - **New Upload Method:**
    ```javascript
    const { file_url } = await charityClient.files.upload(file)
    ```

**Validation Updates:**
- Added file type validation
- Accepts: JPG, JPEG, PNG, PDF
- Rejects other types with user error
- Max size: 3MB (checked before upload)
- Error handling with try-catch

**UI Updates:**
- PDF file preview shows filename (not image)
- Error messages clearer
- Dialog closes after successful upload
- Loading state during upload

**Status Update:**
- Old: Set status to 'proof_uploaded'
- New: Set status to 'pending' (matches backend enum)
- Timestamp: Sets `proof_uploaded_at`

**Error Handling:**
```javascript
try {
  const { file_url } = await charityClient.files.upload(file)
  // Update challan...
} catch (error) {
  alert(error.message || 'Failed to upload file')
}
```

**Related Tests:** [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) - Test 3

**Status:** ✅ Complete & Ready

---

### 7. Status Mapping - Backend Alignment

**Impact:** Medium - Aligns UI with backend state  
**Type:** Bug Fix  
**Files Modified:** 1  
**Time:** 1 hour

**Change Details:**
- **File:** `src/pages/Challans.jsx`
  - Issue: Frontend uses 'proof_uploaded' status, backend only has 4 states
  - Solution: Map to 'pending' status, check `proof_uploaded_at` timestamp
  - Created `getDisplayStatus()` helper function

**Status Mapping:**
```javascript
Backend States:  generated, pending, approved, rejected
Frontend Display: generated, [pending+timestamp=Proof Uploaded], approved, rejected

const getDisplayStatus = (challan) => {
  if (challan.status === 'pending' && challan.proof_uploaded_at) {
    return { label: "Proof Uploaded", ... }
  }
  return statusConfig[challan.status]
}
```

**Related Communication:** [COMMUNICATION_LOG.md](COMMUNICATION_LOG.md) - Alignment Analysis

**Status:** ✅ Complete & Ready

---

### 8. File Size Validation

**Impact:** Low - User feedback before upload  
**Type:** Validation  
**Files Modified:** 1  
**Time:** 30 min

**Change Details:**
- **File:** `src/components/challans/ProofUpload.jsx`
  - Added client-side validation: 3MB max
  - Shows error alert before upload attempt
  - Prevents network request for oversized files
  - Text updated: "PNG, JPG" → "JPG, PNG, PDF"

**Validation:**
```javascript
if (selectedFile.size > 3 * 1024 * 1024) {
  alert('File size must be less than 3MB. Please choose a smaller file.')
  e.target.value = ''
  return
}
```

**Backend:** Also validates (redundant safety)

**Status:** ✅ Complete & Ready

---

### 9. Environment Configuration

**Impact:** Low - Setup documentation  
**Type:** Configuration  
**Files Created:** 1  
**Time:** 30 min

**Change Details:**
- **File (NEW):** `.env.local.example`
  - Template for local development
  - Backend URL: `http://localhost:8000` (default)
  - Can also use mock: `http://localhost:4000`
  - Production URL: custom domain

**Content:**
```env
# CharityConnect Environment Configuration
# Copy this file to .env.local and update with your values

VITE_CHARITY_APP_BASE_URL=http://localhost:8000
VITE_CHARITY_APP_ID=
VITE_CHARITY_FUNCTIONS_VERSION=v1
```

**Usage:**
```bash
cp .env.local.example .env.local
# Edit .env.local with your values
```

**Status:** ✅ Complete & Ready

---

## Build & Deployment

### Build Status
- **Command:** `npm run build`
- **Status:** ✅ Passing
- **Error:** None
- **Output:** `dist/` directory created
- **Size:** ~250KB (gzipped)

### Development Server
- **Command:** `npm run dev`
- **Status:** ✅ Running
- **Port:** 5173
- **URL:** `http://localhost:5173`
- **Hot Reload:** Enabled

### Production Ready
- ✅ Build passes
- ✅ No console errors
- ✅ No TypeScript errors
- ✅ All imports resolve
- ✅ Ready for staging deployment

---

## Summary Statistics

### Files Created
| File | Type | Purpose |
|------|------|---------|
| `src/pages/Login.jsx` | Component | User authentication |
| `.env.local.example` | Config | Environment template |

### Files Modified
| File | Changes | Impact |
|------|---------|--------|
| `src/api/charityClient.js` | ~200 lines | API architecture |
| `src/pages/Register.jsx` | ~40 lines | Auth fields |
| `src/pages/Dashboard.jsx` | ~5 lines | Disable Phase 2 |
| `src/pages/Profile.jsx` | ~5 lines | Disable Phase 2 |
| `src/Layout.jsx` | ~1 line | Remove nav link |
| `src/pages.config.js` | ~10 lines | Route config |
| `src/App.jsx` | ~10 lines | Auth routing |
| `src/components/challans/ProofUpload.jsx` | ~30 lines | File upload |
| `src/pages/Challans.jsx` | ~10 lines | Status mapping |

### Metrics
- **Total Files Created:** 1
- **Total Files Modified:** 9
- **Total Lines Added:** ~300
- **Total Lines Removed:** ~50
- **Net Change:** +250 lines
- **Implementation Time:** ~20 hours
- **Build Status:** ✅ Passing
- **Test Coverage:** Ready for integration testing

---

## Phase 2 Preview

### Features to Implement
1. **RecurringDonation** - Monthly recurring donations
2. **Request** - Member support requests
3. **Enhanced Filtering** - Search and filter on all lists
4. **Pagination** - Handle larger datasets
5. **Analytics** - Dashboard metrics and reports

### Timeline
- **Start:** 2 weeks after Phase 1 MVP launch
- **Duration:** 2 weeks
- **Backend Work:** 20-30 hours
- **Frontend Work:** 15-20 hours

---

## 🔗 References

- **Decision Log:** [COMMUNICATION_LOG.md](COMMUNICATION_LOG.md)
- **Integration Testing:** [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
- **Project README:** [README.md](README.md)

---

**Document Control:**  
Version: 1.0 | Created: 2026-02-24 | Owner: Tech Lead  
Next Review: 2026-02-27 (Post-MVP) | Archive Strategy: Keep for historical record
