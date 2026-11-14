self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'New Notification', body: event.data.text() };
  }

  const title = payload.title || 'New Notification';
  const data = payload.data || { url: '/Notifications' };
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag || 'charityhub-notification',
    data,
    renotify: false,
  };

  const unread = Number(payload.unread_count ?? data.unread_count);

  event.waitUntil((async () => {
    await self.registration.showNotification(title, options);

    if (Number.isFinite(unread) && self.navigator && 'setAppBadge' in self.navigator) {
      try {
        await (unread > 0 ? self.navigator.setAppBadge(unread) : self.navigator.clearAppBadge());
      } catch {
        // Badging is optional.
      }
    }

    // Tell open windows to refresh the bell and list immediately.
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    windows.forEach((client) => client.postMessage({ type: 'notification-received', unread_count: unread }));
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification?.data || {};
  const relativeUrl = data.link_url || data.url || '/Notifications';
  // openWindow requires an absolute URL; self.location.origin covers any domain (dev, Netlify, custom)
  let absoluteUrl = relativeUrl.startsWith('http') ? relativeUrl : self.location.origin + relativeUrl;
  // The app marks this notification read when it sees ?from_push=<id> (opening it = reading it).
  const notificationId = Number(data.notification_id);
  if (Number.isInteger(notificationId) && notificationId > 0) {
    try {
      const target = new URL(absoluteUrl);
      target.searchParams.set('from_push', String(notificationId));
      absoluteUrl = target.toString();
    } catch {
      // Keep the plain link.
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          // The app listens for this message and routes in-app; navigate() is the fallback.
          client.postMessage({ type: 'notification-click', url: absoluteUrl, notification_id: notificationId || null });
          const focused = await client.focus();
          if (focused && 'navigate' in focused) {
            try {
              await focused.navigate(absoluteUrl);
            } catch {
              // Message-based routing already handled it.
            }
          }
          return focused;
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(absoluteUrl);
      }

      return null;
    })
  );
});
