/** Only same-origin app paths are allowed as notification targets. */
export function safeInternalLink(url) {
  const value = String(url || '').trim();
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  return value;
}

/**
 * The page a notification opens. Older notifications were saved without a link;
 * those get one from what they are about (payment reminders -> My payments, welcome -> Profile).
 * Announcements have no page: they stay on the Notifications page.
 */
export function getNotificationLink(notification) {
  const own = safeInternalLink(notification?.link_url);
  if (own) return own;
  const title = String(notification?.title || '').toLowerCase();
  const category = String(notification?.category || '').toLowerCase();
  const type = String(notification?.type || '').toLowerCase();
  if (category === 'reminders' || /reminder|payment due|challan due/.test(title)) return '/Challans';
  if (category === 'payment_updates' || type === 'payment' || /challan|payment/.test(title)) return '/Challans';
  if (category === 'requests' || /request/.test(title)) return '/Requests';
  if (/welcome/.test(title)) return '/Profile';
  return null;
}
