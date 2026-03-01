import { AUTH_TOKEN_KEY } from '@/config/constants';
import { APP_PATHS } from '@/config/appPaths';
import { API_PATHS } from '@/config/apiPaths';

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

function extractAuthToken(data) {
  return (
    data?.access_token ||
    data?.accessToken ||
    data?.token ||
    data?.data?.access_token ||
    data?.data?.accessToken ||
    data?.data?.token ||
    null
  );
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
      throw {
        status: 401,
        message: 'Unauthorized',
        data: null,
      };
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
        return await apiFetch(API_PATHS.auth.me);
      } catch {
        return null;
      }
    },

    login: async (credentials) => {
      const data = await apiFetch(API_PATHS.auth.login, {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      const token = extractAuthToken(data);
      if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
      }

      return data;
    },

    register: async (registrationData) => {
      const data = await apiFetch(API_PATHS.auth.register, {
        method: 'POST',
        body: JSON.stringify(registrationData),
      });

      const token = extractAuthToken(data);
      if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
      }

      return data;
    },

    logout: async () => {
      try {
        await apiFetch(API_PATHS.auth.logout, { method: 'POST' });
      } catch {}
      localStorage.removeItem(AUTH_TOKEN_KEY);
      window.location.href = APP_PATHS.LOGIN;
    },

    redirectToLogin: () => {
      window.location.href = APP_PATHS.LOGIN;
    },
  },

  members: {
    list: async (query = {}) => {
      const data = await apiFetch(API_PATHS.members.list, { method: 'GET' }, query);
      return extractArray(data);
    },
    
    me: () => apiFetch(API_PATHS.members.me, { method: 'GET' }),
    
    get: (id) => apiFetch(API_PATHS.members.byId(id), { method: 'GET' }),
    
    getByCode: (code) => apiFetch(API_PATHS.members.byCode(code), { method: 'GET' }),
    
    create: (data) =>
      apiFetch(API_PATHS.members.list, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id, data) =>
      apiFetch(API_PATHS.members.byId(id), {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id) =>
      apiFetch(API_PATHS.members.byId(id), { method: 'DELETE' }),
  },

  challans: {
    list: async (query = {}) => {
      const data = await apiFetch(API_PATHS.challans.list, { method: 'GET' }, query);
      return extractArray(data);
    },
    
    get: (id) => apiFetch(API_PATHS.challans.byId(id), { method: 'GET' }),
    
    getByMember: (memberId) =>
      apiFetch(API_PATHS.challans.byMember(memberId), { method: 'GET' }),
    
    create: (data) =>
      apiFetch(API_PATHS.challans.list, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id, data) =>
      apiFetch(API_PATHS.challans.byId(id), {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    uploadProof: async (id, file) => {
      const formData = new FormData();
      formData.append('file', file);
      
      return await apiFetch(API_PATHS.challans.uploadProof(id), {
        method: 'POST',
        headers: {}, // Let browser set Content-Type for FormData
        body: formData,
      });
    },
    
    approve: (id) =>
      apiFetch(API_PATHS.challans.approve(id), { method: 'POST' }),
    
    reject: (id, reason) =>
      apiFetch(API_PATHS.challans.reject(id), {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  },

  campaigns: {
    list: async (query = {}) => {
      const data = await apiFetch(API_PATHS.campaigns.list, { method: 'GET' }, query);
      return extractArray(data);
    },
    
    get: (id) => apiFetch(API_PATHS.campaigns.byId(id), { method: 'GET' }),
    
    create: (data) =>
      apiFetch(API_PATHS.campaigns.list, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id, data) =>
      apiFetch(API_PATHS.campaigns.byId(id), {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id) =>
      apiFetch(API_PATHS.campaigns.byId(id), { method: 'DELETE' }),
  },

  notifications: {
    list: async (query = {}) => {
      const data = await apiFetch(API_PATHS.notifications.list, { method: 'GET' }, query);
      return extractArray(data);
    },
    
    get: (id) => apiFetch(API_PATHS.notifications.byId(id), { method: 'GET' }),
    
    send: (data) =>
      apiFetch(API_PATHS.notifications.send, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    create: (data) =>
      apiFetch(API_PATHS.notifications.list, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id, data) =>
      apiFetch(API_PATHS.notifications.byId(id), {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id) =>
      apiFetch(API_PATHS.notifications.byId(id), { method: 'DELETE' }),
    
    markAsRead: (id) =>
      apiFetch(API_PATHS.notifications.read(id), { method: 'PUT' }),
    
    markAllAsRead: () =>
      apiFetch(API_PATHS.notifications.markAllRead, { method: 'POST' }),
    
    // Keep subscribe method for compatibility if it exists
    subscribe: (callback) => {
      // SSE or websocket subscription logic if needed
      void callback;
      return () => {}; // Return unsubscribe function
    },
  },

  invites: {
    list: async (query = {}) => {
      const data = await apiFetch(API_PATHS.invites.list, { method: 'GET' }, query);
      return extractArray(data);
    },
    
    getPending: async () => {
      const data = await apiFetch(API_PATHS.invites.pending, { method: 'GET' });
      return extractArray(data);
    },
    
    get: (id) => apiFetch(API_PATHS.invites.byId(id), { method: 'GET' }),
    
    create: (data) =>
      apiFetch(API_PATHS.invites.list, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    validate: (code) =>
      apiFetch(API_PATHS.invites.validate, {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
    
    update: (id, data) =>
      apiFetch(API_PATHS.invites.byId(id), {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id) =>
      apiFetch(API_PATHS.invites.byId(id), { method: 'DELETE' }),
  },

  files: {
    upload: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      
      return await apiFetch(API_PATHS.files.upload, {
        method: 'POST',
        headers: {}, // Let browser set Content-Type for FormData
        body: formData,
      });
    },
  },

  // Audit logs for admin
  auditLogs: {
    list: async (query = {}) => {
      const data = await apiFetch(API_PATHS.auditLogs.list, { method: 'GET' }, query);
      return extractArray(data);
    },
    
    get: (id) => apiFetch(API_PATHS.auditLogs.byId(id), { method: 'GET' }),
    
    create: (data) =>
      apiFetch(API_PATHS.auditLogs.list, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Users for settings (admin management)
  users: {
    list: async (query = {}) => {
      const data = await apiFetch(API_PATHS.users.list, { method: 'GET' }, query);
      return extractArray(data);
    },
    
    get: (id) => apiFetch(API_PATHS.users.byId(id), { method: 'GET' }),
    
    update: (id, data) =>
      apiFetch(API_PATHS.users.byId(id), {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // DEPRECATED: Kept for backward compatibility during migration
  // TODO: Remove after all components are updated
  entities: new Proxy({}, {
    get: (_target, name) => {
      const entityName = String(name);

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

      const resourceName = entityMap[entityName];

      console.warn(
        `charityClient.entities.${entityName} is deprecated. ` +
        `Use charityClient.${resourceName || entityName.toLowerCase()} instead.`
      );
      
      if (resourceName === null) {
        throw new Error(
          `Entity ${entityName} is not available in Phase 1. ` +
          `It will be implemented in Phase 2.`
        );
      }
      
      if (resourceName && charityClient[resourceName]) {
        return charityClient[resourceName];
      }
      
      throw new Error(`Unknown entity: ${entityName}`);
    },
  }),
};

export { charityClient };
