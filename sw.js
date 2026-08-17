/* ═══════════════════════════════════════════════════════════════════════
   Wurzel-Service-Worker  ·  Übersichtsseite
   ═══════════════════════════════════════════════════════════════════════

   WAS DIESE DATEI TUT
   -------------------
   Sie macht die Übersicht unter "/" installierbar und offlinefähig. Chrome
   verlangt für die Installation einen Service Worker mit `fetch`-Handler –
   ohne den erscheint auf Android kein Installationsangebot.

   VORGESCHICHTE
   -------------
   An dieser Stelle lag zuvor ein reiner Kill-Switch. Unter "/" lief einmal
   die Stundenplan-App als PWA; ihr Worker (Cache `fst1-v1`) lieferte
   cache-first aus und hätte die Übersicht dauerhaft verdeckt. Da Service
   Worker über ihre Skript-URL aktualisiert werden, übernimmt diese Datei
   dieselbe Aufgabe: Wer noch am alten Worker hängt, bekommt beim nächsten
   Besuch diesen hier – und `fst1-v1` wird unten gezielt gelöscht.

   ABGRENZUNG ZU DEN ANDEREN APPS
   ------------------------------
   /stundenplan/, /pw-viewer/ und /railnav/ sind eigenständige Apps mit
   eigenen Workern. Deren Scope ist enger und gewinnt für ihre Seiten. Damit
   es hier gar nicht erst zu Überschneidungen kommt, werden Anfragen in
   diese Ordner unten ausdrücklich durchgereicht.

   WICHTIG: `caches.delete()` arbeitet origin-weit. Beim Aufräumen werden
   deshalb nur die eigenen Caches (Präfix `uebersicht-`) und der bekannte
   Altbestand angefasst – niemals pauschal alles, sonst würden die anderen
   Apps bei jedem Deploy ihren Offline-Bestand verlieren.
   ═══════════════════════════════════════════════════════════════════════ */

const VERSION = 'v1';
const CACHE = `uebersicht-${VERSION}`;
const LEGACY = ['fst1-v1'];

const SHELL = [
  './',
  'index.html',
  'favicon.svg',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png'
];

// Eigenständige Apps mit eigenem Service Worker – hier nicht anfassen
const FOREIGN = ['/stundenplan/', '/pw-viewer/', '/railnav/'];

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
        .filter((key) => LEGACY.includes(key) || (key.startsWith('uebersicht-') && key !== CACHE))
        .map((key) => caches.delete(key).catch(() => {})));
    } catch (e) { /* Cache Storage nicht verfügbar – ignorieren */ }
    await self.clients.claim();
  })());
});

/* Erst Netz, dann Cache: Eine neue Fassung der Übersicht soll sofort
   ankommen und nicht hinter einem alten Cache hängen bleiben. */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;
  if (FOREIGN.some((prefix) => url.pathname.startsWith(prefix))) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    } catch (e) {
      const hit = await cache.match(request);
      if (hit) return hit;
      // Der Start aus der installierten App kommt als "./?home=1" herein –
      // die Suchparameter beim Nachschlagen ignorieren.
      if (request.mode === 'navigate') {
        const page = await cache.match('./', { ignoreSearch: true })
          || await cache.match('index.html');
        if (page) return page;
      }
      throw e;
    }
  })());
});
