import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { charityClient } from '@/api/charityClient';
import { useAuth } from '@/lib/AuthContext';
import { NOTIFICATIONS_CHANGED_EVENT } from '@/lib/notificationState';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inFlightPromiseRef = useRef(null);
  const lastRefreshAtRef = useRef(0);
  const notificationsRef = useRef([]);
  const unreadCountRef = useRef(0);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    unreadCountRef.current = unreadCount;
  }, [unreadCount]);

  const refresh = useCallback(async (params = { skip: 0, limit: 50 }, options = {}) => {
    const now = Date.now();
    const minIntervalMs = Number(options?.minIntervalMs ?? 750);
    if (!options?.force && now - lastRefreshAtRef.current < minIntervalMs) {
      return inFlightPromiseRef.current || { items: notificationsRef.current, unread_count: unreadCountRef.current };
    }

    if (inFlightPromiseRef.current) {
      return inFlightPromiseRef.current;
    }

    lastRefreshAtRef.current = now;
    setIsLoading(true);
    inFlightPromiseRef.current = (async () => {
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
        inFlightPromiseRef.current = null;
        setIsLoading(false);
      }
    })();

    return inFlightPromiseRef.current;
  }, []);

  const markAllRead = async () => {
    await charityClient.notifications.patchRead({ mark_all: true });
    await refresh(undefined, { force: true });
  };

  const markReadByIds = async (ids = []) => {
    const normalized = Array.from(new Set((ids || []).map((id) => Number(id)).filter(Boolean)));
    if (normalized.length === 0) return;
    await charityClient.notifications.patchRead({ notification_ids: normalized, mark_all: false });
    await refresh(undefined, { force: true });
  };

  useEffect(() => {
    // Only poll if user is authenticated
    if (!isAuthenticated) {
      // Clear notifications when logging out
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    refresh(undefined, { force: true });

    const onFocus = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    const onNotificationsChanged = () => {
      refresh(undefined, { force: true });
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
  }, [refresh, isAuthenticated]);

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
