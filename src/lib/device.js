/**
 * Shared device detection and safe storage utilities.
 * Used by main.jsx, PWAUpdatePrompt, IOSInstallPrompt, AndroidInstallPrompt.
 */

export function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
  // iPadOS 13+ reports as MacIntel with touch
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
  return false;
}

export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/**
 * Safe localStorage wrapper — silent in Safari Private mode (SecurityError).
 * @param {string} key
 * @param {string|null|undefined} value
 *   undefined → get, null → remove, string → set
 * @returns {string|null}
 */
export function safeLocalStorage(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) { localStorage.removeItem(key); return null; }
    localStorage.setItem(key, value);
    return null;
  } catch {
    return null;
  }
}
