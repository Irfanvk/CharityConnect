# Integration Testing Guide - Phase 1

**Document Type:** Testing Procedures  
**Phase:** Phase 1 MVP Integration  
**Version:** 1.0  
**Created:** February 24, 2026  
**Owner:** QA Lead  

---

## 📋 Quick Reference

| Item | Details |
|------|---------|
| **Backend URL** | `http://localhost:8000` |
| **Frontend URL** | `http://localhost:5173` |
| **Testing Duration** | 2-3 days |
| **Expected Outcome** | Release-ready Phase 1 MVP |
| **Related Docs** | [COMMUNICATION_LOG.md](COMMUNICATION_LOG.md), [CHANGELOG.md](CHANGELOG.md) |

---

## 🚀 Pre-Testing Setup

### Backend Server

```bash
cd charity-connect-backend
python -m uvicorn app.main:app --reload --port 8000
```

**Verification:**
- URL: `http://localhost:8000`
- Expected: `{"message": "Charity Connect Backend", "version": "1.0.0", "status": "running"}`
- Docs: `http://localhost:8000/docs`

### Frontend Server

```bash
cd CharityConnect
# Verify environment
cat .env.local
# Should have: VITE_CHARITY_APP_BASE_URL=http://localhost:8000

npm run dev
```

**Verification:**
- URL: `http://localhost:5173`
- Expected: Login page or Dashboard
- DevTools: No CORS errors

---

## ✅ Test Sequence

### Test 1: Login with Email

**Objective:** Verify email-based authentication works  
**Priority:** 🔴 CRITICAL  
**Time:** 5 minutes

**Setup:**
- Backend must have test user: `test@example.com` / `testpassword123`
- Frontend should show login page at `http://localhost:5173/login`

**Procedure:**
1. Navigate to `http://localhost:5173/login`
2. Enter email: `test@example.com`
3. Enter password: `testpassword123`
4. Click "Sign In"

**Verification:**
- ✅ POST request to `/auth/login` returns 200
- ✅ Response contains `access_token` and `user` object
- ✅ Token stored in `localStorage` as `auth_token`
- ✅ Redirected to `/dashboard`
- ✅ Dashboard loads with user data
- ✅ No CORS errors in console

**Pass Criteria:** All 6 items verified  
**Result:** ⏳ [Document result after testing]

---

### Test 2: Registration Flow

**Objective:** Verify new user creation via invite code  
**Priority:** 🔴 CRITICAL  
**Time:** 10 minutes

**Setup:**
- Backend must have pending invite: `INV-ABC123`
- Frontend should show register page at `http://localhost:5173/register`

**Procedure:**
1. Navigate to `http://localhost:5173/register`
2. **Step 1 - Verify Invite:**
   - Enter code: `INV-ABC123`
   - Click "Verify Code"
3. **Step 2 - Register:**
   - Username: `newuser`
   - Password: `SecurePass123`
   - Confirm: `SecurePass123`
   - Full Name: `John Doe`
   - Email: `john@example.com`
   - Phone: `+1234567890`
   - Click "Register"

**Verification:**
- ✅ Invite code validated (no error)
- ✅ Form shows all required fields
- ✅ Password validation enforced (8+ chars, match)
- ✅ POST `/auth/register` returns 200
- ✅ Backend creates User + Member
- ✅ Member code auto-generated (MEM-001, etc.)
- ✅ Invite marked as "used"
- ✅ Token stored in localStorage
- ✅ Auto-redirected to `/dashboard`

**Pass Criteria:** All 9 items verified  
**Result:** ⏳ [Document result after testing]

---

### Test 3: File Upload Flow

**Objective:** Verify payment proof upload via new endpoint  
**Priority:** 🔴 CRITICAL  
**Time:** 10 minutes

**Setup:**
- User logged in
- Challan exists (create or use existing pending)
- Test files ready: sample.jpg (500KB), sample.png (500KB), sample.pdf (500KB)

**Procedure:**
1. Navigate to `/challans`
2. Find pending challan
3. Click "Upload Proof"
4. Select `sample.jpg`
5. Click "Upload Proof"

**File Validation Tests:**

| File | Size | Type | Expected | Result |
|------|------|------|----------|--------|
| sample.jpg | 500KB | JPG | ✅ Pass | ⏳ |
| sample.png | 500KB | PNG | ✅ Pass | ⏳ |
| sample.pdf | 500KB | PDF | ✅ Pass | ⏳ |
| large.jpg | 5MB | JPG | ❌ Fail | ⏳ |
| doc.docx | 500KB | DOCX | ❌ Fail | ⏳ |

