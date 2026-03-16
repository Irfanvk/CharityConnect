# CharityConnect - Charity Management Platform

**Welcome to the CharityConnect project** — a modern fundraising and charity management platform built with React, Vite, and Radix UI.

## About

CharityConnect is a full-featured web application for managing donations, campaigns, recurring payments, and member engagement. This repository contains the **frontend React application** that runs locally for development and testing.

## Quick Start

### Prerequisites

- **Node.js** (v16+) and **npm** installed
- **Git** for cloning the repository
- **Backend URL** available (or run the included mock server)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd CharityConnect-main/CharityConnect
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env.local` file:**
   ```bash
   # Copy the example file
  cp .env.example .env.local
   
   # Edit .env.local with your values:
   VITE_CHARITY_APP_ID=your_app_id
   VITE_CHARITY_APP_BASE_URL=http://localhost:8000  # FastAPI backend (or http://localhost:4000 for mock)
   ```

   **Environment Variables:**
   - `VITE_CHARITY_APP_ID` — Your app identifier (optional)
   - `VITE_CHARITY_APP_BASE_URL` — Backend API base URL (required)
     - For FastAPI backend: `http://localhost:8000`
     - For mock server: `http://localhost:4000`
     - For production: `https://your-backend-url.example.com`
   - `VITE_CHARITY_FUNCTIONS_VERSION` — Optional; defaults to v1

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   The frontend will be available at **http://localhost:5173**

---

