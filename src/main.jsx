import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import { APP_BRAND } from '@/config/appPaths'
import '@/index.css'
import { registerSW } from 'virtual:pwa-register'
import { isIOSDevice } from '@/lib/device'

const IOS_SW_RESET_KEY = 'ios_sw_reset_v2';

function showBootstrapError(message) {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;color:#0f172a;">
      <div style="max-width:560px;background:white;border:1px solid #e2e8f0;border-radius:12px;padding:20px;box-shadow:0 10px 30px rgba(15,23,42,0.08)">
        <h2 style="margin:0 0 12px;font-size:20px;">Unable to open app</h2>
        <p style="margin:0 0 10px;color:#334155;">${message}</p>
        <p style="margin:0 0 16px;color:#475569;font-size:14px;">Please refresh the page. If this is iPhone Safari, close all tabs and reopen once.</p>
        <button onclick="window.location.reload()" style="background:#059669;color:white;border:0;border-radius:8px;padding:10px 14px;font-weight:600;cursor:pointer;">Reload</button>
      </div>
    </div>
  `;
}

async function cleanupIOSServiceWorkers() {
  if (!isIOSDevice()) return;
  if (!('serviceWorker' in navigator)) return;
  if (localStorage.getItem(IOS_SW_RESET_KEY) === '1') return;

  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));

    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }

    localStorage.setItem(IOS_SW_RESET_KEY, '1');
    if (regs.length > 0) {
      window.location.reload();
    }
  } catch {
    // Keep app booting even if cleanup fails.
  }
}

function registerServiceWorker() {
  // iOS browsers are more prone to stale-cache blank screens in installed/PWA mode.
  // Skip registration on iOS entirely; the iOS cleanup above handles stale SWs.
  if (isIOSDevice()) {
    return;
  }

  const updateSW = registerSW({
    immediate: true,
  });

  window.addEventListener('online', () => {
    updateSW(true);
  });
}

document.title = APP_BRAND.TITLE;

window.addEventListener('error', () => {
  showBootstrapError('A startup error occurred while loading resources.');
});

window.addEventListener('unhandledrejection', () => {
  showBootstrapError('The app encountered an unexpected startup issue.');
});

cleanupIOSServiceWorkers()
  .finally(() => {
    registerServiceWorker();

    try {
      ReactDOM.createRoot(document.getElementById('root')).render(
        <App />
      );
    } catch {
      showBootstrapError('The app failed to initialize.');
    }
  });
