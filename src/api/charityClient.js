import { AUTH_TOKEN_KEY, SESSION_EXPIRED_TOAST_KEY } from '@/config/constants';
import { APP_PATHS } from '@/config/appPaths';
import { API_PATHS } from '@/config/apiPaths';
import { tokenManager } from '@/lib/tokenManager';

function resolveApiBaseUrl() {
  const configuredBaseUrl = String(import.meta.env.VITE_CHARITY_APP_BASE_URL || '').trim();
  if (!configuredBaseUrl) {
    return '/api';
  }
  return configuredBaseUrl.replace(/\/$/, '');
}

const BASE_URL = resolveApiBaseUrl();
const DEFAULT_TIMEOUT = 20000; // 20 seconds
const IMPORT_TIMEOUT = 300000; // 5 minutes for large import files
const IMPORT_JOB_POLL_INTERVAL = 1200;
const IMPORT_JOB_TIMEOUT = 30 * 60 * 1000;

function shouldSkipUnauthorizedRedirect(path = '') {
  const normalizedPath = String(path || '').split('?')[0];
  return normalizedPath === API_PATHS.auth.login || normalizedPath === API_PATHS.auth.register;
}

function handleUnauthorized(path = '') {
  if (typeof window === 'undefined') {
    return;
  }

  tokenManager.clear();
  localStorage.removeItem(AUTH_TOKEN_KEY);

  if (shouldSkipUnauthorizedRedirect(path)) {
    return;
  }

  if (window.location.pathname === APP_PATHS.LOGIN) {
    return;
  }

  // Dispatch event so AuthContext can handle it gracefully without a hard reload.
  window.dispatchEvent(new Event('auth:expired'));
}

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
  const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${String(path || '')}`;
  const isAbsoluteBase = /^https?:\/\//i.test(BASE_URL);
  const url = isAbsoluteBase
    ? new URL(`${BASE_URL}${normalizedPath}`)
    : new URL(`${BASE_URL.startsWith('/') ? BASE_URL : `/${BASE_URL}`}${normalizedPath}`, window.location.origin);

  Object.entries(normalizeSortQuery(query) || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (typeof value === 'string') {
      const normalized = value.trim();
      // Skip empty placeholders often produced by optional filter controls.
      if (!normalized || normalized === 'undefined' || normalized === 'null') return;
      url.searchParams.append(key, normalized);
      return;
    }

    url.searchParams.append(key, value);
  });

  return url.toString();
}

function getAuthToken() {
  // Prefer in-memory token; fall back to localStorage for page-reload persistence.
  return tokenManager.get() || localStorage.getItem(AUTH_TOKEN_KEY);
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
  if (typeof data?.msg === 'string' && data.msg.trim()) return data.msg;
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail;
  if (typeof data?.detail === 'object' && data.detail !== null && typeof data.detail.msg === 'string') return data.detail.msg;
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
  const rawStatus =
    normalized.status ??
    (typeof normalized.is_active === 'boolean'
      ? (normalized.is_active ? 'active' : 'inactive')
      : 'active');
  const status = String(rawStatus || 'active').toLowerCase();

  return {
    ...normalized,
    member_code: memberCode,
    member_id: normalized.member_id || memberCode,
    status,
  };
}

function normalizeCampaign(campaign) {
  const normalized = withDateAliases(campaign || {});
  const isActive = typeof normalized.is_active === 'boolean'
    ? normalized.is_active
    : normalized.status === 'active';
  const targetMode =
    normalized.target_mode ||
    normalized.goal_type ||
    (normalized.target_amount === null || normalized.target_amount === undefined ? 'unlimited' : 'targeted');
  const endDateMode =
    normalized.end_date_mode ||
    normalized.timeline_type ||
    (normalized.end_date ? 'fixed' : 'open');

  return {
    ...normalized,
    is_active: isActive,
    status: normalized.status || (isActive ? 'active' : 'completed'),
    target_mode: targetMode,
    end_date_mode: endDateMode,
    min_amount: normalizeAmount(normalized.min_amount ?? normalized.minimum_amount ?? 100),
    target_amount: targetMode === 'unlimited' ? null : normalizeAmount(normalized.target_amount),
    end_date: endDateMode === 'open' ? null : (normalized.end_date || null),
  };
}

function normalizeAmount(amount) {
  if (typeof amount === 'number') return amount;
  if (typeof amount === 'string') return Number(amount) || 0;
  if (amount && typeof amount === 'object') {
    return Number(amount.parsedValue ?? amount.value ?? amount.source) || 0;
  }
  return 0;
}

function normalizeChallan(challan) {
  const normalized = withDateAliases(challan || {});
  const backendType = normalized.type;
  return {
    ...normalized,
    type: backendType === 'campaign' ? 'donation' : backendType,
    backend_type: backendType,
    amount: normalizeAmount(normalized.amount),
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
  const normalized = withDateAliases(log || {});

  let parsedDetails = {};
  let parsedPreviousDetails = {};
  if (typeof normalized.old_values === 'string' && normalized.old_values.trim()) {
    try {
      parsedPreviousDetails = JSON.parse(normalized.old_values);
    } catch {
      parsedPreviousDetails = { raw: normalized.old_values };
    }
  }
  if (typeof normalized.new_values === 'string' && normalized.new_values.trim()) {
    try {
      parsedDetails = JSON.parse(normalized.new_values);
    } catch {
      parsedDetails = { raw: normalized.new_values };
    }
  }

  return {
    ...normalized,
    action_type: normalized.action || normalized.action_type || 'update',
    performed_by: normalized.performed_by || (normalized.user_id ? `User #${normalized.user_id}` : 'System'),
    performed_by_name: normalized.performed_by_name || (normalized.user_id ? `User #${normalized.user_id}` : 'System'),
    performed_by_role: normalized.performed_by_role || null,
    target_name:
      normalized.target_name ||
      (normalized.entity_type && normalized.entity_id !== undefined
        ? `${normalized.entity_type} #${normalized.entity_id}`
        : normalized.entity_type || null),
    details:
      normalized.details && typeof normalized.details === 'object'
        ? normalized.details
        : parsedDetails,
    previous_details: parsedPreviousDetails,
  };
}

