import { AUTH_TOKEN_KEY } from '@/config/constants';

const BASE_URL = import.meta.env.VITE_CHARITY_APP_BASE_URL || '';
const DEFAULT_TIMEOUT = 15000; // 15 seconds

function buildUrl(path, query = {}) {
  const base = BASE_URL.replace(/\/$/, '');
  const url = new URL(`${base}${path}`, window.location.origin);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  return url.toString();
}

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

async function apiFetch(path, options = {}, query = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const finalOptions = {
    ...options,
    headers,
    signal: controller.signal,
  };

  try {
    const response = await fetch(buildUrl(path, query), finalOptions);
    clearTimeout(timeoutId);

    if (response.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      window.location.href = '/login';
      return;
    }

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      throw {
        status: response.status,
        message: data?.message || response.statusText,
        data,
      };
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw {
        status: 408,
        message: 'Request timeout. Please try again.',
      };
    }

    throw {
      status: error.status || 500,
      message: error.message || 'Unexpected error occurred',
      data: error.data || null,
    };
  }
}

function createEntityProxy(entityName) {
  return {
    list: async (query = {}) => {
      const data = await apiFetch(`/entities/${entityName}`, { method: 'GET' }, query);
      if (Array.isArray(data)) return data;
      // If API returns an object with items or data, try to extract array
      if (data && Array.isArray(data.items)) return data.items;
      if (data && Array.isArray(data.data)) return data.data;
      return [];
    },

    get: (id) =>
      apiFetch(`/entities/${entityName}/${id}`, { method: 'GET' }),

    create: (data) =>
      apiFetch(`/entities/${entityName}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id, data) =>
      apiFetch(`/entities/${entityName}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id) =>
      apiFetch(`/entities/${entityName}/${id}`, {
        method: 'DELETE',
      }),
  };
}

const charityClient = {
  auth: {
    me: async () => {
      try {
        return await apiFetch('/auth/me');
      } catch {
        return null;
      }
    },

    login: async (credentials) => {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      if (data?.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      }

      return data;
    },

    logout: async () => {
      try {
        await apiFetch('/auth/logout', { method: 'POST' });
      } catch {}
      localStorage.removeItem(AUTH_TOKEN_KEY);
      window.location.href = '/login';
    },
  },

  entities: new Proxy({}, {
    get: (_target, name) => createEntityProxy(name),
  }),
};

export { charityClient };
