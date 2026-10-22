// Service Worker for Web Push Notifications

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('Push notification received:', event.data);

  if (!event.data) {
    console.log('No data in push event');
    return;
  }

  let notificationData = {};
  try {
    notificationData = event.data.json();
  } catch (e) {
    notificationData = {
      title: 'Notification',
      body: event.data.text(),
    };
  }

  const { title, body, icon, badge, tag, data } = notificationData;

  const options = {
    body: body || '',
    icon: icon || '/favicon.ico',
    badge: badge || '/favicon.ico',
    tag: tag || 'notification',
    data: data || {},
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title || 'Notification', options),
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification);

  event.notification.close();

  const data = event.notification.data || {};
  const url = data.seoSlug
    ? `/q/${data.seoSlug}`
    : data.postId
      ? `/q/${data.postId}`
      : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    }),
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification);
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