function normalizeUser(user) {
  return withDateAliases(user || {});
}

function normalizeRequest(request) {
  return withDateAliases(request || {});
}

function normalizeBulkOperation(item) {
  const normalized = withDateAliases(item || {});
  return {
    ...normalized,
    proof_url: normalized.proof_url || normalized.proof_path || null,
  };
}

async function apiFetch(path, options = {}, query = {}) {
  const rawOptions = options || {};
  const timeoutMs = rawOptions?.timeoutMs;
  const requestOptions = /** @type {any} */ ({ ...rawOptions });
  delete requestOptions.timeoutMs;
  const parsedTimeout = Number(timeoutMs);
  const requestTimeout = Number.isFinite(parsedTimeout) && parsedTimeout > 0
    ? parsedTimeout
    : DEFAULT_TIMEOUT;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

  const token = getAuthToken();

  const method = String(requestOptions.method || 'GET').toUpperCase();
  const hasBody = requestOptions.body !== undefined && requestOptions.body !== null;
  const isFormData = typeof FormData !== 'undefined' && requestOptions.body instanceof FormData;
  const shouldSetJsonContentType = hasBody && !isFormData && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';

  const headers = {
    ...(shouldSetJsonContentType ? { 'Content-Type': 'application/json' } : {}),
    ...(requestOptions.headers || {}),
  };

  if (headers['Content-Type'] === undefined || headers['Content-Type'] === null) {
    delete headers['Content-Type'];
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const finalOptions = {
    ...requestOptions,
    headers,
    signal: controller.signal,
  };

  try {
    const response = await fetch(buildUrl(path, query), finalOptions);
    clearTimeout(timeoutId);

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (response.status === 401) {
      handleUnauthorized(path);
      throw {
        status: 401,
        message: parseErrorMessage(data, 'Unauthorized'),
        data,
      };
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
        message: `Request timeout after ${Math.round(requestTimeout / 1000)} seconds. Please try again.`,
      };
    }

    throw {
      status: error.status || 500,
      message: error.message || parseErrorMessage(error?.data, 'Unexpected error occurred'),
      data: error.data || null,
    };
  }
}

