import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { charityClient } from '@/api/charityClient';
import { useAuth } from '@/lib/AuthContext';
import { NOTIFICATIONS_CHANGED_EVENT } from '@/lib/notificationState';

const NotificationsContext = createContext(null);

// ✅ Debounce delay — prevents burst calls from focus/visibilitychange/custom events
// all firing within milliseconds of each other.
const DEBOUNCE_MS = 500;
// ✅ Minimum interval between auto-refreshes (not forced ones)
const MIN_INTERVAL_MS = 5000;
// ✅ Poll interval — 60s is sufficient; 30s was too aggressive for a charity app
const POLL_INTERVAL_MS = 60_000;

export function NotificationsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Single in-flight promise guard — prevents parallel identical requests
  const inFlightPromiseRef = useRef(null);
  // ✅ Timestamp of last successful fetch
  const lastRefreshAtRef = useRef(0);
  // ✅ Debounce timer ref
  const debounceTimerRef = useRef(null);
  // ✅ Stable refs so event handlers never close over stale state
  const notificationsRef = useRef([]);
  const unreadCountRef = useRef(0);

  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);
  useEffect(() => { unreadCountRef.current = unreadCount; }, [unreadCount]);

  // ─── Core fetch ────────────────────────────────────────────────────────────

  /**
   * Fetches the notification feed.
   * @param {{ skip?: number, limit?: number }} params
   * @param {{ force?: boolean }} options  force=true bypasses the MIN_INTERVAL guard
   */
  const fetchFeed = useCallback(async (params = { skip: 0, limit: 50 }, options = {}) => {
    const now = Date.now();

    // Rate-limit non-forced calls
    if (!options?.force && now - lastRefreshAtRef.current < MIN_INTERVAL_MS) {
      return inFlightPromiseRef.current ?? {
        items: notificationsRef.current,
        unread_count: unreadCountRef.current,
      };
    }

    // Deduplicate concurrent calls
    if (inFlightPromiseRef.current) {
      return inFlightPromiseRef.current;
    }

    lastRefreshAtRef.current = now;
    setIsLoading(true);

    inFlightPromiseRef.current = (async () => {
      try {
        const feed = await charityClient.notifications.feed(params);
        setNotifications(Array.isArray(feed?.items) ? feed.items : []);
        setUnreadCount(Number(feed?.unread_count ?? 0));
        return feed;
      } catch {
        // Silently fail — notifications are non-critical
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

  // ✅ Debounced public refresh — used by event handlers so rapid-fire events
  // (focus + visibilitychange + NOTIFICATIONS_CHANGED all at once) collapse into one call.
  const refresh = useCallback((params, options = {}) => {
    if (options?.force) {
      // Forced refresh bypasses debounce (e.g. after user action)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      return fetchFeed(params, { force: true });
    }

    // Debounce passive refreshes
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      fetchFeed(params, {});
    }, DEBOUNCE_MS);

    return Promise.resolve();
  }, [fetchFeed]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const markAllRead = useCallback(async () => {
    await charityClient.notifications.patchRead({ mark_all: true });
    await fetchFeed(undefined, { force: true });
  }, [fetchFeed]);

  const markReadByIds = useCallback(async (ids = []) => {
    const normalized = Array.from(
      new Set((ids || []).map((id) => Number(id)).filter(Boolean))
    );
    if (normalized.length === 0) return;
    await charityClient.notifications.patchRead({ notification_ids: normalized, mark_all: false });
    await fetchFeed(undefined, { force: true });
  }, [fetchFeed]);

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Initial load
    fetchFeed(undefined, { force: true });

    // ✅ Passive handlers go through debounced refresh (not force) so they
    // respect MIN_INTERVAL and don't pile up on tab switch.
    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    // ✅ After a user action (mark read, delete, create) we force refresh.
    const onNotificationsChanged = () => {
      refresh(undefined, { force: true });
    };

    // ✅ Slower poll — 60s is plenty for a charity management app.
    const intervalId = window.setInterval(() => {
      refresh();
    }, POLL_INTERVAL_MS);

    window.addEventListener('focus', onVisibilityOrFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onNotificationsChanged);

    return () => {
      window.clearInterval(intervalId);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      window.removeEventListener('focus', onVisibilityOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onNotificationsChanged);
    };
  }, [isAuthenticated, fetchFeed, refresh]);

  // ─── Context value ─────────────────────────────────────────────────────────

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      // ✅ Expose fetchFeed as refreshNotifications so callers can force refresh
      // after mutations without going through the debounce.
      refreshNotifications: fetchFeed,
      markAllRead,
      markReadByIds,
    }),
    [notifications, unreadCount, isLoading, fetchFeed, markAllRead, markReadByIds],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}