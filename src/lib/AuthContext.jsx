import React, { createContext, useState, useContext, useEffect } from 'react';
import { charityClient } from '@/api/charityClient';
import { appParams } from '@/lib/app-params';
import { AUTH_TOKEN_KEY } from '@/config/constants';

/**
 * @param {{ baseURL?: string, headers?: Record<string, string>, token?: string | null }} [options]
 */
// lightweight fetch-based client used for app public settings checks
const createFetchClient = ({ baseURL = '', headers = {}, token } = {}) => ({
  get: async (path) => {
    const url = `${baseURL.replace(/\/$/, '')}${path}`;
    const res = await fetch(url, { headers: { ...headers, Authorization: token ? `Bearer ${token}` : undefined } });
    if (!res.ok) throw { status: res.status, data: await res.json?.().catch(() => null), message: res.statusText };
    return await res.json().catch(() => null);
  }
});

const AuthContext = createContext(null);
const APP_PUBLIC_BASE_PATH = '/api/apps/public';
const HEALTH_CHECK_PATH = '/health';
const HEALTH_CHECK_TIMEOUT = 5000;

const getStoredAuthToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkBackendReachability = async () => {
    const baseUrl = (appParams.appBaseUrl || '').replace(/\/$/, '');
    if (!baseUrl) {
      return true;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    try {
      const response = await fetch(`${baseUrl}${HEALTH_CHECK_PATH}`, {
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

  const checkAppState = async () => {
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
      
      // If app id is configured, check app public settings.
      // Otherwise skip this optional check and proceed with auth state.
      if (hasAppId) {
        const appClient = createFetchClient({
          baseURL: `${(appParams.appBaseUrl || '').replace(/\/$/, '')}${APP_PUBLIC_BASE_PATH}`,
          headers: {
            'X-App-Id': appParams.appId
          },
          token: authToken,
        });

        try {
          const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
          setAppPublicSettings(publicSettings);
        } catch (appError) {
          console.error('App state check failed:', appError);

          if (appError.status === 403 && appError.data?.extra_data?.reason) {
            const reason = appError.data.extra_data.reason;
            if (reason === 'auth_required') {
              setAuthError({
                type: 'auth_required',
                message: 'Authentication required'
              });
            } else if (reason === 'user_not_registered') {
              setAuthError({
                type: 'user_not_registered',
                message: 'User not registered for this app'
              });
            } else {
              setAuthError({
                type: reason,
                message: appError.message
              });
            }
          } else {
            setAuthError({
              type: 'unknown',
              message: appError.message || 'Failed to load app'
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
        setUser(null);
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
      }
      setIsLoadingPublicSettings(false);
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await charityClient.auth.me();
      if (!currentUser) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
        setIsLoadingAuth(false);
        return;
      }
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
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const setAuthenticatedUser = (authenticatedUser) => {
    setUser(authenticatedUser || null);
    setIsAuthenticated(Boolean(authenticatedUser));
    setAuthError(null);
    setIsLoadingAuth(false);
    setIsLoadingPublicSettings(false);
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the client's logout method which may handle token cleanup and redirect
      charityClient.auth.logout();
    } else {
      // Just remove the token without redirect
      charityClient.auth.logout();
    }
  };

  const navigateToLogin = (returnTo = null) => {
    // Use the client's redirectToLogin method
    const loginPath = '/login';
    if (returnTo) {
      window.location.href = `${loginPath}?returnTo=${encodeURIComponent(returnTo)}`;
      return;
    }
    charityClient.auth.redirectToLogin();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      setAuthenticatedUser,
      logout,
      navigateToLogin,
      checkAppState
    }}>
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