## Available npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (http://localhost:5173) |
| `npm run mock` | Start local Express mock backend (http://localhost:4000) |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint checks |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run typecheck` | Check TypeScript types (via JSConfig) |

---

## Development Setup

### Option 1: Using Mock Backend (Recommended for Local Dev)

The project includes a **local Express mock server** that simulates the real backend API:

```bash
# Terminal 1: Start mock backend
npm run mock
# Mock server listens on http://localhost:4000

# Terminal 2: Start frontend dev server
npm run dev
# Frontend runs on http://localhost:5173
```

Then open **http://localhost:5173** in your browser and log in with any email (e.g., `admin@example.com`).

**Mock Backend Features:**
- ✅ Full auth flow (`/auth/login`, `/auth/me`)
- ✅ CRUD endpoints for all entities (campaigns, challans, members, etc.)
- ✅ In-memory data store (resets on restart)
- ✅ CORS-enabled for frontend requests
- ✅ Mock token: `mock-token-123`

### Option 2: Using Real Backend (FastAPI)

Set `VITE_CHARITY_APP_BASE_URL` to your FastAPI backend URL:

```bash
# .env.local
VITE_CHARITY_APP_BASE_URL=http://localhost:8000  # FastAPI default port

npm run dev
```

**Note:** The FastAPI backend typically runs on port **8000**. Make sure the backend server is running before starting the frontend.

---

## Project Structure

```
src/
├── api/                           # API client & configurations
│   └── charityClient.js          # Custom fetch-based API client
├── components/                    # Reusable React components
│   ├── ui/                       # Radix UI component wrappers
│   ├── campaigns/                # Campaign-related components
│   ├── challans/                 # Challan (payment) components
│   ├── dashboard/                # Dashboard components
│   ├── members/                  # Member management components
│   ├── mobile/                   # Mobile-specific components (bottom nav, back button, etc.)
│   ├── onboarding/               # Onboarding wizard
│   ├── profile/                  # User profile components
│   └── [other]/                  # Notifications, forms, etc.
├── lib/                           # Utilities & config
│   ├── AuthContext.jsx           # Authentication state management
│   ├── app-params.js             # App configuration
│   └── utils.js                  # Helper functions
├── pages/                         # Page components (React Router views)
│   ├── Dashboard.jsx             # Main dashboard
│   ├── Campaigns.jsx             # Campaign management
│   ├── Challans.jsx              # Payment/challan management
│   ├── Members.jsx               # Member directory
│   ├── Profile.jsx               # User profile
│   ├── Settings.jsx              # App settings
│   ├── Register.jsx              # Registration page
│   └── [other pages]/
├── hooks/                         # Custom React hooks
├── utils/                         # Utility functions
├── App.jsx                        # Root component
├── main.jsx                       # Entry point
└── index.css                      # Global styles (Tailwind)

mock-server/
└── index.js                       # Express mock backend

dist/                             # Production build output (after npm run build)
```

---

## Central Config Guide (Single Source of Truth)

To avoid hardcoded strings across components, update these files when paths/URLs change:

- **App routes + page shortcuts + image URLs:** `src/config/appPaths.js`
  - `APP_PATHS` → app-level routes (e.g., login, home)
  - `ROUTE_KEYS` + `PAGE_PATHS` → page keys and generated route shortcuts
  - `APP_IMAGES` → shared image URLs used by UI pages

- **Backend API endpoint paths:** `src/config/apiPaths.js`
  - `API_PATHS.auth.*` → auth endpoints
  - `API_PATHS.members.*`, `API_PATHS.challans.*`, etc. → resource endpoints
  - Includes dynamic path builders like `byId(id)`

### Current Usage

- `src/api/charityClient.js` uses `API_PATHS` for all API calls.
- `src/lib/AuthContext.jsx` uses `API_PATHS` + `APP_PATHS` for startup/auth redirects.
- `src/Layout.jsx`, `src/components/mobile/BottomNav.jsx`, and `src/components/dashboard/SuperAdminDashboard.jsx` use `PAGE_PATHS` for navigation.
- `src/pages/Dashboard.jsx` uses `APP_IMAGES` for background images.

**Rule:** If you need to change route/image/endpoint strings, change config first, then reuse everywhere.

---

## Authentication & Login Flow

### How It Works

1. **User opens the app** → http://localhost:5173
2. **User navigates to Login page** and enters email
3. **Frontend calls** `POST /auth/login` with email
4. **Backend returns** `{ token, user }`
5. **Token is stored** in localStorage under key `AUTH_TOKEN_KEY` (`auth_token`)
6. **Subsequent API requests** include `Authorization: Bearer <token>`
7. **User is redirected** to Dashboard on success

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | Authenticate user; **body:** `{ "email": "user@example.com" }` |
| `GET` | `/auth/me` | Get current user profile; **requires** `Authorization: Bearer <token>` |
| `GET` | `/entities/:entity` | List any entity (campaigns, members, challans, etc.) |
| `POST` | `/entities/:entity` | Create a new entity record |
| `GET` | `/entities/:entity/:id` | Get a specific entity record |
| `PUT` | `/entities/:entity/:id` | Update an entity record |
| `DELETE` | `/entities/:entity/:id` | Delete an entity record |

### Testing Login Flow

**Using curl (when mock running):**
```bash
# Get token
curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com"}' | jq

# Use token to call /auth/me
curl -s -X GET http://localhost:4000/auth/me \
  -H "Authorization: Bearer mock-token-123" | jq
```

### Token Storage & Security Notes

- **Current:** Tokens stored in `localStorage` for development simplicity
- **Production recommendations:**
  - Use **secure HTTP-only cookies** to prevent XSS theft
  - Implement **short-lived tokens** (5-15 min) with refresh token rotation
  - Use HTTPS-only cookies with SameSite flags
  - Rotate tokens on login/logout cycles

---

## Building for Production

### Build the Frontend

```bash
npm run build
```

This creates a production-optimized bundle in the `dist/` folder.

**Output:**
- `dist/index.html` — Main HTML entry point
- `dist/assets/` — Minified JS, CSS, and other assets

### Preview Production Build Locally

```bash
npm run preview
```

Then open http://localhost:4173 to test the production build locally.

### Deploy to Production

1. Run `npm run build` to generate `dist/`
2. Deploy `dist/` folder to your hosting (Vercel, Netlify, AWS S3, etc.)
3. **Important:** Set `VITE_CHARITY_APP_BASE_URL` to your production backend URL in your host's environment

### Vercel Production Setup

This repository now includes [vercel.json](vercel.json) with:
- Vite build/output settings
- SPA rewrite fallback for React Router refresh/deep-links
- Production security headers
- Long-term caching for hashed `/assets/*` files

#### 1. Import Project in Vercel
- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

#### 2. Configure Environment Variables (Vercel)
Set these in Vercel Project Settings -> Environment Variables:

- `VITE_CHARITY_APP_BASE_URL`
- `VITE_CHARITY_APP_ID` (optional)
- `VITE_CHARITY_FUNCTIONS_VERSION` (optional)

Use your real backend URL, for example:
`https://api.your-charity-domain.com`

#### 3. Configure Backend CORS for Vercel Domain
In backend environment (`charity-connect-backend`), set `CORS_ORIGINS` to include your deployed frontend URL.

Example:
`CORS_ORIGINS=https://your-app.vercel.app,https://www.yourdomain.com`

#### 4. Deploy and Verify
- Open your deployed URL
- Hard refresh a nested route (for example `/campaigns`) to verify rewrite fallback works
- Login and perform one API action to confirm backend CORS + auth flow works in production

---

## Backend Integration

This frontend is designed to work with a **FastAPI backend** (Python). See the following documents for integration details:

- **[BACKEND_IMPLEMENTATION.md](BACKEND_IMPLEMENTATION.md)** - Complete backend specification
- **[BACKEND_FRONTEND_ALIGNMENT.md](BACKEND_FRONTEND_ALIGNMENT.md)** - Alignment analysis and required changes
- **[FRONTEND_IMPLEMENTATION_PLAN.md](FRONTEND_IMPLEMENTATION_PLAN.md)** - Frontend changes and decisions needed

### Key Integration Points

**API Compatibility:**
- Frontend uses generic entity pattern: `GET /entities/:entity`
- Backend may use resource-specific routes: `GET /members/`, `GET /challans/`
- Alignment work in progress - see alignment document for details

**Authentication Flow:**
- Frontend: Email-based authentication
- Backend: FastAPI with JWT tokens
- Token storage: localStorage (development) or secure cookies (production)

**File Uploads:**
- Frontend: Expects separate file upload endpoint returning URL
- Backend: May use combined challan + upload endpoint
- See alignment document for current status

---

## Features & Recent Improvements

### ✅ Implemented Features

- **User Authentication** — Email-based login with token storage
- **Dashboard** — Overview of campaigns, challans, members, and recent activity
- **Campaign Management** — Create, view, and manage fundraising campaigns
- **Challan System** — Generate payment challans and upload proof of payment
- **Member Directory** — View and manage organization members
- **Profile Management** — Complete and update user profiles
- **Recurring Donations** — Set up recurring monthly contributions
- **Notification System** — Real-time toast notifications with auto-dismiss
- **Onboarding Wizard** — Multi-step guided setup for new users
- **Responsive Design** — Mobile-first UI with Tailwind CSS

### 🎯 Recent Fixes & Improvements

- **Toast Notifications** — Fixed auto-dismiss (5-second timeout) with manual close button
- **Accessibility** — Added DialogTitle to all dialog boxes for screen reader support
- **Mobile UI** — Fixed scrolling issues in onboarding wizard (buttons now sticky at bottom)
- **Form Validation** — Improved error handling across all forms
- **API Integration** — Normalized all array responses with safe guards
- **Authentication** — Dev mode auto-injects mock token for easier testing

---

## Common Tasks

### Run Both Frontend & Backend Simultaneously

```bash
# Terminal 1
npm run mock

# Terminal 2
npm run dev
```

Then develop at http://localhost:5173

### Check for Code Quality Issues

```bash
npm run lint          # Show ESLint warnings
npm run lint:fix      # Auto-fix issues
npm run typecheck     # Check TypeScript
```

### Clear Cache & Reinstall Dependencies

```bash
rm -r node_modules .vite package-lock.json
npm install
npm run dev
```

### Smoke Test (Validate Frontend Loads)

```bash
$env:VITE_CHARITY_APP_BASE_URL='http://localhost:4000'; node scripts/smoke.js
```

If running the mock backend, you should see:
```
DEV_STATUS 200         # ✅ Frontend serves successfully
DEV_INDEX_ROOT true    # ✅ Root HTML found
BACKEND_STATUS 401     # ℹ️  Auth required (expected without token)
```

---

## Troubleshooting

### Frontend won't load on http://localhost:5173

**Check:**
- Is the dev server running? (`npm run dev`)
- Are there console errors? (Check browser DevTools)
- Does `dist/` folder exist? (Try `npm run build` first)

### Login fails or "Missing token" error

**Check:**
- Is the mock backend running? (`npm run mock`)
- Is `VITE_CHARITY_APP_BASE_URL` set correctly in `.env.local`?
- Confirm mock token in dev mode: Check localStorage for `auth_token`

### Styles look broken or components not rendering

**Try:**
```bash
npm run build         # Rebuild everything
npm run preview       # Check production build
rm -r node_modules && npm install  # Fresh install
```

### ESLint or type-check errors

```bash
npm run lint:fix      # Auto-fix linting issues
npm run typecheck     # Identify type issues
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | React 18 |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS + PostCSS |
| **UI Components** | Radix UI (headless) + custom wrappers |
| **Forms** | React Hook Form + Zod validation |
| **State Management** | TanStack React Query + React Context |
| **Routing** | React Router v6 |
| **HTTP Client** | Custom Fetch-based client |
| **Mock Backend** | Express.js (dev only) |
| **Code Quality** | ESLint + Prettier |

---

## Development Notes

### Custom API Client (charityClient)

The project uses a **custom fetch-based API client** at `src/api/charityClient.js` instead of third-party libraries like Axios:

```javascript
// Example usage in components:
const response = await charityClient.entities.Member.list();
const member = await charityClient.entities.Member.get(id);
await charityClient.entities.Member.create(data);
```

**Features:**
- ✅ Automatic token injection from localStorage
- ✅ Request timeout handling
- ✅ Entity proxy pattern (e.g., `.entities.Member.list()`)
- ✅ Error handling and logging

### Auth Context & Constants

- **Auth Storage Key:** `auth_token` (centralized in `src/lib/utils.js`)
- **Dev Mode:** Auto-injects mock token on app startup for easier testing
- See `src/lib/AuthContext.jsx` for auth state management logic

### Component Architecture

- **UI Components** (`src/components/ui/`) — Radix UI wrappers with Tailwind styling
- **Feature Components** — Organized by domain (campaigns, challans, members, etc.)
- **Page Components** — Connected to routing and state management
- **Hooks** — Custom React hooks in `src/hooks/`

---

## Contributing

1. Create a branch: `git checkout -b feature/your-feature`
2. Make changes and test locally: `npm run dev`
3. Lint and format: `npm run lint:fix`
4. Commit with clear messages
5. Push and create a pull request

---

## Support & Contact

For questions or issues:
- Review the **Troubleshooting** section above
- Check browser console for errors (F12 → Console tab)
- Inspect network requests (F12 → Network tab) to debug API calls
- Contact: [Your team/email]

---

## License

[Add your license information here]

---

**Happy coding! 🚀 CharityConnect is ready to use locally.**
