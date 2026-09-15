/* ═══════════════════════════════════════════════════════════════════════
   Wurzel-Service-Worker  ·  nur noch Aufräumkommando
   ═══════════════════════════════════════════════════════════════════════

   Auf der Wurzel liegt seit September 2026 keine App mehr, sondern nur eine
   Weiterleitung nach /start/. Der Grund steht in index.html: ein Scope muss
   die eigene start_url enthalten, ein Worker auf "/" beanspruchte damit die
   ganze Domain und hat den vier Apps die eigene Installation verbaut.

   Auf den Geräten sind aber noch zwei ältere Worker mit Scope "/"
   registriert — der der Übersichtsseite und davor der der alten
   Stundenplan-PWA. Service Worker werden über ihre Skript-URL
   aktualisiert: Wer an einem von beiden hängt, bekommt beim nächsten
   Besuch diese Datei. Sie räumt deren Caches ab und meldet sich
   anschliessend selbst ab.

   Diese Datei darf erst verschwinden, wenn sicher ist, dass niemand mehr
   mit einer Registrierung von vor dem Umzug unterwegs ist. Sie wird von
   keiner Seite mehr registriert — sie erreicht nur noch, wer sie schon hat.

   Bewusst ohne `fetch`-Handler: hier soll nichts mehr ausgeliefert werden.

   WICHTIG: `caches.delete()` arbeitet origin-weit. Deshalb werden hier nur
   die namentlich bekannten Altbestände gelöscht — niemals pauschal alles
   und ausdrücklich nicht `mstools-v4` und aufwärts, denn das ist der
   laufende Cache von /start/.
   ═══════════════════════════════════════════════════════════════════════ */

const ABRAEUMEN = [
  'fst1-v1',     // alte Stundenplan-PWA auf der Wurzel
  'mstools-v3'   // letzte Fassung der Übersicht auf der Wurzel
];
const ALT_PRAEFIX = 'uebersicht-';   // deren Vorgänger, vor der Umbenennung

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys
        .filter((key) => ABRAEUMEN.includes(key) || key.startsWith(ALT_PRAEFIX))
        .map((key) => caches.delete(key).catch(() => {})));
    } catch (e) { /* Cache Storage nicht verfügbar – ignorieren */ }

    try { await self.registration.unregister(); } catch (e) { /* egal */ }

    // Offene Seiten einmal neu laden, damit sie ohne Worker weiterlaufen.
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url).catch(() => {}));
    } catch (e) { /* egal */ }
  })());
});
