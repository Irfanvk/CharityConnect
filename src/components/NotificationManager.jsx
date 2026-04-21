import { useEffect, useMemo, useRef, useState } from "react";
import { APP_BRAND, APP_IMAGES } from "@/config/appPaths";
import { useNotifications } from "@/context/NotificationContext";
import { charityClient } from "@/api/charityClient";

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export default function NotificationManager({ user }) {
  const hasNotificationApi = typeof window !== "undefined" && "Notification" in window;
  const shownIdsRef = useRef(new Set());
  const hasSeededInitialFeedRef = useRef(false);
  const [permission, setPermission] = useState(
    hasNotificationApi ? window.Notification.permission : "unsupported"
  );
  const { notifications } = useNotifications();

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
    if (!hasNotificationApi || !user) return;

    // Request notification permission
    if (permission === "default") {
      window.Notification.requestPermission().then(setPermission);
    }
  }, [hasNotificationApi, permission, user]);

  useEffect(() => {
    if (!user) return;
    if (permission !== "granted") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    let cancelled = false;

    const syncPushSubscription = async () => {
      try {
        const pushConfig = await charityClient.notifications.getPushPublicKey();
        const publicKey = String(pushConfig?.public_key || "").trim();
        const enabled = Boolean(pushConfig?.enabled && publicKey);
        if (!enabled) return;

        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }

        if (cancelled || !subscription) return;

        await charityClient.notifications.pushSubscribe(subscription.toJSON());
      } catch {
        // Keep app usable if push setup fails on unsupported browsers/networks.
      }
    };

    syncPushSubscription();

    return () => {
      cancelled = true;
    };
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
        };
      } catch {
        // Ignore notification rendering failures on unsupported browsers.
      }
    });
  }, [hasNotificationApi, permission, relevantUnreadNotifications, user]);

  return null;
}