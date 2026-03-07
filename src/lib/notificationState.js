const NOTIFICATION_DISMISSED_KEY_PREFIX = "notification_dismissed:";
export const NOTIFICATIONS_CHANGED_EVENT = "notifications:changed";

function keyForUser(userEmail) {
  return `${NOTIFICATION_DISMISSED_KEY_PREFIX}${String(userEmail || "anonymous").toLowerCase()}`;
}

export function getDismissedNotificationIds(userEmail) {
  if (typeof window === "undefined" || !userEmail) return [];
  const raw = window.localStorage.getItem(keyForUser(userEmail));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function dismissNotificationForUser(userEmail, notificationId) {
  if (typeof window === "undefined" || !userEmail || !notificationId) return;
  const existing = new Set(getDismissedNotificationIds(userEmail));
  existing.add(notificationId);
  window.localStorage.setItem(keyForUser(userEmail), JSON.stringify(Array.from(existing)));
}

export function isNotificationDismissed(userEmail, notificationId) {
  return getDismissedNotificationIds(userEmail).includes(notificationId);
}

export function emitNotificationsChanged(action = "updated") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT, { detail: { action } }));
}