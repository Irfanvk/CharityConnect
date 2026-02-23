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

// Helper for extracting arrays from API responses
function extractArray(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
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

      if (data?.access_token) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
      } else if (data?.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      }

      return data;
    },

    register: async (registrationData) => {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(registrationData),
      });

      if (data?.access_token) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
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

  members: {
    list: async (query = {}) => {
      const data = await apiFetch('/members/', { method: 'GET' }, query);
      return extractArray(data);
    },
    
    me: () => apiFetch('/members/me', { method: 'GET' }),
    
    get: (id) => apiFetch(`/members/${id}`, { method: 'GET' }),
    
    getByCode: (code) => apiFetch(`/members/code/${code}`, { method: 'GET' }),
    
    create: (data) =>
      apiFetch('/members/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id, data) =>
      apiFetch(`/members/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id) =>
      apiFetch(`/members/${id}`, { method: 'DELETE' }),
  },

  challans: {
    list: async (query = {}) => {
      const data = await apiFetch('/challans/', { method: 'GET' }, query);
      return extractArray(data);
    },
    
    get: (id) => apiFetch(`/challans/${id}`, { method: 'GET' }),
    
    getByMember: (memberId) =>
      apiFetch(`/challans/member/${memberId}`, { method: 'GET' }),
    
    create: (data) =>
      apiFetch('/challans/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id, data) =>
      apiFetch(`/challans/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    uploadProof: async (id, file) => {
      const formData = new FormData();
      formData.append('file', file);
      
      return await apiFetch(`/challans/${id}/upload-proof`, {
        method: 'POST',
        headers: {}, // Let browser set Content-Type for FormData
        body: formData,
      });
    },
    
    approve: (id) =>
      apiFetch(`/challans/${id}/approve`, { method: 'POST' }),
    
    reject: (id, reason) =>
      apiFetch(`/challans/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  },

  campaigns: {
    list: async (query = {}) => {
      const data = await apiFetch('/campaigns/', { method: 'GET' }, query);
      return extractArray(data);
    },
    
    get: (id) => apiFetch(`/campaigns/${id}`, { method: 'GET' }),
    
    create: (data) =>
      apiFetch('/campaigns/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id, data) =>
      apiFetch(`/campaigns/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id) =>
      apiFetch(`/campaigns/${id}`, { method: 'DELETE' }),
  },

  notifications: {
    list: async (query = {}) => {
      const data = await apiFetch('/notifications/', { method: 'GET' }, query);
      return extractArray(data);
    },
    
    get: (id) => apiFetch(`/notifications/${id}`, { method: 'GET' }),
    
    send: (data) =>
      apiFetch('/notifications/send', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    markAsRead: (id) =>
      apiFetch(`/notifications/${id}/read`, { method: 'PUT' }),
    
    markAllAsRead: () =>
      apiFetch('/notifications/mark-all-read', { method: 'POST' }),
    
    // Keep subscribe method for compatibility if it exists
    subscribe: (callback) => {
      // SSE or websocket subscription logic if needed
      console.warn('Notification subscription not yet implemented');
      return () => {}; // Return unsubscribe function
    },
  },

  invites: {
    list: async (query = {}) => {
      const data = await apiFetch('/invites/', { method: 'GET' }, query);
      return extractArray(data);
    },
    
    getPending: async () => {
      const data = await apiFetch('/invites/pending', { method: 'GET' });
      return extractArray(data);
    },
    
    get: (id) => apiFetch(`/invites/${id}`, { method: 'GET' }),
    
    create: (data) =>
      apiFetch('/invites/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    validate: (code) =>
      apiFetch('/invites/validate', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
    
    update: (id, data) =>
      apiFetch(`/invites/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id) =>
      apiFetch(`/invites/${id}`, { method: 'DELETE' }),
  },

  files: {
    upload: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      
      return await apiFetch('/files/upload', {
        method: 'POST',
        headers: {}, // Let browser set Content-Type for FormData
        body: formData,
      });
    },
  },

  // Audit logs for admin
  auditLogs: {
    list: async (query = {}) => {
      const data = await apiFetch('/audit-logs/', { method: 'GET' }, query);
      return extractArray(data);
    },
    
    get: (id) => apiFetch(`/audit-logs/${id}`, { method: 'GET' }),
    
    create: (data) =>
      apiFetch('/audit-logs/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Users for settings (admin management)
  users: {
    list: async (query = {}) => {
      const data = await apiFetch('/users/', { method: 'GET' }, query);
      return extractArray(data);
    },
    
    get: (id) => apiFetch(`/users/${id}`, { method: 'GET' }),
    
    update: (id, data) =>
      apiFetch(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // DEPRECATED: Kept for backward compatibility during migration
  // TODO: Remove after all components are updated
  entities: new Proxy({}, {
    get: (_target, name) => {
      console.warn(
        `charityClient.entities.${name} is deprecated. ` +
        `Use charityClient.${name.toLowerCase()} instead.`
      );
      
      // Map old entity names to new resource methods
      const entityMap = {
        Member: 'members',
        Challan: 'challans',  
        Campaign: 'campaigns',
        Notification: 'notifications',
        Invite: 'invites',
        AuditLog: 'auditLogs',
        User: 'users',
        RecurringDonation: null, // Disabled for Phase 1
        Request: null, // Disabled for Phase 1
      };
      
      const resourceName = entityMap[name];
      
      if (resourceName === null) {
        throw new Error(
          `Entity ${name} is not available in Phase 1. ` +
          `It will be implemented in Phase 2.`
        );
      }
      
      if (resourceName && charityClient[resourceName]) {
        return charityClient[resourceName];
      }
      
      throw new Error(`Unknown entity: ${name}`);
    },
  }),
};

export { charityClient };
