export const API_PATHS = {
  health: '/health',
  appPublic: {
    base: '/api/apps/public',
    publicSettingsById: (appId) => `/prod/public-settings/by-id/${appId}`,
  },
  auth: {
    me: '/auth/me',
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
  },
  members: {
    list: '/members/',
    me: '/members/me',
    byId: (id) => `/members/${id}`,
    byCode: (code) => `/members/code/${code}`,
  },
  challans: {
    list: '/challans/',
    byId: (id) => `/challans/${id}`,
    byMember: (memberId) => `/challans/member/${memberId}`,
    uploadProof: (id) => `/challans/${id}/upload-proof`,
    approve: (id) => `/challans/${id}/approve`,
    reject: (id) => `/challans/${id}/reject`,
    bulkCreate: '/challans/bulk-create',
  },
  bulk: {
    pendingReview: '/admin/bulk-pending-review',
    byGroupId: (bulkGroupId) => `/admin/bulk/${bulkGroupId}`,
    approve: (bulkGroupId) => `/admin/bulk/${bulkGroupId}/approve`,
    reject: (bulkGroupId) => `/admin/bulk/${bulkGroupId}/reject`,
  },
  campaigns: {
    list: '/campaigns/',
    byId: (id) => `/campaigns/${id}`,
  },
  notifications: {
    list: '/notifications/',
    byId: (id) => `/notifications/${id}`,
    read: (id) => `/notifications/${id}/read`,
    markAllRead: '/notifications/mark-all-read',
    unreadCount: '/notifications/unread/count',
    adminSent: '/notifications/admin/sent',
  },
  requests: {
    list: '/requests/',
    byId: (id) => `/requests/${id}`,
  },
  invites: {
    list: '/invites/',
    pending: '/invites/pending',
    byId: (id) => `/invites/${id}`,
    validate: '/invites/validate',
  },
  files: {
    upload: '/files/upload',
  },
  auditLogs: {
    list: '/audit-logs/',
    byId: (id) => `/audit-logs/${id}`,
  },
  users: {
    list: '/users/',
    byId: (id) => `/users/${id}`,
  },
};
