/**
 * App install ("Add to Home Screen") manager.
 *
 * - Captures `beforeinstallprompt` at startup (main.jsx) so the one-tap install
 *   event is never missed by components that mount later.
 * - Detects platform / browser, including in-app browsers (WhatsApp, Instagram,
 *   Facebook...) where installing is impossible until the link is opened in a
 *   real browser.
 * - Auto-show policy: once per sign-in. "Later" hides it until the next login;
 *   refreshing the page does not bring it back.
 */
import { useSyncExternalStore } from 'react';
import { isIOSDevice, isStandalone, safeLocalStorage } from '@/lib/device';

const INSTALLED_KEY = 'pwa_installed';
const LOGIN_ID_KEY = 'install_prompt_login_id';
const DISMISSED_LOGIN_KEY = 'install_prompt_dismissed_login_id';

let deferredPrompt = null;
let dialogOpen = false;
let captureStarted = false;
const listeners = new Set();
let snapshot = null;

function emit() {
  snapshot = null;
  listeners.forEach((fn) => fn());
}

/** Call once, as early as possible (main.jsx), before React renders. */
export function initInstallCapture() {
  if (captureStarted || typeof window === 'undefined') return;
  captureStarted = true;

  if (isStandalone()) safeLocalStorage(INSTALLED_KEY, '1');

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    // Chromium only fires this when the app is NOT installed.
    safeLocalStorage(INSTALLED_KEY, null);
    emit();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    safeLocalStorage(INSTALLED_KEY, '1');
    dialogOpen = false;
    emit();
  });
}

// ── Environment detection ───────────────────────────────────────────────────

function iosVersion(ua) {
  const match = ua.match(/OS (\d+)_(\d+)/);
  return match ? Number(match[1]) + Number(match[2]) / 100 : null;
}

function detectInAppBrowser(ua) {
  const apps = [
    [/WhatsApp/i, 'WhatsApp'],
    [/Instagram/i, 'Instagram'],
    [/FBAN|FBAV|FB_IAB|FBIOS/i, 'Facebook'],
    [/Messenger/i, 'Messenger'],
    [/Telegram/i, 'Telegram'],
    [/Line\//i, 'LINE'],
    [/Snapchat/i, 'Snapchat'],
    [/LinkedInApp/i, 'LinkedIn'],
    [/MicroMessenger/i, 'WeChat'],
    [/GSA\//i, 'Google app'],
  ];
  for (const [pattern, name] of apps) {
    if (pattern.test(ua)) return name;
  }
  // Generic Android WebView (apps embedding a browser).
  if (/Android/i.test(ua) && /; wv\)/.test(ua)) return 'this app';
  return null;
}

export function detectInstallEnvironment() {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent || '';
  const ios = isIOSDevice();
  const android = /Android/i.test(ua);
  const platform = ios ? 'ios' : android ? 'android' : 'desktop';
  const inAppName = detectInAppBrowser(ua);

  let browser = 'other';
  if (inAppName) browser = 'inapp';
  else if (ios) {
    if (/CriOS/i.test(ua)) browser = 'chrome';
    else if (/EdgiOS/i.test(ua)) browser = 'edge';
    else if (/FxiOS/i.test(ua)) browser = 'firefox';
    else if (/Safari/i.test(ua)) browser = 'safari';
  } else if (/SamsungBrowser/i.test(ua)) browser = 'samsung';
  else if (/Edg\//i.test(ua)) browser = 'edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'opera';
  else if (/Firefox/i.test(ua)) browser = 'firefox';
  else if (/Chrome|Chromium/i.test(ua)) browser = 'chrome';
  else if (/Safari/i.test(ua)) browser = 'safari';

  const version = ios ? iosVersion(ua) : null;
  return {
    platform,
    browser,
    inAppName,
    iosVersion: version,
    // Non-Safari iOS browsers can add to home screen only from iOS 16.4.
    iosNeedsSafari: ios && browser !== 'safari' && browser !== 'inapp' && version !== null && version < 16.4,
    // Desktop Firefox cannot install web apps at all.
    installSupported: !(platform === 'desktop' && browser === 'firefox'),
  };
}

function buildSnapshot() {
  const env = detectInstallEnvironment();
  const standalone = typeof window !== 'undefined' && isStandalone();
  return {
    ...env,
    standalone,
    installed: standalone || (safeLocalStorage(INSTALLED_KEY) === '1' && !deferredPrompt),
    canPrompt: Boolean(deferredPrompt),
    dialogOpen,
  };
}

function getSnapshot() {
  if (!snapshot) snapshot = buildSnapshot();
  return snapshot;
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** React hook: current install state. */
export function useInstallState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ── Actions ─────────────────────────────────────────────────────────────────

/** Shows the browser's own install prompt. Returns 'accepted' | 'dismissed' | 'unavailable'. */
export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable';
  const event = deferredPrompt;
  event.prompt();
  let outcome = 'dismissed';
  try {
    ({ outcome } = await event.userChoice);
  } catch {
    // ignore
  }
  // A prompt event can be used only once.
  deferredPrompt = null;
  if (outcome === 'accepted') safeLocalStorage(INSTALLED_KEY, '1');
  emit();
  return outcome;
}

/** User says the app is already installed (iOS never reports installs to the browser). */
export function markInstalled() {
  safeLocalStorage(INSTALLED_KEY, '1');
  dialogOpen = false;
  emit();
}

export function openInstallDialog() {
  dialogOpen = true;
  emit();
}

export function closeInstallDialog() {
  dialogOpen = false;
  emit();
}

// ── Once-per-login auto show ────────────────────────────────────────────────

/** Call after every successful sign-in; starts a new "login" for the auto popup. */
export function markNewLogin() {
  safeLocalStorage(LOGIN_ID_KEY, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
}

function currentLoginId() {
  let id = safeLocalStorage(LOGIN_ID_KEY);
  if (!id) {
    // Sessions that started before this feature existed.
    markNewLogin();
    id = safeLocalStorage(LOGIN_ID_KEY) || 'legacy';
  }
  return id;
}

export function shouldAutoShowInstall(state) {
  if (state.installed || !state.installSupported) return false;
  return safeLocalStorage(DISMISSED_LOGIN_KEY) !== currentLoginId();
}

/** "Later": hide the auto popup until the next sign-in. */
export function dismissInstallForThisLogin() {
  safeLocalStorage(DISMISSED_LOGIN_KEY, currentLoginId());
  closeInstallDialog();
}
