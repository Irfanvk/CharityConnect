import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { charityClient } from '@/api/charityClient';
import { appParams } from '@/lib/app-params';
import { AUTH_TOKEN_KEY, SESSION_EXPIRED_TOAST_KEY } from '@/config/constants';
import { APP_PATHS } from '@/config/appPaths';
import { API_PATHS } from '@/config/apiPaths';

/**
 * Lightweight fetch-based client used for app public settings checks.
 * @param {{ baseURL?: string, headers?: Record<string, string>, token?: string | null }} [options]
 */
const createFetchClient = ({ baseURL = '', headers = {}, token } = {}) => ({
  get: async (path) => {
    const url = `${baseURL.replace(/\/$/, '')}${path}`;
    const res = await fetch(url, {
      headers: { ...headers, Authorization: token ? `Bearer ${token}` : undefined },
    });
    if (!res.ok) throw { status: res.status, data: await res.json?.().catch(() => null), message: res.statusText };
    return await res.json().catch(() => null);
  },
});

const AuthContext = createContext(null);
const HEALTH_CHECK_TIMEOUT = 5000;

const getStoredAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const AuthProvider = ({ children }) => {
  // ✅ FIX 1: Store raw user data in a ref-stable way.
  // Previously `setUser` was called with spread objects `{ ...prev, ...next }`,
  // which always created a NEW object reference even when the data was identical.
  // This caused every consumer of `useAuth().user` to re-render on every auth check.
  const [userData, setUserData] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  // ✅ FIX 2: Memoize the user object so downstream components only re-render
  // when actual user fields change, not on every AuthProvider render.
  const user = useMemo(() => userData, [
    userData?.id,
    userData?.email,
    userData?.role,
    userData?.is_superadmin,
    userData?.full_name,
    userData?.username,
    userData?.phone,
  ]);

  // ✅ FIX 3: Stable setter that avoids unnecessary state updates when data
  // hasn't meaningfully changed (prevents cascading re-renders).
  const setUser = useCallback((nextUser) => {
    setUserData((prev) => {
      if (!nextUser) return null;
      // Skip update if key identity fields haven't changed
      if (
        prev?.id === nextUser?.id &&
        prev?.role === nextUser?.role &&
        prev?.is_superadmin === nextUser?.is_superadmin &&
        prev?.email === nextUser?.email &&
        prev?.full_name === nextUser?.full_name
      ) {
        return prev; // Return same reference — no re-render triggered
      }
      return nextUser;
    });
  }, []);

  useEffect(() => {
    checkAppState();
  }, []); // ✅ Runs once on mount only

  // Listen for 401 auth expiry dispatched by charityClient
  useEffect(() => {
    const handleAuthExpired = () => {
      setUserData(null);
      setIsAuthenticated(false);
      sessionStorage.setItem(SESSION_EXPIRED_TOAST_KEY, '1');
      const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.href = `${APP_PATHS.LOGIN}?returnTo=${encodeURIComponent(returnTo)}`;
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []); // ✅ Empty deps — handler is stable, no need to re-register

  const checkBackendReachability = async () => {
    const baseUrl = (appParams.appBaseUrl || '').replace(/\/$/, '');
    if (!baseUrl) return true;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    try {
      const response = await fetch(`${baseUrl}${API_PATHS.health}`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      clearTimeout(timeoutId);
      return false;
    }
  };

  // ✅ FIX 4: Wrapped in useCallback so it has a stable reference if passed
  // as a prop or used in other effects.
  const checkAppState = useCallback(async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      const authToken = appParams.token || getStoredAuthToken();
      const hasAppId = Boolean(appParams.appId);

      const isBackendReachable = await checkBackendReachability();
      if (!isBackendReachable) {
        console.warn(`Backend is unreachable at ${appParams.appBaseUrl || 'configured URL'}.`);
        setAuthError({
          type: 'backend_unreachable',
          message: 'Backend is unreachable. Please ensure the API server is running.',
        });
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
        return;
      }

      if (hasAppId) {
        const appClient = createFetchClient({
          baseURL: `${(appParams.appBaseUrl || '').replace(/\/$/, '')}${API_PATHS.appPublic.base}`,
          headers: { 'X-App-Id': appParams.appId },
          token: authToken,
        });

        try {
          const publicSettings = await appClient.get(
            API_PATHS.appPublic.publicSettingsById(appParams.appId)
          );
          setAppPublicSettings(publicSettings);
        } catch (appError) {
          console.error('App state check failed:', appError);

          if (appError.status === 403 && appError.data?.extra_data?.reason) {
            const reason = appError.data.extra_data.reason;
            setAuthError({
              type: reason === 'auth_required' ? 'auth_required'
                : reason === 'user_not_registered' ? 'user_not_registered'
                : reason,
              message: reason === 'auth_required' ? 'Authentication required'
                : reason === 'user_not_registered' ? 'User not registered for this app'
                : appError.message,
            });
          } else {
            setAuthError({
              type: 'unknown',
              message: appError.message || 'Failed to load app',
            });
          }
          setIsLoadingPublicSettings(false);
          setIsLoadingAuth(false);
          return;
        }
      }

      if (authToken) {
        await checkUserAuth();
      } else {
        setUserData(null);
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
      }
      setIsLoadingPublicSettings(false);
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred',
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  }, []); // ✅ No deps needed — reads from appParams which are module-level constants

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await charityClient.auth.me();
      if (!currentUser) {
        setUserData(null);
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
        setIsLoadingAuth(false);
        return;
      }
      // ✅ FIX 5: Use stable setter — won't trigger re-render if user hasn't changed.
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
      setIsLoadingAuth(false);
    } catch (error) {
      if (!error?.status) {
        console.warn('User auth check failed because backend is unreachable.');
      } else {
        console.error('User auth check failed:', error);
      }
      setIsLoadingAuth(false);
      setIsAuthenticated(false);

      if (error.status === 401 || error.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    }
  };

  const setAuthenticatedUser = useCallback((authenticatedUser) => {
    setUser(authenticatedUser || null);
    setIsAuthenticated(Boolean(authenticatedUser));
    setAuthError(null);
    setIsLoadingAuth(false);
    setIsLoadingPublicSettings(false);
  }, [setUser]);

  const logout = useCallback((shouldRedirect = true) => {
    setUserData(null);
    setIsAuthenticated(false);
    charityClient.auth.logout();
  }, []);

  const navigateToLogin = useCallback((returnTo = null) => {
    if (returnTo) {
      window.location.href = `${APP_PATHS.LOGIN}?returnTo=${encodeURIComponent(returnTo)}`;
      return;
    }
    charityClient.auth.redirectToLogin();
  }, []);

  // ✅ FIX 6: Memoize the context value so consumers don't re-render when
  // unrelated state (e.g. isLoadingPublicSettings) changes.
  const contextValue = useMemo(() => ({
    user,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    appPublicSettings,
    setAuthenticatedUser,
    logout,
    navigateToLogin,
    checkAppState,
  }), [
    user,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    appPublicSettings,
    setAuthenticatedUser,
    logout,
    navigateToLogin,
    checkAppState,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};