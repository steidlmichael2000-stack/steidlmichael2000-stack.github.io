/* ═══════════════════════════════════════════════════════════════════════
   Service Worker  ·  MS Tools
   ═══════════════════════════════════════════════════════════════════════

   WAS DIESE DATEI TUT
   -------------------
   Sie macht MS Tools installierbar und offlinefähig. Chrome verlangt für
   die Installation einen Service Worker mit `fetch`-Handler – ohne den
   erscheint auf Android kein Installationsangebot.

   WARUM DIE SEITE IN EINEM UNTERORDNER LIEGT
   ------------------------------------------
   MS Tools lag bis September 2026 auf der Wurzel und hatte damit zwangs-
   läufig den Scope "/" – ein Scope muss die eigene start_url enthalten.
   Chrome rechnet jede Seite, die im Scope einer installierten App liegt,
   dieser App zu: die vier Unter-Apps liessen sich deshalb nicht mehr
   einzeln installieren, Chrome bot statt der Installation nur noch
   "in MS Tools öffnen" an. Mit dem Umzug nach `/start/` reicht der Scope
   nur noch so weit wie die Seite selbst, und die Apps sind wieder frei.

   Deshalb: diese Seite nie wieder auf die Wurzel zurückholen.

   WICHTIG: `caches.delete()` arbeitet origin-weit. Beim Aufräumen werden
   deshalb nur die eigenen Caches angefasst – niemals pauschal alles, sonst
   würden die Nachbar-Apps bei jedem Deploy ihren Offline-Bestand verlieren.
   ═══════════════════════════════════════════════════════════════════════ */

const VERSION = 'v5';
const CACHE = `mstools-${VERSION}`;

const SHELL = [
  './',
  'index.html',
  'favicon.svg',
  'logo.svg',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png'
];

// Alles ausserhalb des eigenen Ordners bleibt unangetastet – die anderen
// Apps bringen ihre eigenen Worker mit.
const EIGENER_PFAD = new URL('./', self.location).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Einzeln ablegen: eine fehlende Datei soll die Installation nicht kippen
    await Promise.allSettled(SHELL.map((file) => cache.add(file)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys
        .filter((key) => key.startsWith('mstools-') && key !== CACHE)
        .map((key) => caches.delete(key).catch(() => {})));
    } catch (e) { /* Cache Storage nicht verfügbar – ignorieren */ }
    await self.clients.claim();
  })());
});

/* Erst Netz, dann Cache: Eine neue Fassung soll sofort ankommen und nicht
   hinter einem alten Cache hängen bleiben. */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(EIGENER_PFAD)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    } catch (e) {
      const hit = await cache.match(request);
      if (hit) return hit;
      if (request.mode === 'navigate') {
        const page = await cache.match('./', { ignoreSearch: true })
          || await cache.match('index.html');
        if (page) return page;
      }
      throw e;
    }
  })());
});
