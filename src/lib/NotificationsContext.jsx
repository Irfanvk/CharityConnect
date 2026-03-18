import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { charityClient } from '@/api/charityClient';
import { NOTIFICATIONS_CHANGED_EVENT } from '@/lib/notificationState';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = async (params = { skip: 0, limit: 100 }) => {
    setIsLoading(true);
    try {
      const feed = await charityClient.notifications.feed(params);
      setNotifications(Array.isArray(feed?.items) ? feed.items : []);
      setUnreadCount(Number(feed?.unread_count || 0));
      return feed;
    } catch {
      setNotifications([]);
      setUnreadCount(0);
      return { items: [], unread_count: 0 };
    } finally {
      setIsLoading(false);
    }
  };

  const markAllRead = async () => {
    await charityClient.notifications.patchRead({ mark_all: true });
    await refresh();
  };

  const markReadByIds = async (ids = []) => {
    const normalized = Array.from(new Set((ids || []).map((id) => Number(id)).filter(Boolean)));
    if (normalized.length === 0) return;
    await charityClient.notifications.patchRead({ notification_ids: normalized, mark_all: false });
    await refresh();
  };

  useEffect(() => {
    refresh();

    const onFocus = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    const onNotificationsChanged = () => {
      refresh();
    };

    const intervalId = window.setInterval(() => {
      refresh();
    }, 30000);

    window.addEventListener('focus', onFocus);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onNotificationsChanged);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onNotificationsChanged);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      refreshNotifications: refresh,
      markAllRead,
      markReadByIds,
    }),
    [notifications, unreadCount, isLoading]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}