function apiUploadFormData(path, formData, options = {}) {
  const query = options?.query || {};
  const timeoutMs = options?.timeoutMs ?? IMPORT_TIMEOUT;
  const onUploadProgress = options?.onUploadProgress;
  const token = getAuthToken();
  const parsedTimeout = Number(timeoutMs);
  const requestTimeout = Number.isFinite(parsedTimeout) && parsedTimeout > 0
    ? parsedTimeout
    : IMPORT_TIMEOUT;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', buildUrl(path, query), true);
    xhr.timeout = requestTimeout;

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    if (typeof onUploadProgress === 'function' && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.round((event.loaded / event.total) * 100);
        onUploadProgress({
          loaded: event.loaded,
          total: event.total,
          percent: Math.max(0, Math.min(100, percent)),
        });
      };
    }

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) return;

      const status = Number(xhr.status) || 0;
      const text = xhr.responseText || '';
      let data = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }

      if (status === 401) {
        handleUnauthorized(path);
        reject({
          status: 401,
          message: 'Unauthorized',
          data: null,
        });
        return;
      }

      if (status < 200 || status >= 300) {
        reject({
          status: status || 500,
          message: parseErrorMessage(data, xhr.statusText || 'Request failed'),
          data,
        });
        return;
      }

      resolve(data);
    };

    xhr.ontimeout = () => {
      reject({
        status: 408,
        message: `Request timeout after ${Math.round(requestTimeout / 1000)} seconds. Please try again.`,
      });
    };

    xhr.onerror = () => {
      reject({
        status: 500,
        message: 'Network error occurred while uploading. Please try again.',
      });
    };

    xhr.send(formData);
  });
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadAndPollImportJob({
  createPath,
  statusPathBuilder,
  formData,
  query = {},
  onUploadProgress,
  timeoutMs = IMPORT_JOB_TIMEOUT,
}) {
  const created = await apiUploadFormData(createPath, formData, {
    query,
    timeoutMs,
    onUploadProgress,
  });

  const jobId = created?.job_id;
  if (!jobId) {
    throw {
      status: 500,
      message: 'Import job was created without job_id',
      data: created,
    };
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const status = await apiFetch(statusPathBuilder(jobId), { method: 'GET', timeoutMs: DEFAULT_TIMEOUT });

    if (typeof onUploadProgress === 'function') {
      const percent = Number(status?.progress);
      if (Number.isFinite(percent)) {
        onUploadProgress({
          loaded: percent,
          total: 100,
          percent,
          message: status?.message,
          status: status?.status,
        });
      }
    }

    if (status?.status === 'completed') {
      return status?.result || {};
    }

    if (status?.status === 'failed') {
      throw {
        status: 500,
        message: status?.error || status?.message || 'Import failed',
        data: status,
      };
    }

    await wait(IMPORT_JOB_POLL_INTERVAL);
  }

  throw {
    status: 408,
    message: 'Import job timeout. The import may still be running on server.',
  };
}

