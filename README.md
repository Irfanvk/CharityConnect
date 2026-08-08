# CharityConnect Frontend

React frontend for **CharityConnect** — a membership and donation management platform with role-based dashboards, payment workflows, and admin tools.

---

## Tech Stack

| Layer               | Technology                          |
|---------------------|-------------------------------------|
| Framework           | React 18                            |
| Build Tool          | Vite                                |
| Styling             | Tailwind CSS + PostCSS              |
| UI Components       | shadcn/ui (Radix UI headless)       |
| State Management    | TanStack React Query v5 + Context   |
| Routing             | React Router v6                     |
| HTTP Client         | Custom fetch-based `charityClient`  |
| Animations          | Framer Motion                       |
| PWA                 | vite-plugin-pwa                     |

---

## Prerequisites

- **Node.js** v16+ and **npm**
- **Backend API** running (see [backend README](../charity-connect-backend/README.md))

---

## Quick Start

```bash
cd CharityConnect

# Install dependencies
npm install

# Create environment config
cp .env.example .env.local
# Edit .env.local — set VITE_CHARITY_APP_BASE_URL to your backend

# Start development server
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Environment Variables

Create `.env.local` in the frontend root:

```env
# Backend API URL (required)
VITE_CHARITY_APP_BASE_URL=http://localhost:8000

# App identifier (optional)
VITE_CHARITY_APP_ID=charity-connect

# API version (optional, defaults to v1)
VITE_CHARITY_FUNCTIONS_VERSION=v1
```

> **Important:** Point `VITE_CHARITY_APP_BASE_URL` at your running FastAPI backend, not the mock server.

---

## npm Scripts

| Command             | Description                                    |
|---------------------|------------------------------------------------|
| `npm run dev`       | Start Vite dev server (http://localhost:5173)  |
| `npm run build`     | Build production bundle to `dist/`             |
| `npm run preview`   | Preview production build locally               |
| `npm run lint`      | Run ESLint checks                              |
| `npm run lint:fix`  | Auto-fix ESLint issues                         |
| `npm run mock`      | Start Express mock backend (dev only)          |

---

## Project Structure

```
src/
├── api/
│   └── charityClient.js          # Central API client — ALL backend calls go through here
├── config/
│   ├── appPaths.js                # App routes, page paths, image URLs
│   └── apiPaths.js                # Backend API endpoint paths
├── lib/
│   ├── AuthContext.jsx            # Auth state (login/logout, token, user, role)
│   ├── app-params.js              # App configuration from env vars
│   └── utils.js                   # Utility functions (cn, AUTH_TOKEN_KEY)
├── pages/
│   ├── Login.jsx                  # Login page (username/email + password)
│   ├── Register.jsx               # Registration with invite code
│   ├── Dashboard.jsx              # Role-based dashboard (member/admin/superadmin)
│   ├── Members.jsx                # Member directory & management
│   ├── Challans.jsx               # Payment challan list, create, upload proof
│   ├── Campaigns.jsx              # Campaign list, create, donate
│   ├── Profile.jsx                # User profile view & edit
│   ├── Notifications.jsx          # Notification feed & send (admin)
│   ├── Reports.jsx                # Financial reports & charts
│   ├── Settings.jsx               # App settings
│   ├── Import.jsx                 # CSV/XLSX import tool (admin)
│   ├── Requests.jsx               # Member's own requests
│   ├── MemberRequests.jsx         # Member request form (amount/profile/complaint)
│   ├── AdminRequests.jsx          # Admin request review panel
│   ├── AuditLogs.jsx              # Audit log viewer (admin)
│   ├── SuperadminPanel.jsx        # Superadmin tools (invites, wipe, users)
│   └── Documentation.jsx          # In-app documentation
├── components/
│   ├── ui/                        # shadcn/ui component wrappers (Button, Dialog, etc.)
│   ├── campaigns/                 # Campaign cards, forms, donation dialog
│   ├── challans/                  # Challan table, proof upload, approval
│   ├── dashboard/                 # Dashboard cards, charts, role-specific panels
│   ├── members/                   # Member list, forms, import
│   ├── mobile/                    # Mobile bottom nav, back button
│   ├── onboarding/                # Onboarding wizard steps
│   ├── profile/                   # Profile form, avatar
│   └── notifications/             # Notification bell, list, send form
├── hooks/                         # Custom React hooks
├── utils/                         # Shared utility functions
├── App.jsx                        # Root component with router
├── Layout.jsx                     # App shell (sidebar, header, mobile nav)
├── main.jsx                       # Entry point
└── index.css                      # Global Tailwind styles

