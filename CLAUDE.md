# steidlmichael2000-stack.github.io

Dachseite **MS Tools** über vier Apps. Alle liegen auf derselben Herkunft
`https://steidlmichael2000-stack.github.io/` — das ist für Service Worker,
Caches und Installationen der entscheidende Punkt.

| Kachel | Pfad | Wo der Code liegt |
|---|---|---|
| Stundenplan FST 2 TB | `/stundenplan/` | **hier im Repo**, Unterordner `stundenplan/` |
| 3D-Aufnahmen | `/pw-viewer/` | eigenes Repo `pw-viewer` |
| TrackPilot | `/trackpilot/` | eigenes Repo `trackpilot` |
| Punktcodes | `/punktcodes/` | eigenes Repo `punktcodes` |

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

- **Kachel-Icons** in `index.html`: Linienzeichnung, `viewBox="0 0 24 24"`,
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
hätte bei allen ein zweites Icon erzeugt. Der Cache-Präfix im Service Worker
heißt jetzt `mstools-`; `uebersicht-` wird beim Aktivieren mit aufgeräumt.

## „Railnav" heißt seit dem 15.09.2026 „TrackPilot"

Grund war die Namenskollision mit dem kommerziellen **RaiLNav** von Geo++.
Der alte Name darf hier nirgends wieder auftauchen; Einzelheiten stehen in der
`CLAUDE.md` des Repos `trackpilot`.
