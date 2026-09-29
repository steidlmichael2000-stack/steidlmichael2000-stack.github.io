/* ═══════════════════════════════════════════════════════════════════════
   Service Worker · FST 2 TB Stundenplan
   ─────────────────────────────────────────────────────────────────────
   Scope ist /stundenplan/ — der Worker im Wurzelverzeichnis räumt nur
   den alten fst1-Cache ab und mischt sich hier nicht ein.

   Strategie:
   · eigene Dateien  →  network-first, Cache als Fallback
     (damit ein Deploy sofort ankommt und die App trotzdem offline läuft)
   · fremde Hosts    →  gar nicht angefasst (Schriften liegen unter fonts/)

   Bei einer neuen Version wartet der Worker, bis die App
   'skipWaiting' schickt — die zeigt vorher den Update-Hinweis an.

   CACHE bei jedem Deploy hochzählen ist nicht nötig (network-first),
   schadet aber nicht.
   ═══════════════════════════════════════════════════════════════════════ */

const CACHE = 'fst2tb-v4';

const CORE = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './plan.js',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './fonts/mstools.css',
  './fonts/jetbrains-mono-latin.woff2',
  './fonts/jetbrains-mono-latin-ext.woff2',
  './fonts/outfit-latin.woff2',
  './fonts/outfit-latin-ext.woff2',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .catch(() => { /* einzelne fehlende Datei darf die Installation nicht kippen */ })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // caches.keys() liefert die Caches der ganzen Herkunft, also auch die von
    // TrackPilot, Punktcodes & Co. — nur den eigenen Präfix aufräumen.
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('fst2tb-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (url.origin === self.location.origin) {
    // ── eigene Dateien: network-first ──
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        if (req.mode === 'navigate') {
          const shell = await cache.match('./index.html');
          if (shell) return shell;
        }
        return new Response('Offline und nicht im Cache.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    })());
  }
  // Fremde Hosts gehen unberührt ans Netz. Die Schriften liegen seit 29.09.2026
  // selbst unter fonts/, die App lädt nichts mehr von Google.
});
