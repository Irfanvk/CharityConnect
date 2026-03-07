# 📚 API Integration Guide: Usage Examples

Quick reference for using the new API modules after merging to main.

---

## Current State (Before Merge)

```javascript
// Currently: Direct charityClient usage
import { charityClient } from "@/api/charityClient";

// Login
const loginResponse = await charityClient.auth.login(credentials);

// Get member profile
const profile = await charityClient.members.getMe();

// Get all campaigns
const campaigns = await charityClient.campaigns.getAll();

// Create a campaign
const newCampaign = await charityClient.campaigns.create(campaignData);
```

---

## New Pattern (After Merge)

### Authentication API

```javascript
// Import from dedicated module
import { 
  loginUser, 
  registerUser, 
  getCurrentUser, 
  logoutUser 
} from "@/api/authApi";

// Usage
const loginResponse = await loginUser(credentials);
const user = await getCurrentUser();
const newUser = await registerUser(signupData);
await logoutUser();
```

**When to use:**
- All authentication-related operations
- Login/logout flows
- Registration with invite
- Current user data

---

### Members API

```javascript
import { 
  getAllMembers, 
  getMyProfile, 
  getMemberByCode, 
  getMemberById, 
  updateMember 
} from "@/api/membersApi";

// Get current member profile
const profile = await getMyProfile();

// Get specific member (as admin)
const member = await getMemberById(memberId);

// Get member by member code
const member = await getMemberByCode("M001234");

// List all members (admin only)
const members = await getAllMembers(skip=0, limit=100);

// Update member info
const updated = await updateMember(memberId, { 
  email: "new@example.com",
  phone: "1234567890"
});
```

**When to use:**
- Getting member information
- Displaying member profiles
- Admin member management
- Member list views

---

### Campaigns API

```javascript
import { 
  getAllCampaigns, 
  getCampaignById, 
  createCampaign, 
  updateCampaign, 
  deleteCampaign 
} from "@/api/campaignsApi";

// Get all campaigns
const campaigns = await getAllCampaigns({
  skip: 0,
  limit: 50,
  status: "active"
});

// Get campaign details
const campaign = await getCampaignById(campaignId);

// Create new campaign
const newCampaign = await createCampaign({
  title: "Relief Fund 2026",
  description: "Help those in need",
  target_amount: 10000,
  start_date: "2026-03-01",
  end_date: "2026-12-31"
});

// Update campaign
const updated = await updateCampaign(campaignId, {
  title: "Updated Title",
  target_amount: 15000
});

// Delete campaign
await deleteCampaign(campaignId);
```

**When to use:**
- Campaign listing pages
- Campaign detail views
- Campaign creation/editing
- Campaign statistics

---

### Challans API

```javascript
import { 
  getAllChallans, 
  getChallanById, 
  createChallan, 
  updateChallan, 
  deleteChallan, 
  uploadChallanProof 
} from "@/api/challansApi";

// List all challans
const challans = await getAllChallans({
  skip: 0,
  limit: 100,
  status: "pending"
});

// Get challan details
const challan = await getChallanById(challanId);

// Create challan
const newChallan = await createChallan({
  member_id: memberId,
  amount: 1000,
  challan_month: "2026-03",
  description: "Monthly donation"
});

// Update challan status
const updated = await updateChallan(challanId, {
  status: "approved",
  approval_notes: "Verified"
});

// Upload proof
const proofData = await uploadChallanProof(challanId, fileObject);

// Delete challan
await deleteChallan(challanId);
```

**When to use:**
- Tax receipt (challan) management
- Donation tracking
- Proof of donation uploads
- Challan approval workflows

---

### Notifications API

```javascript
import { 
  getNotifications, 
  markNotificationAsRead, 
  deleteNotification, 
  markAllAsRead 
} from "@/api/notificationsApi";

// Get notifications
const notifications = await getNotifications({
  skip: 0,
  limit: 50
});

// Mark single notification as read
await markNotificationAsRead(notificationId);

// Mark all as read
await markAllAsRead();

// Delete notification
await deleteNotification(notificationId);
```

**When to use:**
- Notification list pages
- Loading notification bell count
- Mark as read actions
- Notification cleanup

---

### Invites API

```javascript
import { 
  sendInvite, 
  getInvites, 
  updateInviteStatus, 
  resendInvite 
} from "@/api/invitesApi";

// Send new invite
const invite = await sendInvite({
  email: "newmember@example.com",
  role: "member",
  message: "Join our charity"
});

// Get all invites
const invites = await getInvites({
  status: "pending"
});

// Update invite status
const updated = await updateInviteStatus(inviteId, {
  status: "accepted"
});

// Resend invite
await resendInvite(inviteId);
```

**When to use:**
- Member invitation workflows
- Invite management pages
- Resend invitation features
- Invite status tracking

---

### Bulk Challans API

```javascript
import { 
  bulkCreateChallans, 
  getPendingBulkOperations, 
  getBulkChallanDetails, 
  approveBulkChallans, 
  rejectBulkChallans 
} from "@/api/bulkChallansApi";

// Create multiple challans at once
const bulkResult = await bulkCreateChallans({
  member_id: memberId,
  amounts: [1000, 1000, 1000],
  months: ["2026-01", "2026-02", "2026-03"],
  proof_url: "https://..."
});

// Get pending bulk operations
const pending = await getPendingBulkOperations({
  days: 7,
  sortBy: "created_at",
  order: "desc"
});

// Get bulk operation details
const details = await getBulkChallanDetails(bulkGroupId);

// Approve bulk operation
const approved = await approveBulkChallans(bulkGroupId, {
  approved_by: adminId
});

// Reject bulk operation
const rejected = await rejectBulkChallans(bulkGroupId, {
  rejection_reason: "Documentation incomplete"
});
```

