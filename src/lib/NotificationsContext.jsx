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
const VISIBLE_POLL_INTERVAL_MS = 15_000;
const HIDDEN_POLL_INTERVAL_MS = 60_000;
const NOTIFICATIONS_BROADCAST_CHANNEL = 'charityhub:notifications';
const NOTIFICATIONS_STORAGE_KEY = 'charityhub:notifications:snapshot';

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
  const latestSnapshotAtRef = useRef(0);

  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);
  useEffect(() => { unreadCountRef.current = unreadCount; }, [unreadCount]);

  const applyFeed = useCallback((feed, options = {}) => {
    const normalizedItems = Array.isArray(feed?.items) ? feed.items : [];
    const normalizedUnreadCount = Number(feed?.unread_count ?? 0);
    const snapshotAt = Number(feed?.snapshot_at ?? Date.now());

    latestSnapshotAtRef.current = snapshotAt;
    setNotifications(normalizedItems);
    setUnreadCount(normalizedUnreadCount);

    if (options?.broadcast === false || typeof window === 'undefined') {
      return {
        items: normalizedItems,
        unread_count: normalizedUnreadCount,
        snapshot_at: snapshotAt,
      };
    }

    const snapshot = {
      items: normalizedItems,
      unread_count: normalizedUnreadCount,
      snapshot_at: snapshotAt,
    };

    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(NOTIFICATIONS_BROADCAST_CHANNEL);
      channel.postMessage(snapshot);
      channel.close();
    }

    try {
      window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore storage quota/private-mode failures.
    }

    return snapshot;
  }, []);

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
        return applyFeed(feed);
      } catch {
        // Keep the last known state on transient failures instead of clearing UI badges.
        return {
          items: notificationsRef.current,
          unread_count: unreadCountRef.current,
          snapshot_at: latestSnapshotAtRef.current,
        };
      } finally {
        inFlightPromiseRef.current = null;
        setIsLoading(false);
      }
    })();

    return inFlightPromiseRef.current;
  }, [applyFeed]);

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

    const onOnline = () => {
      refresh(undefined, { force: true });
    };

    const applyIncomingSnapshot = (snapshot) => {
      const snapshotAt = Number(snapshot?.snapshot_at || 0);
      if (!snapshotAt || snapshotAt <= latestSnapshotAtRef.current) return;
      applyFeed(snapshot, { broadcast: false });
    };

    let channel = null;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(NOTIFICATIONS_BROADCAST_CHANNEL);
      channel.onmessage = (event) => {
        applyIncomingSnapshot(event?.data);
      };
    }

    const onStorage = (event) => {
      if (event.key !== NOTIFICATIONS_STORAGE_KEY || !event.newValue) return;

      try {
        applyIncomingSnapshot(JSON.parse(event.newValue));
      } catch {
        // Ignore malformed storage payloads.
      }
    };

    const unsubscribeRealtime = charityClient.notifications.subscribe(() => {
      refresh(undefined, { force: true });
    });

    let pollTimeoutId = 0;
    const schedulePoll = () => {
      window.clearTimeout(pollTimeoutId);
      const pollInterval = document.visibilityState === 'visible'
        ? VISIBLE_POLL_INTERVAL_MS
        : HIDDEN_POLL_INTERVAL_MS;

      pollTimeoutId = window.setTimeout(() => {
        refresh();
        schedulePoll();
      }, pollInterval);
    };

    schedulePoll();

    window.addEventListener('focus', onVisibilityOrFocus);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onNotificationsChanged);
    window.addEventListener('storage', onStorage);

    return () => {
      window.clearTimeout(pollTimeoutId);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      unsubscribeRealtime();
      if (channel) channel.close();
      window.removeEventListener('focus', onVisibilityOrFocus);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onNotificationsChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, [isAuthenticated, applyFeed, fetchFeed, refresh]);

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