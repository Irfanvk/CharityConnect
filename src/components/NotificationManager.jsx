import { useEffect, useState } from "react";
import { charityClient } from "@/api/charityClient";
import { APP_BRAND, APP_IMAGES } from "@/config/appPaths";

export default function NotificationManager({ user }) {
  const hasNotificationApi = typeof window !== "undefined" && "Notification" in window;
  const [permission, setPermission] = useState(
    hasNotificationApi ? window.Notification.permission : "unsupported"
  );

  useEffect(() => {
    if (!hasNotificationApi) return;

    // Request notification permission
    if (permission === "default") {
      window.Notification.requestPermission().then(setPermission);
    }
  }, [hasNotificationApi, permission]);

  useEffect(() => {
    if (!hasNotificationApi || !user || permission !== "granted") return;

    // Subscribe to new notifications
    const unsubscribe = charityClient.notifications.subscribe((event) => {
      if (event.type !== "create") return;

      const notification = event.data;
      
      // Check if this notification is relevant to the current user
      const isRelevant = 
        !notification.target_type ||
        notification.target_type === "all" ||
        (notification.target_type === "member" && notification.target_member_id === user.email) ||
        (notification.target_type === "admins" && (user.role === "admin" || user.role === "superadmin"));

      const isRead = Boolean(notification?.is_read || notification?.read_by?.includes(user.email));

      if (isRelevant && !isRead) {
        // Show browser notification
        try {
          new window.Notification(`${APP_BRAND.NAME} - ${notification.title}`, {
            body: notification.message,
            icon: APP_IMAGES.LOGOS.FAVICON,
            badge: APP_IMAGES.LOGOS.FAVICON,
            tag: notification.id,
            requireInteraction: false,
            silent: false,
          });
        } catch {
          // Ignore notification rendering failures on unsupported browsers.
        }
      }
    });

    return unsubscribe;
  }, [hasNotificationApi, user, permission]);

  return null;
}