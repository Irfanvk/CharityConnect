import { useEffect, useState } from "react";
import { charityClient } from "@/api/charityClient";
import { APP_BRAND, APP_IMAGES } from "@/config/appPaths";

export default function NotificationManager({ user }) {
  const [permission, setPermission] = useState(Notification.permission);

  useEffect(() => {
    // Request notification permission
    if (permission === "default") {
      Notification.requestPermission().then(setPermission);
    }
  }, []);

  useEffect(() => {
    if (!user || permission !== "granted") return;

    // Subscribe to new notifications
    const unsubscribe = charityClient.notifications.subscribe((event) => {
      if (event.type !== "create") return;

      const notification = event.data;
      
      // Check if this notification is relevant to the current user
      const isRelevant = 
        notification.target_type === "all" ||
        (notification.target_type === "member" && notification.target_member_id === user.email) ||
        (notification.target_type === "admins" && (user.role === "admin" || user.role === "superadmin"));

      if (isRelevant && !notification.read_by?.includes(user.email)) {
        // Show browser notification
        new Notification(`${APP_BRAND.NAME} - ${notification.title}`, {
          body: notification.message,
          icon: APP_IMAGES.LOGOS.FAVICON,
          badge: APP_IMAGES.LOGOS.FAVICON,
          tag: notification.id,
          requireInteraction: false,
          silent: false
        });
      }
    });

    return unsubscribe;
  }, [user, permission]);

  return null;
}