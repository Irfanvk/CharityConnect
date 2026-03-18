/**
 * Standardised query key factory for TanStack Query.
 * Centralises cache keys to prevent fragmentation and enable reliable invalidation.
 */
export const queryKeys = {
  me:                  ['auth', 'me'],
  members:             (f) => ['members', f ?? 'all'],
  member:              (id) => ['members', id],
  challans:            (f) => ['challans', f ?? 'all'],
  challan:             (id) => ['challans', id],
  challansByMember:    (mid) => ['challans', 'member', mid],
  bulkPending:         ['challans', 'bulk', 'pending'],
  bulkGroup:           (id) => ['challans', 'bulk', id],
  campaigns:           ['campaigns'],
  campaign:            (id) => ['campaigns', id],
  notifications:       ['notifications'],
  notificationsUnread: ['notifications', 'unread'],
  notificationsSent:   ['notifications', 'sent'],
  invites:             (f) => ['invites', f ?? 'all'],
  invite:              (id) => ['invites', id],
  users:               (f) => ['users', f ?? 'all'],
  requests: {
    mine:              (f) => ['requests', 'mine', f ?? 'all'],
    all:               (f) => ['requests', 'all', f ?? 'all'],
    byId:              (id) => ['requests', 'by-id', id],
  },
  auditLogs:           (f) => ['audit-logs', f ?? 'all'],
  health:              ['health'],
  importStatus:        ['import', 'status'],
};
