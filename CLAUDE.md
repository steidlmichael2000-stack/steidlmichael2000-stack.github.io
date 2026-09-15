# steidlmichael2000-stack.github.io

Dachseite **MS Tools** über vier Apps. Alle liegen auf derselben Herkunft
`https://steidlmichael2000-stack.github.io/` — das ist für Service Worker,
Caches und Installationen der entscheidende Punkt.

| Seite | Pfad | Wo der Code liegt |
|---|---|---|
| MS Tools (Dachseite) | `/start/` | **hier im Repo**, Unterordner `start/` |
| Stundenplan FST 2 TB | `/stundenplan/` | **hier im Repo**, Unterordner `stundenplan/` |
| 3D-Aufnahmen | `/pw-viewer/` | eigenes Repo `pw-viewer` |
| TrackPilot | `/trackpilot/` | eigenes Repo `trackpilot` |
| Punktcodes | `/punktcodes/` | eigenes Repo `punktcodes` |

## Auf der Wurzel darf nie wieder eine App liegen

`/index.html` ist eine reine Weiterleitung ohne Manifest, `/sw.js` nur noch
ein Aufräumkommando, das sich selbst abmeldet. Das ist kein Schönheitsfehler,
sondern der Kern der Sache:

Ein `scope` muss die eigene `start_url` enthalten. Eine App auf `/` hat damit
zwingend den Scope `/` — und Chrome rechnet **jede** Seite, die im Scope einer
installierten App liegt, dieser App zu. Solange MS Tools auf der Wurzel lag,
bot Chrome auf `/punktcodes/`, `/trackpilot/` und `/pw-viewer/` deshalb keine
Installation mehr an, sondern nur noch „in MS Tools öffnen". Nur der
Stundenplan kam durch, weil dort schon eine Installation mit dem engeren
Scope `/stundenplan/` lag — bei mehreren passenden Scopes gewinnt der
längste.

Seit dem Umzug nach `/start/` reicht jeder Scope nur noch so weit wie seine
App. Wer die Dachseite wieder auf die Wurzel zieht, bricht damit die
Installierbarkeit aller anderen Apps.

## Jede App ist für sich installierbar

Jede hat ein eigenes Manifest mit eigenem `scope` und eigener `id`, wird also
als eigene App mit eigenem Icon installiert. Zwei Regeln dazu:

- **`id` niemals ändern.** Android erkennt eine installierte App daran. Ein
  anderer Wert gilt als neue App — die alte bleibt als Leiche auf dem
  Startbildschirm liegen. Deshalb steht `id` überall ausdrücklich im Manifest
  und wird nicht aus `start_url` abgeleitet.
- Installiert wird nur aus dem Browser heraus. Aus der installierten Übersicht
  heraus öffnen die Kacheln im selben Fenster (deren `scope` ist `/`), dort gibt
  es kein Chrome-Menü.

## Der Service Worker hier darf die Unter-Apps nicht anfassen

`sw.js` hat eine Liste `FOREIGN` mit den Pfaden der eigenständigen Apps; Anfragen
dorthin werden durchgereicht. **Kommt eine App dazu, muss ihr Pfad dort rein.**
Ebenso wichtig: beim Aufräumen nur Caches mit dem eigenen Präfix `uebersicht-`
löschen — `caches.delete()` arbeitet origin-weit und würde sonst den
Offline-Bestand der Nachbar-Apps mitnehmen.

## Icon-System

Zwei Ebenen, die zusammengehören:

- **Kachel-Icons** in `start/index.html`: Linienzeichnung, `viewBox="0 0 24 24"`,
  `stroke-width="1.8"`, `currentColor`, je Karte eine Akzentfarbe
  (`--accent` bis `--accent4`).
- **App-Icons** der einzelnen Apps: dieselbe Zeichnung, groß, auf dunklem Grund
  `#07080d`. Jede App hat dafür ein `icon.svg` als Vorlage und ein
  `make-icons.ps1`, das daraus die PNGs rasterisiert.

Wer ein Motiv ändert, ändert es an **beiden** Stellen — sonst zeigt die Kachel
etwas anderes als der Startbildschirm. Genau das war vor September 2026 der
Fall und wurde bewusst aufgeräumt.

MS Tools selbst führt kein Kachel-Motiv, sondern das MS-Monogramm in Orange:
`logo.svg` ist die Vorlage (und steckt auch im Seitenkopf), `favicon.svg`
dieselbe Zeichnung im quadratischen Rahmen, `make-icons.ps1` erzeugt die PNGs.

## Zwei Umbenennungen vom 15.09.2026

Die Dachseite hieß vorher **„Übersicht"**. Geändert wurden `name`, `short_name`,
Seitentitel und Überschrift — **nicht** aber `id` im Manifest: die bleibt
`/uebersicht`, weil Android die installierte App daran erkennt. Ein neuer Wert
hätte bei allen ein zweites Icon erzeugt. Das gilt auch über den Umzug nach
`/start/` hinweg: die `id` ist herkunftsbezogen und hängt nicht daran, wo das
Manifest liegt.

Beim Umzug entfallen sind die `shortcuts` im Manifest — Kurzbefehl-Ziele müssen
im Scope liegen, und die Apps liegen jetzt ausserhalb. Sie haben ohnehin eigene
Icons auf dem Startbildschirm.

## „Railnav" heißt seit dem 15.09.2026 „TrackPilot"

Grund war die Namenskollision mit dem kommerziellen **RaiLNav** von Geo++.
Der alte Name darf hier nirgends wieder auftauchen; Einzelheiten stehen in der
`CLAUDE.md` des Repos `trackpilot`.
