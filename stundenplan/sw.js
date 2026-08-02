/* ═══════════════════════════════════════════════════════════════════════
   Service Worker · FST 2 TB Stundenplan
   ─────────────────────────────────────────────────────────────────────
   Scope ist /stundenplan/ — der Worker im Wurzelverzeichnis räumt nur
   den alten fst1-Cache ab und mischt sich hier nicht ein.

   Strategie:
   · eigene Dateien  →  network-first, Cache als Fallback
     (damit ein Deploy sofort ankommt und die App trotzdem offline läuft)
   · Google Fonts    →  cache-first (ändern sich praktisch nie)

   Bei einer neuen Version wartet der Worker, bis die App
   'skipWaiting' schickt — die zeigt vorher den Update-Hinweis an.

   CACHE bei jedem Deploy hochzählen ist nicht nötig (network-first),
   schadet aber nicht.
   ═══════════════════════════════════════════════════════════════════════ */

const CACHE = 'fst2tb-v1';

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
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
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
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === 'navigate') {
          const shell = await caches.match('./index.html');
          if (shell) return shell;
        }
        return new Response('Offline und nicht im Cache.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    })());
    return;
  }

  // ── Fremde Hosts (Google Fonts): cache-first ──
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      if (fresh && (fresh.ok || fresh.type === 'opaque')) {
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch {
      return new Response('', { status: 504 });
    }
  })());
});