**When to use:**
- Bulk donation uploads
- Batch challan creation
- Admin approval workflows
- Batch operation management

---

### Files API

```javascript
import { uploadFile, downloadFile } from "@/api/filesApi";

// Upload file
const fileResponse = await uploadFile(fileObject, {
  type: "proof",
  entity_id: challanId
});

// Download file
const fileUrl = await downloadFile(fileId);
```

**When to use:**
- File uploads (proofs, documents)
- File downloads
- Media management

---

### Audit Logs API

```javascript
import { getAuditLogs, createAuditLog } from "@/api/auditLogsApi";

// Get audit logs (admin only)
const logs = await getAuditLogs({
  skip: 0,
  limit: 100,
  userId: memberId,
  entityType: "campaign",
  action: "create"
});

// Create audit log entry (admin only)
const log = await createAuditLog({
  user_id: adminId,
  entity_type: "challan",
  entity_id: challanId,
  action: "approved",
  details: "Challan approved after verification"
});
```

**When to use:**
- Audit trail viewing (admin)
- Compliance reporting
- Activity logging

---

### Users API

```javascript
import { 
  getUser, 
  getAllUsers, 
  updateUser, 
  deleteUser 
} from "@/api/usersApi";

// Get user details
const user = await getUser(userId);

// List all users (admin)
const users = await getAllUsers({
  skip: 0,
  limit: 100
});

// Update user info
const updated = await updateUser(userId, {
  name: "New Name",
  email: "new@example.com"
});

// Delete user (admin)
await deleteUser(userId);
```

**When to use:**
- User management
- User profile views
- Admin user administration

---

## Migration Examples

### Before: Dashboard Component

```javascript
import { charityClient } from "@/api/charityClient";

export function Dashboard() {
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    async function load() {
      const data = await charityClient.campaigns.getAll();
      setCampaigns(data);
    }
    load();
  }, []);

  return <div>{campaigns.map(c => <CampaignCard {...c} />)}</div>;
}
```

### After: Dashboard Component (Recommended)

```javascript
import { getAllCampaigns } from "@/api/campaignsApi";

export function Dashboard() {
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    async function load() {
      const data = await getAllCampaigns();
      setCampaigns(data);
    }
    load();
  }, []);

  return <div>{campaigns.map(c => <CampaignCard {...c} />)}</div>;
}
```

**Benefits:**
- ✅ Clear function name (`getAllCampaigns` vs `charityClient.campaigns.getAll()`)
- ✅ Easier to search for usage
- ✅ Better IDE autocomplete
- ✅ Simpler to test with mocks

---

## React Query Integration

### Current Pattern

```javascript
import { useQuery } from "@tanstack/react-query";
import { charityClient } from "@/api/charityClient";

export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: () => charityClient.campaigns.getAll()
  });
}
```

### Improved Pattern

```javascript
import { useQuery } from "@tanstack/react-query";
import { getAllCampaigns } from "@/api/campaignsApi";

export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: getAllCampaigns
  });
}
```

---

## Error Handling

### Pattern

```javascript
import { getAllCampaigns } from "@/api/campaignsApi";

try {
  const campaigns = await getAllCampaigns();
  console.log("Loaded campaigns:", campaigns);
} catch (error) {
  if (error.response?.status === 403) {
    console.error("Permission denied");
  } else if (error.response?.status === 404) {
    console.error("Not found");
  } else {
    console.error("Unexpected error:", error.message);
  }
}
```

---

## Barrel Export (Recommended Future Addition)

Create `src/api/index.js`:

```javascript
// Re-export all API modules for convenience
export * from "./authApi.js";
export * from "./membersApi.js";
export * from "./campaignsApi.js";
export * from "./challansApi.js";
export * from "./notificationsApi.js";
export * from "./invitesApi.js";
export * from "./bulkChallansApi.js";
export * from "./filesApi.js";
export * from "./auditLogsApi.js";
export * from "./usersApi.js";
```

Then use:

```javascript
import { 
  getAllCampaigns, 
  getMyProfile,
  loginUser 
} from "@/api";

// Instead of:
import { getAllCampaigns } from "@/api/campaignsApi";
import { getMyProfile } from "@/api/membersApi";
import { loginUser } from "@/api/authApi";
```

---

## TypeScript Support (Future Enhancement)

Create `src/api/types.ts`:

```typescript
export interface Campaign {
  id: string;
  title: string;
  description: string;
  target_amount: number;
  collected_amount: number;
  status: "active" | "inactive" | "completed";
  created_at: string;
}

export type CampaignFilter = {
  status?: Campaign["status"];
  skip?: number;
  limit?: number;
};
```

Then type API functions:

```typescript
import { Campaign } from "./types";

export const getAllCampaigns = async (
  filters?: CampaignFilter
): Promise<Campaign[]> => {
  return await charityClient.campaigns.getAll(filters);
};
```

---

## Quick Reference Table

| Need | API Module | Function |
|------|-----------|----------|
| Login | authApi | `loginUser()` |
| Get profile | membersApi | `getMyProfile()` |
| List campaigns | campaignsApi | `getAllCampaigns()` |
| Create campaign | campaignsApi | `createCampaign()` |
| List challans | challansApi | `getAllChallans()` |
| Approve challan bulk | bulkChallansApi | `approveBulkChallans()` |
| Get notifications | notificationsApi | `getNotifications()` |
| Send invite | invitesApi | `sendInvite()` |
| Upload file | filesApi | `uploadFile()` |
| View audit logs | auditLogsApi | `getAuditLogs()` |

---

**Ready to integrate!** Start using the new API modules after merge. 🚀

