// Do NOT use Firebase messaging SDK in the service worker.
// Instead, handle push events directly with the raw Web Push API.
// This is the most reliable approach for background notifications.

self.addEventListener("push", (event) => {
  console.log("[SW] Raw push event received!");

  let title = "New Booking";
  let body = "You have a new notification";
  let data = {};

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log("[SW] Push payload:", JSON.stringify(payload));

      // FCM wraps the data in different ways depending on the message type
      // Try all possible locations
      title = payload?.notification?.title 
           || payload?.data?.title 
           || payload?.title 
           || "New Booking";
      body = payload?.notification?.body 
          || payload?.data?.body 
          || payload?.body 
          || "You have a new notification";
      data = payload?.data || {};
    } catch (e) {
      console.log("[SW] Could not parse push data:", e);
    }
  }

  const options = {
    body: body,
    icon: "/uploads/logos/ID.png",
    badge: "/uploads/logos/ID.png",
    data: data,
    requireInteraction: true,
    tag: "booking-" + Date.now(),
    vibrate: [200, 100, 200],
  };

  // Broadcast to all open tabs so they can refresh the notification bell
  const broadcastPromise = self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
    clientList.forEach((client) => {
      client.postMessage({
        type: "fcm-notification-received",
        payload: { title, body, data }
      });
    });
  });

  event.waitUntil(Promise.all([
    self.registration.showNotification(title, options),
    broadcastPromise
  ]));
});


// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("localhost:3000") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/scheduling");
      }
    })
  );
});

// Force activate immediately
self.addEventListener("install", () => {
  console.log("[SW] Installing - skip waiting");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating - claim clients");
  event.waitUntil(clients.claim());
});