// Helper for extracting arrays from API responses
function extractArray(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function extractTotal(data, fallback = 0) {
  if (!data || typeof data !== 'object') return fallback;

  const candidates = [
    data.total,
    data.total_count,
    data.count,
    data.pagination?.total,
    data.meta?.total,
  ];

  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return fallback;
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
        tokenManager.set(token);
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
        tokenManager.set(token);
        localStorage.setItem(AUTH_TOKEN_KEY, token);
      }

      return data;
    },

    logout: async () => {
      try {
        await apiFetch(API_PATHS.auth.logout, { method: 'POST' });
      } catch { }
      tokenManager.clear();
      localStorage.removeItem(AUTH_TOKEN_KEY);
      window.location.href = APP_PATHS.LOGIN;
    },

    redirectToLogin: () => {
      window.location.href = APP_PATHS.LOGIN;
    },

    uploadAvatar: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return await apiFetch(API_PATHS.auth.uploadAvatar, {
        method: 'POST',
        body: formData,
      });
    },

    removeAvatar: async () => {
      return await apiFetch(API_PATHS.auth.removeAvatar, {
        method: 'DELETE',
      });
    },

    forgotPassword: async (identifier) => {
      return apiFetch(API_PATHS.auth.forgotPassword, {
        method: 'POST',
        body: JSON.stringify({ identifier }),
      });
    },

    verifyResetToken: async (token) => {
      return apiFetch(API_PATHS.auth.verifyResetToken, { method: 'GET' }, { token });
    },

    resetPassword: async (token, new_password) => {
      return apiFetch(API_PATHS.auth.resetPassword, {
        method: 'POST',
        body: JSON.stringify({ token, new_password }),
      });
    },
  },

  members: {
    list: async (query = {}) => {
      const data = await apiFetch(API_PATHS.members.list, { method: 'GET' }, query);
      return extractArray(data).map(normalizeMember);
    },

    summary: async () => {
      const data = await apiFetch(API_PATHS.members.summary, { method: 'GET' });
      return {
        total_members: Number(data?.total_members || 0),
        active_members: Number(data?.active_members || 0),
      };
    },

    me: async () => normalizeMember(await apiFetch(API_PATHS.members.me, { method: 'GET' })),

    get: async (id) => normalizeMember(await apiFetch(API_PATHS.members.byId(id), { method: 'GET' })),

    getByCode: async (code) => normalizeMember(await apiFetch(API_PATHS.members.byCode(code), { method: 'GET' })),

    create: async (data) =>
      normalizeMember(await apiFetch(API_PATHS.members.list, {
        method: 'POST',
        body: JSON.stringify(data),
      })),

    importFromFile: async (file, options = {}) => {
      const includeDonations = options?.includeDonations ?? true;
      const onUploadProgress = options?.onUploadProgress;
      const formData = new FormData();
      formData.append('file', file);

      return uploadAndPollImportJob({
        createPath: API_PATHS.members.importJob,
        statusPathBuilder: API_PATHS.members.importJobStatus,
        formData,
        query: { include_donations: includeDonations },
        onUploadProgress,
      });
    },

    update: async (id, data) =>
      normalizeMember(await apiFetch(API_PATHS.members.byId(id), {
        method: 'PUT',
        body: JSON.stringify(data),
      })),

    delete: (id) =>
      apiFetch(API_PATHS.members.byId(id), { method: 'DELETE' }),
  },

  challans: {
    listPaginated: async (query = {}) => {
      const data = await apiFetch(API_PATHS.challans.list, { method: 'GET' }, query);
      const items = extractArray(data).map(normalizeChallan);
      return {
        items,
        total: extractTotal(data, items.length),
        skip: Number(data?.skip || query?.skip || 0),
        limit: Number(data?.limit || query?.limit || items.length || 0),
      };
    },

    list: async (query = {}) => {
      const result = await charityClient.challans.listPaginated(query);
      return result.items;
    },

    summary: async (query = {}) => {
      const data = await apiFetch(API_PATHS.challans.summary, { method: 'GET' }, query);
      return {
        total_challans: Number(data?.total_challans || 0),
        approved_count: Number(data?.approved_count || 0),
        pending_count: Number(data?.pending_count || 0),
        total_collected: Number(data?.total_collected || 0),
        monthly_collection: Number(data?.monthly_collection || 0),
      };
    },

    collectionStats: async () => {
      const data = await apiFetch(API_PATHS.challans.collectionStats, { method: 'GET' });
      return {
        today: Number(data?.today || 0),
        this_week: Number(data?.this_week || 0),
        this_month: Number(data?.this_month || 0),
        this_year: Number(data?.this_year || 0),
        all_time: Number(data?.all_time || 0),
      };
    },

    payableMonths: async (query = {}) => {
      const data = await apiFetch(API_PATHS.challans.payableMonths, { method: 'GET' }, query);
      return {
        member_id: Number(data?.member_id || 0),
        current_month: String(data?.current_month || ''),
        pending_months: Array.isArray(data?.pending_months) ? data.pending_months : [],
        current_month_payable: Boolean(data?.current_month_payable),
        upcoming_months: Array.isArray(data?.upcoming_months) ? data.upcoming_months : [],
        all_months: Array.isArray(data?.all_months) ? data.all_months : [],
      };
    },

    get: async (id) => normalizeChallan(await apiFetch(API_PATHS.challans.byId(id), { method: 'GET' })),

    getByMember: async (memberId, query = {}) => {
      const data = await apiFetch(API_PATHS.challans.byMember(memberId), { method: 'GET' }, query);
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

    revert: async (id, payload = {}) => {
      return normalizeChallan(await apiFetch(API_PATHS.challans.revert(id), {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }));
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

    importHistoryFromFile: async (file, options = {}) => {
      const onUploadProgress = options?.onUploadProgress;
      const formData = new FormData();
      formData.append('file', file);

      return uploadAndPollImportJob({
        createPath: API_PATHS.challans.importHistoryJob,
        statusPathBuilder: API_PATHS.challans.importHistoryJobStatus,
        formData,
        query: {},
        onUploadProgress,
      });
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

  admin: {
    wipeData: async (payload) => {
      return apiFetch(API_PATHS.admin.wipeData, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    dashboardCharts: async (params = {}) => {
      return apiFetch(API_PATHS.admin.dashboardCharts, { method: 'GET' }, params);
    },

    getSettings: async () => {
      return apiFetch(API_PATHS.admin.settings, { method: 'GET' });
    },

    updateSettings: async (payload) => {
      return apiFetch(API_PATHS.admin.settings, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    listPasswordResetRequests: async (query = {}) => {
      const data = await apiFetch(API_PATHS.admin.passwordResetRequests, { method: 'GET' }, query);
      return Array.isArray(data) ? data : [];
    },

    approvePasswordReset: async (id, admin_notes = '') => {
      return apiFetch(API_PATHS.admin.approvePasswordReset(id), {
        method: 'POST',
        body: JSON.stringify({ admin_notes: admin_notes || undefined }),
      });
    },

    rejectPasswordReset: async (id, rejection_reason, admin_notes = '') => {
      return apiFetch(API_PATHS.admin.rejectPasswordReset(id), {
        method: 'POST',
        body: JSON.stringify({ rejection_reason, admin_notes: admin_notes || undefined }),
      });
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
      return normalizeCampaign(await apiFetch(API_PATHS.campaigns.byId(id), {
        method: 'PATCH',
        body: JSON.stringify(data),
      }));
    },

    delete: (id) =>
      apiFetch(API_PATHS.campaigns.byId(id), { method: 'DELETE' }),

    uploadImage: async (id, file) => {
      const formData = new FormData();
      formData.append('file', file);
      return normalizeCampaign(await apiFetch(`${API_PATHS.campaigns.byId(id)}/upload-image`, {
        method: 'POST',
        body: formData,
      }));
    },

    importPaymentsFromFile: async (file, options = {}) => {
      const onUploadProgress = options?.onUploadProgress;
      const formData = new FormData();
      formData.append('file', file);

      return uploadAndPollImportJob({
        createPath: API_PATHS.campaigns.importPaymentsJob,
        statusPathBuilder: API_PATHS.campaigns.importPaymentsJobStatus,
        formData,
        query: {},
        onUploadProgress,
      });
    },
  },

  notifications: {
    /**
     * Create and send notification (matches TypeScript interface)
     * @param {Object} payload - Notification data
     * @param {string} payload.title - Notification title
     * @param {string} payload.message - Notification message
     * @param {number} [payload.user_id] - Optional specific user ID
     * @param {'member' | 'admin' | 'superadmin'} [payload.target_role] - Optional role broadcast
     * @returns {Promise<{sent_count: number, message: string}>}
     */
    create: async (payload) => {
      return apiFetch(API_PATHS.notifications.list, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    /**
     * Get current user's notifications
     * @param {Object} [params] - Query parameters
     * @param {number} [params.skip] - Pagination offset (default: 0)
     * @param {number} [params.limit] - Max records (default: 50)
     * @returns {Promise<Array>}
     */
    listMine: async (params = {}) => {
      const query = {
        skip: params?.skip ?? 0,
        limit: params?.limit ?? 50,
      };
      const data = await apiFetch(API_PATHS.notifications.list, { method: 'GET' }, query);
      return extractArray(data).map(normalizeNotification);
    },

    feed: async (params = {}) => {
      const query = {
        skip: params?.skip ?? 0,
        limit: params?.limit ?? 50,
      };
      const data = await apiFetch(API_PATHS.notifications.feed, { method: 'GET' }, query);
      return {
        items: extractArray(data?.items).map(normalizeNotification),
        unread_count: Number(data?.unread_count || 0),
      };
    },

    /**
     * Get unread notifications count
     * @returns {Promise<number>}
     */
    unreadCount: async () => {
      const data = await apiFetch(API_PATHS.notifications.unreadCount, { method: 'GET' });
      return data?.unread_count ?? 0;
    },

    /**
     * Mark a notification as read
     * @param {number} notificationId - Notification ID
     * @returns {Promise<Object>}
     */
    markRead: async (notificationId) => {
      return normalizeNotification(
        await apiFetch(API_PATHS.notifications.read(notificationId), { method: 'PUT' })
      );
    },

    /**
     * Mark all notifications as read
     * @returns {Promise<{marked_read: number, message: string}>}
     */
    markAllRead: async () => {
      return apiFetch(API_PATHS.notifications.markAllRead, { method: 'POST' });
    },

    patchRead: async (payload = {}) => {
      return apiFetch(API_PATHS.notifications.patchRead, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },

    /**
     * List sent notification batches (Admin only)
     * @param {Object} [params] - Query parameters
     * @param {number} [params.minutes] - Time window in minutes (default: 10080 = 7 days)
     * @param {'all' | 'members' | 'admins' | 'superadmins'} [params.audience_filter] - Filter by audience
     * @param {number} [params.skip] - Pagination offset (default: 0)
     * @param {number} [params.limit] - Max records (default: 50)
     * @returns {Promise<Array>}
     */
    listSentBatches: async (params = {}) => {
      const query = {
        minutes: params?.minutes ?? 10080,
        audience_filter: params?.audience_filter ?? 'all',
        skip: params?.skip ?? 0,
        limit: params?.limit ?? 50,
      };
      const data = await apiFetch(API_PATHS.notifications.adminSent, { method: 'GET' }, query);
      return extractArray(data);
    },

    /**
     * Delete a sent notification batch (Admin only)
     * @param {Object} payload - Batch identification
     * @param {string} payload.batch_created_at - ISO timestamp of batch creation
     * @param {string} payload.title - Notification title
     * @param {string} payload.message - Notification message
     * @param {'all' | 'members' | 'admins' | 'superadmins'} payload.recipient_scope - Recipient scope
     * @returns {Promise<{deleted_count: number, message: string}>}
     */
    deleteSentBatch: async (payload) => {
      return apiFetch(API_PATHS.notifications.adminSent, {
        method: 'DELETE',
        body: JSON.stringify(payload),
      });
    },

    // Legacy methods (keep for backward compatibility)
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
        else if (payload.target_type === 'members') payload.target_role = 'member';
        // 'all' means broadcast to everyone — omit target_role so backend sends to all
      }

      delete payload.target_type;
      delete payload.read_by;

      return apiFetch(API_PATHS.notifications.list, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    sendWhatsApp: (payload) =>
      apiFetch(API_PATHS.notifications.sendWhatsApp, {
        method: 'POST',
        body: JSON.stringify(payload),
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

    getPushPublicKey: () =>
      apiFetch(API_PATHS.notifications.pushPublicKey, { method: 'GET' }),

    pushSubscribe: (subscription) =>
      apiFetch(API_PATHS.notifications.pushSubscribe, {
        method: 'POST',
        body: JSON.stringify(subscription),
      }),

    pushUnsubscribe: (endpoint) =>
      apiFetch(API_PATHS.notifications.pushUnsubscribe, {
        method: 'POST',
        body: JSON.stringify({ endpoint }),
      }),

    subscribe: (callback) => {
      if (typeof window === 'undefined' || typeof callback !== 'function') {
        return () => {};
      }

      const configuredStreamUrl = String(import.meta.env.VITE_NOTIFICATIONS_STREAM_URL || '').trim();
      const token = getAuthToken();

      if (!token || typeof EventSource === 'undefined') {
        return () => {};
      }

      const streamUrl = configuredStreamUrl
        ? new URL(configuredStreamUrl, window.location.origin)
        : new URL(buildUrl(API_PATHS.notifications.stream, { access_token: token }));

      if (configuredStreamUrl) {
        streamUrl.searchParams.set('access_token', token);
      }

      const eventSource = new EventSource(streamUrl.toString());

      eventSource.onmessage = (event) => {
        if (!event?.data) return;

        try {
          callback(JSON.parse(event.data));
        } catch {
          // Ignore malformed realtime payloads; polling fallback still keeps state fresh.
        }
      };

      eventSource.onerror = () => {
        // Native EventSource reconnects automatically; keep silent here.
      };

      return () => {
        eventSource.close();
      };
    },
  },

  requests: {
    list: async (query = {}) => {
      const data = await apiFetch(API_PATHS.requests.list, { method: 'GET' }, query);
      return extractArray(data).map(normalizeRequest);
    },

    adminList: async (query = {}) => {
      const data = await apiFetch(API_PATHS.requests.adminList, { method: 'GET' }, query);
      const items = extractArray(data?.items || data).map(normalizeRequest);
      return {
        items,
        total: extractTotal(data, items.length),
        skip: Number(data?.skip || query?.skip || 0),
        limit: Number(data?.limit || query?.limit || items.length || 0),
      };
    },

    get: async (id) => normalizeRequest(await apiFetch(API_PATHS.requests.byId(id), { method: 'GET' })),

    create: async (data) =>
      normalizeRequest(
        await apiFetch(API_PATHS.requests.list, {
          method: 'POST',
          body: JSON.stringify(data),
        })
      ),

    update: async (id, data) =>
      normalizeRequest(
        await apiFetch(API_PATHS.requests.byId(id), {
          method: 'PATCH',
          body: JSON.stringify(data),
        })
      ),

    approve: async (id, adminNotes = '') =>
      normalizeRequest(
        await apiFetch(API_PATHS.requests.approve(id), {
          method: 'PATCH',
          body: JSON.stringify({ action: 'approve', admin_notes: adminNotes || undefined }),
        })
      ),

    reject: async (id, rejectionReason, adminNotes = '') =>
      normalizeRequest(
        await apiFetch(API_PATHS.requests.reject(id), {
          method: 'PATCH',
          body: JSON.stringify({
            action: 'reject',
            rejection_reason: rejectionReason,
            admin_notes: adminNotes || undefined,
          }),
        })
      ),

    cancel: async (id) =>
      apiFetch(API_PATHS.requests.byId(id), {
        method: 'DELETE',
      }),
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

    uploadAvatar: async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      return await apiFetch(API_PATHS.files.uploadAvatar, {
        method: 'POST',
        headers: {}, // Let browser set Content-Type for FormData
        body: formData,
      });
    },

    deleteFile: async (fileUrl) => {
      return await apiFetch(API_PATHS.files.deleteFile, {
        method: 'DELETE',
      }, { file_url: fileUrl });
    },
  },

  // Fund Utilizations (admin CRUD)
  fundUtilizations: {
    list: async (query = {}) => {
      const data = await apiFetch(API_PATHS.fundUtilizations.list, { method: 'GET' }, query);
      return extractArray(data);
    },

    summary: async () => apiFetch(API_PATHS.fundUtilizations.summary, { method: 'GET' }),

    get: async (id) => apiFetch(API_PATHS.fundUtilizations.byId(id), { method: 'GET' }),

    create: (data) =>
      apiFetch(API_PATHS.fundUtilizations.list, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id, data) =>
      apiFetch(API_PATHS.fundUtilizations.byId(id), {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id) =>
      apiFetch(API_PATHS.fundUtilizations.byId(id), {
        method: 'DELETE',
      }),
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
        entity_id: data?.entity_id ?? data?.target_id ?? 0,
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
        Request: 'requests',
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
