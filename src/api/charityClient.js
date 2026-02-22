const BASE_URL = import.meta.env.VITE_CHARITY_APP_BASE_URL || '';

function apiFetch(path, opts = {}) {
  const url = `${BASE_URL.replace(/\/$/, '')}${path}`;
  return fetch(url, opts).then(async (res) => {
    if (!res.ok) throw new Error((await res.text()) || res.statusText);
    try { return await res.json(); } catch { return null; }
  });
}

function createEntityProxy(entityName) {
  return {
    list: (query = {}) => apiFetch(`/entities/${entityName}`, { method: 'GET' }),
    create: (data) => apiFetch(`/entities/${entityName}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/entities/${entityName}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    get: (id) => apiFetch(`/entities/${entityName}/${id}`, { method: 'GET' })
  };
}

const charityClient = {
  auth: {
    me: async () => {
      try { return await apiFetch('/auth/me'); } catch { return null; }
    },
    redirectToLogin: () => {
      const loginUrl = (BASE_URL && `${BASE_URL.replace(/\/$/, '')}/auth/login`) || '/login';
      window.location.href = loginUrl;
    },
    logout: async () => {
      try { await apiFetch('/auth/logout', { method: 'POST' }); } catch {}
    }
  },
  entities: new Proxy({}, {
    get: (_t, name) => createEntityProxy(name)
  })
};

export { charityClient };
