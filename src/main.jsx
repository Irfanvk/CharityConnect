import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Dev-only: inject a mock auth token so `/auth/me` works against the local mock server
if (import.meta.env.DEV) {
  try {
    const AUTH_KEY = 'auth_token';
    const MOCK_TOKEN = 'mock-token-123';
    if (!localStorage.getItem(AUTH_KEY)) {
      localStorage.setItem(AUTH_KEY, MOCK_TOKEN);
      // eslint-disable-next-line no-console
      console.log('Dev: injected mock auth token');
    }
  } catch (e) {
    // ignore (e.g., SSR or restricted env)
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
