/* Service worker de Congela (artesanal, sin dependencias).
 *
 * Objetivo: que la app instalada abra AL INSTANTE (cachea el "shell" y los assets) y muestre
 * una pantalla de cortesía cuando no hay conexión. NO cachea datos (todo es dinámico con
 * Neon), ni /api, ni mutaciones (server actions POST): eso siempre va contra la red.
 */
const VERSION = "congela-v1";
const PRECACHE = ["/offline", "/icon", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo GET del mismo origen. Nunca tocar mutaciones, API, login ni el ping del cron.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/login") return;

  const esAsset =
    url.pathname.startsWith("/_next/static/") ||
    /\.(css|js|woff2?|ttf|svg|png|jpg|jpeg|webp|ico)$/.test(url.pathname);

  // Assets estáticos: stale-while-revalidate (sirve del cache al instante y actualiza detrás).
  if (esAsset) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const cacheado = await cache.match(req);
        const red = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cacheado);
        return cacheado || red;
      }),
    );
    return;
  }

  // Navegaciones (HTML): primero la red (datos en vivo); si falla, la página offline.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline")));
  }
});
