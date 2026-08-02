/* ═══════════════════════════════════════════════════════════════════════
   Wurzel-Service-Worker  ·  KILL-SWITCH
   ═══════════════════════════════════════════════════════════════════════

   WARUM DIESE DATEI EXISTIERT
   ---------------------------
   Unter "/" lief früher die Stundenplan-App als PWA. Ihr Service Worker
   (Cache-Name `fst1-v1`) hatte eine cache-first-Fetch-Strategie und die
   alte `./index.html` im Cache. Ohne Gegenmaßnahme würden bestehende
   Besucher genau diese alte App weiterhin aus dem Cache serviert bekommen
   – die neue Übersichtsseite käme bei ihnen niemals an.

   Da Service Worker über ihre Skript-URL aktualisiert werden, ersetzt
   diese Datei den alten `fst1-v1`-Worker (gleicher Pfad `/sw.js`). Sie
   cached nichts, räumt einmalig auf und deregistriert sich anschließend
   selbst.

   WANN DARF DIE DATEI GELÖSCHT WERDEN?
   ------------------------------------
   Erst wenn davon auszugehen ist, dass niemand mehr den alten
   `fst1-v1`-Worker registriert hat (Faustregel: mehrere Monate nach dem
   Deploy bzw. wenn alle Homescreen-Installationen der alten Root-PWA
   einmal online waren). Wird sie zu früh entfernt, liefert `/sw.js` einen
   404 – dann bleibt der alte Worker bei diesen Nutzern aktiv und sie
   sehen dauerhaft die alte App.

   VERHÄLTNIS ZU /stundenplan/
   ---------------------------
   Der Service Worker unter `/stundenplan/` hat einen engeren Scope und
   gewinnt für alle Seiten in diesem Ordner – dieser Worker hier stört ihn
   nicht (er hat ohnehin keinen `fetch`-Handler). ABER: `caches.delete()`
   arbeitet origin-weit und löscht damit auch den Cache des
   Stundenplan-Workers mit. Für das einmalige Aufräumen ist das in Ordnung,
   weil der Stundenplan-Worker seinen Cache beim nächsten Online-Aufruf
   neu aufbaut. Damit dieses Löschen nicht bei jedem Besuch der Übersicht
   erneut passiert, registriert `index.html` diesen Worker nur dann, wenn
   im Root-Scope überhaupt noch eine Registrierung existiert.
   ═══════════════════════════════════════════════════════════════════════ */

// Sofort aktiv werden, nicht auf das Schließen alter Tabs warten.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1) Alle Caches dieses Origins löschen (siehe Hinweis im Kopf).
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key).catch(() => {})));
    } catch (e) { /* Cache Storage nicht verfügbar – ignorieren */ }

    // 2) Diese Registrierung entfernen: danach geht jeder Request wieder
    //    ungefiltert ins Netz.
    try {
      await self.registration.unregister();
    } catch (e) { /* ignorieren */ }

    // 3) Offene Fenster neu laden, damit sofort die neue Seite erscheint.
    //    Ohne `includeUncontrolled` liefert matchAll() nur Clients, die
    //    dieser Worker tatsächlich kontrolliert – also genau die Tabs, die
    //    zuvor am alten Worker hingen. Neubesucher werden dadurch nicht
    //    unnötig neu geladen (und es entsteht keine Reload-Schleife).
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      await Promise.all(clients.map((client) => {
        try {
          return client.navigate(client.url).catch(() => {});
        } catch (e) {
          return Promise.resolve();
        }
      }));
    } catch (e) { /* ignorieren */ }
  })());
});

/* Absichtlich KEIN 'fetch'-Handler:
   Solange dieser Worker noch aktiv ist, sollen alle Requests unverändert
   ans Netz gehen. Ein Worker ohne fetch-Handler ist für das Netzwerk
   transparent. */
