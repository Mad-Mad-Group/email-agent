// Service Worker for Web Push Notifications

const CACHE_NAME = 'hermes-push-v1';

// Listen for push events from the push service
self.addEventListener('push', (event) => {
  let data = {
    title: 'Hermes CRM',
    body: 'You have a new notification.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    url: '/',
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        url: payload.url || data.url,
        tag: payload.tag || undefined,
        data: payload.data || {},
      };
    } catch {
      // If JSON parse fails, use the text as body
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: { url: data.url, ...data.data },
    vibrate: [100, 50, 100],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification click — focus or open the app window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If an app window is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // Otherwise open a new window
      return clients.openWindow(targetUrl);
    })
  );
});

// Activate immediately — claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Install — skip waiting so updates take effect immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});
