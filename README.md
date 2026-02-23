**Welcome to 'CHARITYCONNECT'  project** 

**About**

View and Edit  the app
This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to the repo will also be reflected in the builder dashboard.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables

```
VITE_CHARITY_APP_ID=your_app_id
VITE_CHARITY_APP_BASE_URL=your_backend_url

e.g.
VITE_CHARITY_APP_ID=cbef744a8545c389ef439ea6
VITE_CHARITY_APP_BASE_URL=https://your-app.example.com
```

Run the app: `npm run dev`
 
 **Login Flow**
 
 - **Goal:** User authenticates with an email to obtain a Bearer token used for subsequent API calls.
 - **Prerequisites:** Node/npm installed; frontend running (`npm run dev`); backend URL set (`VITE_CHARITY_APP_BASE_URL`) or run the local mock with `npm run mock` (mock listens on `http://localhost:4000`).
 - **Key endpoints (mock and real):**
	 - `POST /auth/login` — body: `{ "email": "user@example.com" }` → response: `{ token, user }`.
	 - `GET /auth/me` — requires `Authorization: Bearer <token>` → returns current user profile.
	 - `GET /api/apps/public/prod/public-settings/by-id/:id` — public app settings used at startup.
 
 - **Frontend flow (high level):**
	 1. User opens the app at http://localhost:5173 and navigates to the Login page.
	 2. User submits their email; frontend calls the client `auth.login(email)` which POSTs to `/auth/login`.
	 3. On success the client stores the returned token in `localStorage` under the key `AUTH_TOKEN_KEY` and sets the `Authorization` header for future requests.
	 4. Frontend calls `auth.me()` to fetch the user's profile and updates UI state (redirect to dashboard on success).
	 5. Logout clears `AUTH_TOKEN_KEY` from storage and resets client auth state.
 
 - **Token storage & security notes:** Tokens are stored in `localStorage` for this demo (`AUTH_TOKEN_KEY`). For production, consider secure cookies, short-lived tokens, and refresh flows.
 
 - **Quick commands for local testing (PowerShell):**
 
 ```powershell
 # Start mock backend
 npm run mock
 # Start dev server (ensure env points to mock)
 $env:VITE_CHARITY_APP_BASE_URL='http://localhost:4000'; npm run dev
 # Or run smoke test against mock
 $env:VITE_CHARITY_APP_BASE_URL='http://localhost:4000'; node scripts/smoke.js
 ```
 
 - **Quick curl example to get a token (when mock running):**
 
 ```bash
 curl -s -X POST http://localhost:4000/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com"}' | jq
 ```
 
 - **For Mr. Simsar:** to test the app end-to-end, run the mock server, open http://localhost:5173 in the browser, use the Login page (enter `admin@example.com`) and inspect localStorage for the `AUTH_TOKEN_KEY` value; you can use the curl command above to validate the mock auth response.
