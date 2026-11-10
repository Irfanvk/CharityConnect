/** Only same-origin app paths are allowed as notification targets. */
export function safeInternalLink(url) {
  const value = String(url || '').trim();
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  return value;
}

export function getNotificationLink(notification) {
  return safeInternalLink(notification?.link_url);
}