**Verification (Per Test):**
- ✅ File validation passes/fails correctly
- ✅ POST `/files/upload` returns 200
- ✅ Response contains `file_url` and `filename`
- ✅ File saved in backend `app/uploads/proofs/`
- ✅ File accessible via returned URL
- ✅ Challan updated with `proof_url`
- ✅ Challan status changed to "pending"
- ✅ Dialog closes on success
- ✅ Error messages show for invalid files

**Pass Criteria:** All 9 items verified for valid files; validation works for invalid files  
**Result:** ⏳ [Document result after testing]

---

### Test 4: Members Management (Admin)

**Objective:** Verify member CRUD operations  
**Priority:** 🟡 HIGH  
**Time:** 10 minutes

**Setup:**
- Admin user logged in
- Members exist in database

**Procedure:**
1. Navigate to `/members`
2. View member list
3. Click a member to view details
4. Update member phone number
5. Save changes

**Verification:**
- ✅ GET `/members/` returns member list (200)
- ✅ Members displayed in UI
- ✅ Click member → GET `/members/{id}` succeeds
- ✅ Member details populate edit form
- ✅ Update phone → PUT `/members/{id}` succeeds
- ✅ Changes persist in database
- ✅ UI reflects database changes

**Non-Admin Test:**
- ✅ Regular user cannot access `/members/` (403)
- ✅ Regular user can view own profile at `/profile`

**Pass Criteria:** All 8 items verified  
**Result:** ⏳ [Document result after testing]

---

### Test 5: Challans Workflow

**Objective:** Verify full challan lifecycle  
**Priority:** 🟡 HIGH  
**Time:** 15 minutes

**Member Flow:**

**Procedure:**
1. Navigate to `/challans`
2. Click "Create Challan"
3. Fill: amount=₹500, campaign (if applicable)
4. Submit
5. Upload proof (see Test 3)

**Verification:**
- ✅ POST `/challans/` creates with "generated" status
- ✅ Challan appears in member's list
- ✅ Upload proof changes status to "pending"
- ✅ Member sees only their challans

**Admin Flow:**

**Procedure:**
1. Navigate to `/challans`
2. View all challans
3. Find pending challan
4. Review proof image
5. Click "Approve"

**Verification:**
- ✅ GET `/challans/` returns all challans
- ✅ Status shows correctly (generated, pending, approved, rejected)
- ✅ Proof image displays
- ✅ POST `/challans/{id}/approve` changes status to "approved"
- ✅ Status change reflects immediately in UI
- ✅ Admin can also reject: POST `/challans/{id}/reject`

**Pass Criteria:** All 12 items verified (6 member + 6 admin)  
**Result:** ⏳ [Document result after testing]

---

### Test 6: Campaigns

**Objective:** Verify campaign display and management  
**Priority:** 🟢 MEDIUM  
**Time:** 5 minutes

**Procedure:**
1. Navigate to `/campaigns`
2. View active campaigns
3. (Admin) Create new campaign
4. (Admin) Edit campaign details

**Verification:**
- ✅ GET `/campaigns/` returns campaign list
- ✅ Active campaigns displayed
- ✅ (Admin) POST `/campaigns/` creates campaign
- ✅ (Admin) PUT `/campaigns/{id}` updates campaign
- ✅ Campaign shows goal and current progress

**Pass Criteria:** All 5 items verified  
**Result:** ⏳ [Document result after testing]

---

### Test 7: Notifications

**Objective:** Verify notification system  
**Priority:** 🟢 MEDIUM  
**Time:** 5 minutes

**Procedure:**
1. Check notification bell icon (header)
2. Navigate to `/notifications`
3. View unread notifications
4. Click "Mark as Read"
5. (Admin) Send notification

**Verification:**
- ✅ Unread count displays in bell badge
- ✅ GET `/notifications/` returns notifications
- ✅ PUT `/notifications/{id}/read` marks as read
- ✅ Badge count updates
- ✅ (Admin) POST `/notifications/send` creates notification

**Pass Criteria:** All 5 items verified  
**Result:** ⏳ [Document result after testing]

---

### Test 8: Token & Authentication

**Objective:** Verify token handling and logout  
**Priority:** 🟢 MEDIUM  
**Time:** 5 minutes

