import { AUTH_TOKEN_KEY } from '@/config/constants';
import { APP_PATHS } from '@/config/appPaths';
import { API_PATHS } from '@/config/apiPaths';

const BASE_URL = import.meta.env.VITE_CHARITY_APP_BASE_URL || '';
const DEFAULT_TIMEOUT = 15000; // 15 seconds

function normalizeSortQuery(query = {}) {
  if (!query || typeof query !== 'object') return query;

  const normalized = { ...query };
  if (typeof normalized.order === 'string' && !normalized.sort_by) {
    const order = normalized.order;
    const isDesc = order.startsWith('-');
    const field = order.replace(/^-/, '');
    normalized.sort_by = field.endsWith('_date') ? field.replace(/_date$/, '_at') : field;
    normalized.sort_order = isDesc ? 'desc' : 'asc';
    delete normalized.order;
  }
  return normalized;
}

function buildUrl(path, query = {}) {
  const base = BASE_URL.replace(/\/$/, '');
  const url = new URL(`${base}${path}`, window.location.origin);

  Object.entries(normalizeSortQuery(query) || {}).forEach(([key, value]) => {
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

function parseErrorMessage(data, fallback = 'Unexpected error occurred') {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail;
  if (Array.isArray(data?.detail) && data.detail.length > 0) {
    const messages = data.detail
      .map((item) => item?.msg || item?.message || item?.detail)
      .filter(Boolean);
    if (messages.length > 0) return messages.join(', ');
  }
  return fallback;
}

function withDateAliases(entity = {}) {
  if (!entity || typeof entity !== 'object') return entity;
  const item = entity;
  return {
    ...item,
    created_date: item?.['created_date'] || item?.['created_at'] || null,
    updated_date: item?.['updated_date'] || item?.['updated_at'] || null,
  };
}

function normalizeMember(member) {
  const normalized = withDateAliases(member || {});
  const memberCode = normalized.member_code || normalized.member_id || null;
  return {
    ...normalized,
    member_code: memberCode,
    member_id: normalized.member_id || memberCode,
  };
}

function normalizeCampaign(campaign) {
  const normalized = withDateAliases(campaign || {});
  const isActive = typeof normalized.is_active === 'boolean'
    ? normalized.is_active
    : normalized.status === 'active';
  return {
    ...normalized,
    is_active: isActive,
    status: normalized.status || (isActive ? 'active' : 'completed'),
  };
}

function normalizeChallan(challan) {
  const normalized = withDateAliases(challan || {});
  const backendType = normalized.type;
  return {
    ...normalized,
    type: backendType === 'campaign' ? 'donation' : backendType,
    backend_type: backendType,
    proof_url: normalized.proof_url || normalized.proof_path || null,
    proof_path: normalized.proof_path || normalized.proof_url || null,
  };
}

function normalizeNotification(notification) {
  const normalized = withDateAliases(notification || {});
  return {
    ...normalized,
    target_type: normalized.target_type || 'all',
    read_by: Array.isArray(normalized.read_by) ? normalized.read_by : [],
    is_read: Boolean(normalized.is_read),
  };
}

function normalizeInvite(invite) {
  return withDateAliases(invite || {});
}

function normalizeAuditLog(log) {
  return withDateAliases(log || {});
}

function normalizeUser(user) {
  return withDateAliases(user || {});
}

function normalizeBulkOperation(item) {
  const normalized = withDateAliases(item || {});
  return {
    ...normalized,
    proof_url: normalized.proof_url || normalized.proof_path || null,
  };
}

async function apiFetch(path, options = {}, query = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  const token = getAuthToken();

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  if (headers['Content-Type'] === undefined || headers['Content-Type'] === null) {
    delete headers['Content-Type'];
  }

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
        message: parseErrorMessage(data, response.statusText),
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
      message: error.message || parseErrorMessage(error?.data, 'Unexpected error occurred'),
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
      return extractArray(data).map(normalizeMember);
    },
    
    me: async () => normalizeMember(await apiFetch(API_PATHS.members.me, { method: 'GET' })),
    
    get: async (id) => normalizeMember(await apiFetch(API_PATHS.members.byId(id), { method: 'GET' })),
    
    getByCode: async (code) => normalizeMember(await apiFetch(API_PATHS.members.byCode(code), { method: 'GET' })),
    
    create: async (data) =>
      normalizeMember(await apiFetch(API_PATHS.members.list, {
        method: 'POST',
        body: JSON.stringify(data),
      })),
    
    update: async (id, data) =>
      normalizeMember(await apiFetch(API_PATHS.members.byId(id), {
        method: 'PUT',
        body: JSON.stringify(data),
      })),
    
    delete: (id) =>
      apiFetch(API_PATHS.members.byId(id), { method: 'DELETE' }),
  },

  challans: {
    list: async (query = {}) => {
      const data = await apiFetch(API_PATHS.challans.list, { method: 'GET' }, query);
      return extractArray(data).map(normalizeChallan);
    },
    
    get: async (id) => normalizeChallan(await apiFetch(API_PATHS.challans.byId(id), { method: 'GET' })),
    
    getByMember: async (memberId) => {
      const data = await apiFetch(API_PATHS.challans.byMember(memberId), { method: 'GET' });
      return extractArray(data).map(normalizeChallan);
    },
    
    create: async (data) =>
      normalizeChallan(await apiFetch(API_PATHS.challans.list, {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          type: data?.type === 'donation' ? 'campaign' : data?.type,
        }),
      })),
    
    update: async (id, data) => {
      try {
        return normalizeChallan(await apiFetch(API_PATHS.challans.byId(id), {
          method: 'PUT',
          body: JSON.stringify(data),
        }));
      } catch (error) {
        if (error?.status === 404 || error?.status === 405) {
          return normalizeChallan(await apiFetch(API_PATHS.challans.byId(id), {
            method: 'PATCH',
            body: JSON.stringify(data),
          }));
        }
        throw error;
      }
    },
    
    uploadProof: async (id, file) => {
      const formData = new FormData();
      formData.append('file', file);
      
      return normalizeChallan(await apiFetch(API_PATHS.challans.uploadProof(id), {
        method: 'POST',
        headers: {}, // Let browser set Content-Type for FormData
        body: formData,
      }));
    },
    
    approve: async (id, payload = {}) => {
      const requestBody = {
        ...payload,
      };
      try {
        return normalizeChallan(await apiFetch(API_PATHS.challans.approve(id), {
          method: 'PATCH',
          body: JSON.stringify(requestBody),
        }));
      } catch (error) {
        if (error?.status === 404 || error?.status === 405) {
          return normalizeChallan(await apiFetch(API_PATHS.challans.approve(id), {
            method: 'POST',
            body: JSON.stringify(requestBody),
          }));
        }
        throw error;
      }
    },
    
    reject: async (id, reasonOrPayload) => {
      const requestBody = typeof reasonOrPayload === 'string'
        ? { rejection_reason: reasonOrPayload }
        : {
            ...(reasonOrPayload || {}),
            rejection_reason:
              reasonOrPayload?.rejection_reason ||
              reasonOrPayload?.reason ||
              '',
          };
      try {
        return normalizeChallan(await apiFetch(API_PATHS.challans.reject(id), {
          method: 'PATCH',
          body: JSON.stringify(requestBody),
        }));
      } catch (error) {
        if (error?.status === 404 || error?.status === 405) {
          return normalizeChallan(await apiFetch(API_PATHS.challans.reject(id), {
            method: 'POST',
            body: JSON.stringify(requestBody),
          }));
        }
        throw error;
      }
    },

    bulkCreate: async (data) => {
      const payload = {
        ...(data || {}),
        months: Array.isArray(data?.months) ? data.months : [],
      };

      if (payload.member_id === '' || payload.member_id === null) {
        delete payload.member_id;
      }

      const result = await apiFetch(API_PATHS.challans.bulkCreate, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return normalizeBulkOperation(result);
    },
  },

  bulkOperations: {
    listPending: async (query = {}) => {
      const data = await apiFetch(API_PATHS.bulk.pendingReview, { method: 'GET' }, query);
      const operations = data?.bulk_operations || data?.items || data?.data || data || [];
      return {
        pending: data?.pending ?? (Array.isArray(operations) ? operations.length : 0),
        bulk_operations: extractArray(operations).map(normalizeBulkOperation),
      };
    },

    get: async (bulkGroupId) => {
      const data = await apiFetch(API_PATHS.bulk.byGroupId(bulkGroupId), { method: 'GET' });
      return normalizeBulkOperation(data);
    },

    approve: async (bulkGroupId, payload = {}) => {
      const data = await apiFetch(API_PATHS.bulk.approve(bulkGroupId), {
        method: 'PATCH',
        body: JSON.stringify({ approved: true, ...payload }),
      });
      return normalizeBulkOperation(data);
    },

    reject: async (bulkGroupId, payload = {}) => {
      const data = await apiFetch(API_PATHS.bulk.reject(bulkGroupId), {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return normalizeBulkOperation(data);
    },
  },

  campaigns: {
    list: async (query = {}) => {
      const data = await apiFetch(API_PATHS.campaigns.list, { method: 'GET' }, query);
      return extractArray(data).map(normalizeCampaign);
    },
    
    get: async (id) => normalizeCampaign(await apiFetch(API_PATHS.campaigns.byId(id), { method: 'GET' })),
    
    create: async (data) =>
      normalizeCampaign(await apiFetch(API_PATHS.campaigns.list, {
        method: 'POST',
        body: JSON.stringify(data),
      })),
    
    update: async (id, data) => {
      try {
        return normalizeCampaign(await apiFetch(API_PATHS.campaigns.byId(id), {
          method: 'PATCH',
          body: JSON.stringify(data),
        }));
      } catch (error) {
        if (error?.status === 404 || error?.status === 405) {
          return normalizeCampaign(await apiFetch(API_PATHS.campaigns.byId(id), {
            method: 'PUT',
            body: JSON.stringify(data),
          }));
        }
        throw error;
      }
    },
    
    delete: (id) =>
      apiFetch(API_PATHS.campaigns.byId(id), { method: 'DELETE' }),
  },

  notifications: {
    list: async (query = {}) => {
      const data = await apiFetch(API_PATHS.notifications.list, { method: 'GET' }, query);
      return extractArray(data).map(normalizeNotification);
    },
    
    get: async (id) => normalizeNotification(await apiFetch(API_PATHS.notifications.byId(id), { method: 'GET' })),
    
    send: (data) => {
      const payload = {
        ...data,
      };
      if (payload.target_type) {
        if (payload.target_type === 'admins') payload.target_role = 'admin';
        if (payload.target_type === 'all') payload.target_role = 'member';
      }

      delete payload.target_type;
      delete payload.read_by;

      return apiFetch(API_PATHS.notifications.list, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

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
      try {
        const data = await apiFetch(API_PATHS.invites.list, { method: 'GET' }, query);
        return extractArray(data).map(normalizeInvite);
      } catch (error) {
        if (error?.status === 404 || error?.status === 405) {
          const data = await apiFetch(API_PATHS.invites.pending, { method: 'GET' }, query);
          return extractArray(data).map(normalizeInvite);
        }
        throw error;
      }
    },
    
    getPending: async () => {
      const data = await apiFetch(API_PATHS.invites.pending, { method: 'GET' });
      return extractArray(data).map(normalizeInvite);
    },
    
    get: async (id) => normalizeInvite(await apiFetch(API_PATHS.invites.byId(id), { method: 'GET' })),
    
    create: (data) =>
      apiFetch(API_PATHS.invites.list, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    validate: (emailOrPhone, inviteCode) =>
      apiFetch(
        API_PATHS.invites.validate,
        { method: 'POST' },
        { email_or_phone: emailOrPhone, invite_code: inviteCode }
      ),
    
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
      return extractArray(data).map(normalizeAuditLog);
    },
    
    get: async (id) => normalizeAuditLog(await apiFetch(API_PATHS.auditLogs.byId(id), { method: 'GET' })),
    
    create: (data) => {
      const payload = {
        action: data?.action || data?.action_type || 'update',
        entity_type: data?.entity_type || data?.target_type || 'Unknown',
        entity_id: data?.entity_id || data?.target_id,
      };

      if (data?.old_values !== undefined) payload.old_values = data.old_values;
      if (data?.new_values !== undefined) payload.new_values = data.new_values;
      if (data?.details !== undefined) {
        payload.new_values = typeof data.details === 'string' ? data.details : JSON.stringify(data.details);
      }
      if (data?.ip_address) payload.ip_address = data.ip_address;
      if (data?.user_id !== undefined) payload.user_id = data.user_id;

      return apiFetch(API_PATHS.auditLogs.list, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  },

  // Users for settings (admin management)
  users: {
    list: async (query = {}) => {
      const data = await apiFetch(API_PATHS.users.list, { method: 'GET' }, query);
      return extractArray(data).map(normalizeUser);
    },
    
    get: async (id) => normalizeUser(await apiFetch(API_PATHS.users.byId(id), { method: 'GET' })),
    
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
