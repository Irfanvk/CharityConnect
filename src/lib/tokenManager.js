/**
 * In-memory token storage — avoids XSS risk of localStorage for auth tokens.
 * Token is cleared when the page unloads; users re-authenticate on fresh visits.
 */
let _token = null;

export const tokenManager = {
  get: () => _token,
  set: (token) => { _token = token; },
  clear: () => { _token = null; },
};