mock-server/
└── index.js                       # Express mock backend (dev only)
```

---

## Architecture

### API Client (`charityClient.js`)

All backend communication goes through `src/api/charityClient.js` — a custom fetch-based client with:

- **Auto token injection** — reads JWT from localStorage, attaches `Authorization: Bearer` header
- **Entity proxy pattern** — `charityClient.entities.Member.list()`, `.get(id)`, `.create(data)`, `.update(id, data)`, `.delete(id)`
- **Specialized methods** — `charityClient.auth.*`, `charityClient.challans.*`, `charityClient.notifications.*`, `charityClient.campaigns.*`
- **Error handling** — throws on non-OK responses with parsed error body

```js
// Examples:
await charityClient.auth.login({ username, password })
await charityClient.members.list()
await charityClient.challans.uploadProof(challanId, formData)
await charityClient.notifications.send({ title, message, target_type })
```

### Auth Context (`AuthContext.jsx`)

Provides app-wide auth state via React Context:

- `user` — current user object (with role, member info)
- `token` — JWT token string
- `isAuthenticated` — boolean
- `login(credentials)` — call `/auth/login`, store token, fetch user
- `logout()` — clear token, redirect to login
- `setAuthenticatedUser(user)` — manual user set (used after registration)

### Routing & Role Access

React Router v6 with role-based route protection:

| Page              | Route              | Access       |
|-------------------|--------------------|--------------|
| Login             | `/login`           | Public       |
| Register          | `/register`        | Public       |
| Dashboard         | `/`                | All auth     |
| Members           | `/members`         | Admin+       |
| Challans          | `/challans`        | All auth     |
| Campaigns         | `/campaigns`       | All auth     |
| Profile           | `/profile`         | All auth     |
| Notifications     | `/notifications`   | All auth     |
| Reports           | `/reports`         | Admin+       |
| Settings          | `/settings`        | All auth     |
| Member Requests   | `/requests`        | All auth     |
| Admin Requests    | `/admin-requests`  | Admin+       |
| Import            | `/import`          | Superadmin   |
| Audit Logs        | `/audit-logs`      | Admin+       |
| Superadmin Panel  | `/superadmin`      | Superadmin   |

---

## Key User Flows

### Login

1. User enters username/email + password on Login page
2. Frontend calls `POST /auth/login` via `charityClient.auth.login()`
3. Backend returns `{ access_token, user }` with JWT
4. Token stored in localStorage (`auth_token` key) and in-memory
5. `GET /auth/me` fetches full user profile (with member data)
6. User redirected to Dashboard

### Registration (Invite-Only)

1. User receives invite code from admin (via WhatsApp, email, etc.)
2. User enters invite code on Register page → validated via `POST /invites/validate`
3. User fills form: username, password, email, phone
4. `POST /auth/register` creates account + member profile
5. User is auto-logged-in and redirected to Dashboard

### Monthly Payment (Challan)

1. Member navigates to Challans page
2. Clicks "Create Challan" → selects month(s) from payable months list
3. Challan created with status `generated`
4. Member uploads payment proof (JPG/PNG/PDF) → status becomes `pending`
5. Admin sees pending challans in their dashboard or Challans page
6. Admin clicks Approve → status: `approved` | or Reject (with reason) → status: `rejected`
7. If rejected, member can re-upload proof

### Bulk Payment

1. Member selects multiple unpaid months on Challans page
2. Uploads single proof for all selected months
3. Backend creates individual challans grouped under a BulkChallanGroup
4. Admin approves/rejects the entire group at once

### Campaign Donation

1. Admin creates campaign (title, description, target amount, dates)
2. Members see active campaigns on Campaigns page
3. Member clicks "Donate" → enters amount → frontend posts to `POST /campaigns/{id}/donate`
4. Donation is saved as a pending campaign challan until an admin approves it
5. Campaign progress bar, profile history, and statements update only after approval

### Member Requests

1. Member navigates to Requests page
2. Selects request type: monthly amount change, profile update, complaint, suggestion
3. Fills in details and submits
4. Admin sees pending requests in Admin Requests page
5. Admin approves (changes are auto-applied) or rejects (with reason)
6. Member sees updated status on their Requests page

### Profile Update

1. Member navigates to Profile page
2. Edits profile fields (phone, email, etc.)
3. Submits update → `PUT /users/{id}` and/or `PUT /members/{id}`
4. For monthly amount changes, a member request is created instead (requires admin approval)

---

## Config Files (Single Source of Truth)

When routes or API paths change, update these centralized config files:

### `src/config/appPaths.js`
- `APP_PATHS` — app routes (login, home, dashboard)
- `PAGE_PATHS` — named page routes with route keys
- `APP_IMAGES` — image URLs used across the app

### `src/config/apiPaths.js`
- `API_PATHS.auth.*` — auth endpoints
- `API_PATHS.members.*`, `API_PATHS.challans.*`, etc. — resource endpoints
- Dynamic path builders: `API_PATHS.members.byId(id)`, `API_PATHS.challans.byId(id)`

**Rule:** Never hardcode route or API paths in components — always import from config.

---

## Building for Production

```bash
# Build optimized bundle
npm run build

# Preview locally
npm run preview
# Opens at http://localhost:4173
```

The `dist/` folder contains the production build ready for deployment.

### Deploy to Vercel

1. Import project in Vercel (Framework: Vite)
2. Set environment variables:
   - `VITE_CHARITY_APP_BASE_URL` = your production backend URL
   - `VITE_CHARITY_APP_ID` (optional)
3. Build command: `npm run build`, output: `dist`
4. The included `vercel.json` handles SPA rewrites and security headers.

### Deploy to Netlify

1. Build command: `npm run build`, publish dir: `dist`
2. Set environment variables in Netlify dashboard
3. The included `netlify.toml` handles SPA redirects.

### Deploy via Docker

From `CharityConnect-main/` parent directory:
```bash
docker-compose up --build
```
Frontend runs at **http://localhost:3000**

> **Important:** After deploying frontend, update the backend's `ALLOWED_ORIGINS` env var to include your frontend's production URL.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Frontend won't load | Check `npm run dev` is running, inspect browser console |
| Login fails | Verify backend is running at the URL in `VITE_CHARITY_APP_BASE_URL` |
| CORS errors | Add frontend origin to backend's `ALLOWED_ORIGINS` env var |
| Blank page after login | Check browser console for JS errors; ensure `/auth/me` returns valid user |
| Styles broken | Run `npm run build` then `npm run preview`; or `rm -rf node_modules && npm install` |
| API 401 errors | Token may be expired — logout and login again |
| File upload fails | Ensure file is JPG/PNG/PDF and under 3MB |
| Build fails | Run `npm run lint` to check for syntax errors |
