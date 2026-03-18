/**
 * Lightweight backend health check used by BackendHealthBanner.
 * Returns true if /health responds 200 within 5 seconds.
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_CHARITY_APP_BASE_URL || ''}/health`,
      { signal: AbortSignal.timeout(5000) }
    );
    return res.ok;
  } catch {
    return false;
  }
}
