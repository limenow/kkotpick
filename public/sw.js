// 꽃픽 서비스 워커: 새 주문 푸시 알림만 처리한다 (오프라인 캐시는 하지 않는다)

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "꽃픽", body: "새 주문이 들어왔어요", url: "/dashboard" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    // 내용 없이 온 푸시
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      data: { url: data.url },
      vibrate: [200, 100, 200],
      requireInteraction: true,
    }),
  );
});

// 알림을 누르면 열려 있는 꽃픽 창으로 가고, 없으면 새로 연다
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? "/dashboard", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => w.url.startsWith(self.location.origin + "/dashboard"));
      if (open) {
        open.navigate(url);
        return open.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
