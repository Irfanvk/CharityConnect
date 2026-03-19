import axios from 'axios';
import { AUTH_TOKEN_KEY, SESSION_EXPIRED_TOAST_KEY } from '@/config/constants';
import { APP_PATHS } from '@/config/appPaths';
import { tokenManager } from '@/lib/tokenManager';

function resolveApiBaseUrl() {
  const configuredBaseUrl = String(import.meta.env.VITE_CHARITY_APP_BASE_URL || '').trim();
  if (!configuredBaseUrl) {
    return '/api';
  }
  return configuredBaseUrl.replace(/\/$/, '');
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = tokenManager.get() || localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401 && typeof window !== 'undefined') {
      tokenManager.clear();
      localStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.setItem(SESSION_EXPIRED_TOAST_KEY, '1');

      if (window.location.pathname !== APP_PATHS.LOGIN) {
        window.dispatchEvent(new Event('auth:expired'));
      }
    }

    const normalizedError = {
      status: status || 500,
      message:
        error?.response?.data?.detail?.[0]?.msg ||
        error?.response?.data?.message ||
        error?.message ||
        'Unexpected API error',
      data: error?.response?.data || null,
    };

    return Promise.reject(normalizedError);
  }
);
