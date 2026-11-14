import { APP_VERSION } from "@/lib/appVersion";
import { useEffect, useMemo, useRef, useState } from "react";
import { APP_BRAND, APP_IMAGES } from "@/config/appPaths";
import { useNotifications } from "@/context/NotificationContext";
import { useLocation, useNavigate } from "react-router-dom";
import { charityClient } from "@/api/charityClient";
import { syncPushSubscription } from "@/lib/pushSetup";
import { safeInternalLink } from "@/lib/notificationLinks";

export default function NotificationManager({ user }) {
  const hasNotificationApi = typeof window !== "undefined" && "Notification" in window;
  const shownIdsRef = useRef(new Set());
  const hasSeededInitialFeedRef = useRef(false);
  const [permission, setPermission] = useState(
    hasNotificationApi ? window.Notification.permission : "unsupported"
  );
  const { notifications, markReadByIds } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const markedFromPushRef = useRef(new Set());

  // Opening a notification from the phone counts as reading it. The service worker adds
  // ?from_push=<id> to the link; mark it read once signed in, then drop the parameter.
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(location.search);
    const raw = params.get("from_push");
    if (raw === null) return;
    const id = Number(raw);
    params.delete("from_push");
    const rest = params.toString();
    navigate(`${location.pathname}${rest ? `?${rest}` : ""}${location.hash}`, { replace: true });
    if (!Number.isInteger(id) || id <= 0 || markedFromPushRef.current.has(id)) return;
    markedFromPushRef.current.add(id);
    markReadByIds([id]).catch(() => {
      markedFromPushRef.current.delete(id); // try again next time it is opened
    });
  }, [location.hash, location.pathname, location.search, markReadByIds, navigate, user]);

  // Permission is requested only from an explicit tap elsewhere; here we just follow changes.
  useEffect(() => {
    const onChange = () => {
      if (hasNotificationApi) setPermission(window.Notification.permission);
    };
    window.addEventListener('charityhub:push-permission-changed', onChange);
    return () => window.removeEventListener('charityhub:push-permission-changed', onChange);
  }, [hasNotificationApi]);

  // Route in-app when a push notification is tapped while the app is open.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    const onMessage = (event) => {
      if (event?.data?.type !== 'notification-click') return;
      try {
        const url = new URL(event.data.url, window.location.origin);
        const target = safeInternalLink(url.pathname + url.search);
        if (url.origin === window.location.origin && target) navigate(target);
      } catch {
        // Ignore malformed targets.
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [navigate]);

  const deviceDisplayMode =
    typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches
      ? "standalone"
      : "standalone" in window.navigator && window.navigator.standalone === true
        ? "standalone"
        : "browser";

  const relevantUnreadNotifications = useMemo(() => {
    if (!user) return [];

    return notifications.filter((notification) => {
      const isRelevant =
        !notification.target_type ||
        notification.target_type === "all" ||
        (notification.target_type === "member" && notification.target_member_id === user.email) ||
        (notification.target_type === "admins" && (user.role === "admin" || user.role === "superadmin"));

      const isRead = Boolean(notification?.is_read || notification?.read_by?.includes(user.email));
      return isRelevant && !isRead;
    });
  }, [notifications, user]);

  useEffect(() => {
    if (!user) return;

    charityClient.users.reportDeviceStatus({
      notification_permission: hasNotificationApi ? permission : "unsupported",
      device_display_mode: deviceDisplayMode,
      app_version: APP_VERSION,
    }).catch(() => {
      // Status reporting must not affect normal notification use.
    });
  }, [deviceDisplayMode, hasNotificationApi, permission, user]);

  useEffect(() => {
    if (!user) return;
    if (permission !== "granted") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    // Runs at every start: re-registers the subscription and silently re-subscribes after a VAPID key change.
    syncPushSubscription().catch(() => {
      // Keep app usable if push setup fails on unsupported browsers/networks.
    });
  }, [permission, user]);

  useEffect(() => {
    if (!user) return;
    if (permission !== "denied") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const cleanupSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return;
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        if (endpoint) {
          await charityClient.notifications.pushUnsubscribe(endpoint);
        }
      } catch {
        // Best-effort cleanup only.
      }
    };

    cleanupSubscription();
  }, [permission, user]);

  useEffect(() => {
    shownIdsRef.current = new Set();
    hasSeededInitialFeedRef.current = false;
  }, [user?.email]);

  useEffect(() => {
    if (!user) return;

    const unseenIds = new Set(relevantUnreadNotifications.map((notification) => notification.id));
    shownIdsRef.current.forEach((id) => {
      if (!unseenIds.has(id)) {
        shownIdsRef.current.delete(id);
      }
    });

    if (!hasSeededInitialFeedRef.current) {
      relevantUnreadNotifications.forEach((notification) => {
        shownIdsRef.current.add(notification.id);
      });
      hasSeededInitialFeedRef.current = true;
      return;
    }

    if (!hasNotificationApi || permission !== "granted") return;
    if (document.visibilityState === "visible" && document.hasFocus()) return;

    relevantUnreadNotifications.forEach((notification) => {
      if (shownIdsRef.current.has(notification.id)) return;
      shownIdsRef.current.add(notification.id);

      try {
        const browserNotification = new window.Notification(`${APP_BRAND.NAME} - ${notification.title}`, {
          body: notification.message,
          icon: APP_IMAGES.LOGOS.FAVICON,
          badge: APP_IMAGES.LOGOS.FAVICON,
          tag: `notification-${notification.id}`,
          requireInteraction: false,
          silent: false,
        });

        browserNotification.onclick = () => {
          window.focus();
          browserNotification.close();
          markReadByIds([notification.id]).catch(() => {});
          const link = safeInternalLink(notification.link_url);
          if (link) navigate(link);
        };
      } catch {
        // Ignore notification rendering failures on unsupported browsers.
      }
    });
  }, [hasNotificationApi, markReadByIds, navigate, permission, relevantUnreadNotifications, user]);

  return null;
}