import { createPageUrl } from '@/utils';

export const ROUTE_KEYS = {
  DASHBOARD: 'Dashboard',
  MEMBERS: 'Members',
  CHALLANS: 'Challans',
  CAMPAIGNS: 'Campaigns',
  REPORTS: 'Reports',
  AUDIT_LOGS: 'AuditLogs',
  NOTIFICATIONS: 'Notifications',
  DOCUMENTATION: 'Documentation',
  PROFILE: 'Profile',
  SETTINGS: 'Settings',
};

export const APP_PATHS = {
  LOGIN: '/login',
  HOME: '/',
};

export const PAGE_PATHS = {
  DASHBOARD: createPageUrl(ROUTE_KEYS.DASHBOARD),
  MEMBERS: createPageUrl(ROUTE_KEYS.MEMBERS),
  CHALLANS: createPageUrl(ROUTE_KEYS.CHALLANS),
  CAMPAIGNS: createPageUrl(ROUTE_KEYS.CAMPAIGNS),
  REPORTS: createPageUrl(ROUTE_KEYS.REPORTS),
  AUDIT_LOGS: createPageUrl(ROUTE_KEYS.AUDIT_LOGS),
  NOTIFICATIONS: createPageUrl(ROUTE_KEYS.NOTIFICATIONS),
  DOCUMENTATION: createPageUrl(ROUTE_KEYS.DOCUMENTATION),
  PROFILE: createPageUrl(ROUTE_KEYS.PROFILE),
  SETTINGS: createPageUrl(ROUTE_KEYS.SETTINGS),
};

export const APP_IMAGES = {
  DASHBOARD: {
    SUPERADMIN_WELCOME_BG: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200',
    MEMBER_WELCOME_BG: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200',
  },
};