**Procedure:**
1. Login successfully
2. Note token in localStorage
3. Make any API call
4. Observe successful response
5. Click logout button
6. Verify redirect to login

**Verification:**
- ✅ Token stored in localStorage as `auth_token`
- ✅ Token included in request headers: `Authorization: Bearer {token}`
- ✅ API calls with valid token succeed (200)
- ✅ POST `/auth/logout` succeeds
- ✅ Token removed from localStorage
- ✅ Redirected to `/login`
- ✅ Cannot access protected routes after logout

**Pass Criteria:** All 7 items verified  
**Result:** ⏳ [Document result after testing]

---

## 🐛 Troubleshooting

### Issue: CORS Error
```
Access-Control-Allow-Origin error at 'http://localhost:8000/auth/login' 
from origin 'http://localhost:5173'
```

**Solution:**
1. Verify backend CORS middleware is configured
2. Check `.env.local` has correct backend URL
3. Restart both servers

**Backend Check:**
```python
# app/main.py should have:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### Issue: 401 Unauthorized
```json
{"detail": "Not authenticated"}
```

**Solution:**
1. Check token in localStorage: `localStorage.getItem('auth_token')`
2. Verify token format in header: `Authorization: Bearer {token}`
3. Ensure token is not expired

**Frontend Check:**
```javascript
// src/api/charityClient.js
const token = localStorage.getItem('auth_token');
if (token) {
  headers.Authorization = `Bearer ${token}`;
}
```

---

### Issue: 400 File Upload Error
```json
{"detail": "File size exceeds 3MB limit"}
```

**Solution:**
1. Verify file size < 3MB
2. Check file type is JPG, PNG, or PDF
3. Frontend already validates before upload

**Validation:**
- Max size: 3,145,728 bytes (3MB exactly)
- Types: image/jpeg, image/png, application/pdf

---

## 📊 Test Results Template

```markdown
## Test Results - [Date]

**Tester:** [Name]  
**Duration:** [X hours]  
**Status:** ✅ PASS / ⚠️ ISSUES / ❌ FAIL

### Results Summary

| Test # | Name | Status | Notes |
|--------|------|--------|-------|
| 1 | Login | ✅ | Smooth flow |
| 2 | Registration | ✅ | All validations work |
| 3 | File Upload | ✅ | JPG/PNG/PDF all pass |
| 4 | Members | ✅ | Created/Updated successfully |
| 5 | Challans | ✅ | Full lifecycle working |
| 6 | Campaigns | ✅ | Displaying correctly |
| 7 | Notifications | ✅ | Counts update properly |
| 8 | Auth | ✅ | Token handling correct |

### Issues Found

| # | Description | Severity | Owner | Status |
|---|-------------|----------|-------|--------|
| BUG-001 | [Description] | High | Backend | Open |
| BUG-002 | [Description] | Medium | Frontend | In Progress |

### Sign-Off

- Frontend Lead: _________________ Date: _______
- Backend Lead: _________________ Date: _______
- QA Lead: _________________ Date: _______
```

---

## ✅ Success Criteria - Phase 1

All items must be verified ✅ before proceeding to staging:

- [ ] Test 1: Login with email works
- [ ] Test 2: Registration creates user + member
- [ ] Test 3: File upload saves and returns URL
- [ ] Test 4: Members CRUD operations work
- [ ] Test 5: Challan workflow complete
- [ ] Test 6: Campaigns display correctly
- [ ] Test 7: Notifications send/read
- [ ] Test 8: Token handling correct
- [ ] No CORS errors in console
- [ ] No 401/403 errors (except expected ones)
- [ ] No unhandled exceptions
- [ ] Performance acceptable (< 2s response time)

---

## 📞 Testing Support

**During Testing:**
- **Issues:** Document in this guide or create GitHub issue
- **Questions:** Ask in team Slack channel
- **Urgent:** Contact QA Lead directly

**After Testing:**
- Document all results in template above
- Create issue tracker entry for any bugs
- Schedule follow-up fixes if needed

---

## 🔗 Related Documents

- [COMMUNICATION_LOG.md](COMMUNICATION_LOG.md) - Team communication & decisions
- [CHANGELOG.md](CHANGELOG.md) - Technical changes documentation
- [README.md](README.md) - Project overview & setup

---

**Document Control:**  
Version: 1.0 | Created: 2026-02-24 | Owner: QA Lead  
Next Review: After Phase 1 testing complete
