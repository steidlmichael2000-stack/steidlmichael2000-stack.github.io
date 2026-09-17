/* ═══════════════════════════════════════════════════════════════════════
   PLANDATEN  ·  FST 2 TB und FST 2 HB  ·  Wintersemester 2026/27
   ─────────────────────────────────────────────────────────────────────
   Das ist die EINZIGE Datei, die du anfassen musst, wenn sich ein
   Stundenplan ändert. Die App liest alles hier heraus.

   Kurzanleitung:
   · Stunde fällt weg               →  drop: true  bei der Stunde
   · Fach dazu                      →  in SUBJECTS eintragen + in lessons
   · Abweichende Uhrzeit            →  timeOverrides der Klasse
   · Ferien / Feiertage             →  FREE_RANGES

   Zwei Klassen, ein Raster: Stundenraster, Fächerliste, Ferien und
   Termine gelten für beide. Unterschiedlich sind nur `lessons` und
   `timeOverrides` je Klasse.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Schule & Semester (für beide Klassen gleich) ─────────────────────── */
const KLASSE = {
  semester:     'Wintersemester 2026/27',
  schule:       'Josef-Greising-Schule Würzburg',
  schuleZusatz: 'Städtisches Gewerbliches Berufsbildungszentrum II',
  gueltigAb:    '2026-09-15',
  semesterEnde: '2027-02-19',   // Semesterwechsel laut Korrekturblatt
};

/* Die eigene Klasse. Sie steht beim Vergleich links, und Statuskarte,
   Erinnerungen und Kalenderexport beziehen sich auf sie, solange nicht
   ausdrücklich die andere Klasse angezeigt wird.                        */
const MEINE_KLASSE = 'tb';

/* ── Stundenraster (gilt für alle Tage, Abweichungen bei der Klasse) ─── */
const PLAN = [
  { type: 'hour',  nr: 1,  start: [8, 0],   end: [8, 45]  },
  { type: 'hour',  nr: 2,  start: [8, 45],  end: [9, 30]  },
  { type: 'pause',         start: [9, 30],  end: [9, 45]  },
  { type: 'hour',  nr: 3,  start: [9, 45],  end: [10, 30] },
  { type: 'hour',  nr: 4,  start: [10, 30], end: [11, 15] },
  { type: 'pause',         start: [11, 15], end: [11, 30] },
  { type: 'hour',  nr: 5,  start: [11, 30], end: [12, 15] },
  { type: 'hour',  nr: 6,  start: [12, 15], end: [13, 0]  },
  { type: 'hour',  nr: 7,  start: [13, 0],  end: [13, 45] },
  { type: 'hour',  nr: 8,  start: [13, 45], end: [14, 30] },
  { type: 'hour',  nr: 9,  start: [14, 30], end: [15, 15] },
  { type: 'pause',         start: [15, 15], end: [15, 30] },
  { type: 'hour',  nr: 10, start: [15, 30], end: [16, 15] },
  { type: 'hour',  nr: 11, start: [16, 15], end: [17, 0]  },
];

/* ── Fächer beider Klassen ─────────────────────────────────────────────
   dark / light = Fachfarbe im jeweiligen Theme
   abbr         = Kurzform in der Wochenansicht                         */
const SUBJECTS = {
  /* gemeinsam */
  mathe:        { name: 'Mathematik',                    abbr: 'Mathe',      dark: '#facc15', light: '#ca8a04' },
  englisch:     { name: 'Englisch',                      abbr: 'Englisch',   dark: '#c084fc', light: '#9333ea' },
  baurecht:     { name: 'Baurecht & Bauplanung',         abbr: 'B-Recht',    dark: '#fb923c', light: '#ea580c' },
  bauvertrag:   { name: 'Bauvertragsrecht',              abbr: 'B-Vertr.',   dark: '#fb7185', light: '#e11d48' },
  stahlbeton:   { name: 'Stahlbetonbau',                 abbr: 'StB-Bau',    dark: '#f87171', light: '#dc2626' },
  baubetrieb:   { name: 'Baubetrieb',                    abbr: 'Baubetr.',   dark: '#fbbf24', light: '#d97706' },
  arbeitsvorb:  { name: 'Arbeitsvorbereitung',           abbr: 'Arb.-Vorb.', dark: '#f472b6', light: '#db2777' },
  bwr:          { name: 'Betriebswirtschaftliches Rechnungswesen', abbr: 'BWR', dark: '#38bdf8', light: '#0284c7' },
  bwl:          { name: 'Betriebswirtschaftslehre',      abbr: 'BWL',        dark: '#818cf8', light: '#4f46e5' },
  baugeschichte:{ name: 'Baugeschichte',                 abbr: 'Baugesch.',  dark: '#e879f9', light: '#c026d3' },
  uvv:          { name: 'Unfallverhütungsvorschriften',  abbr: 'UVV',        dark: '#f0abfc', light: '#a21caf' },

  /* nur Tiefbau */
  vermessung:   { name: 'Vermessung',                    abbr: 'Vermess.',   dark: '#a3e635', light: '#65a30d' },
  tiefbaucad:   { name: 'Tiefbau CAD',                   abbr: 'Tiefb. CAD', dark: '#22d3ee', light: '#0891b2' },
  strbrueck:    { name: 'Straßen- und Brückenbau',       abbr: 'Str./Brb.',  dark: '#4ade80', light: '#16a34a' },
  brueckenbau:  { name: 'Brückenbau',                    abbr: 'Brückenb.',  dark: '#60a5fa', light: '#2563eb' },
  projekt:      { name: 'Projektarbeit',                 abbr: 'Projekt',    dark: '#a78bfa', light: '#7c3aed' },
  geotechnik:   { name: 'Geotechnik',                    abbr: 'Geotechn.',  dark: '#d6a15a', light: '#92400e' },
  wasserbau:    { name: 'Wasserbau',                     abbr: 'Wasserb.',   dark: '#2dd4bf', light: '#0d9488' },
  strunterhalt: { name: 'Straßenunterhalt',              abbr: 'Str.-Unt.',  dark: '#94a3b8', light: '#475569' },

  /* nur Hochbau */
  baukonstr:    { name: 'Baukonstruktion',               abbr: 'Baukonstr.', dark: '#5eead4', light: '#0f766e' },
  facility:     { name: 'Facility-Management',           abbr: 'Facility',   dark: '#bef264', light: '#4d7c0f' },
  tgebaeude:    { name: 'Technische Gebäudeausrüstung',  abbr: 'T.-Geb.',    dark: '#7dd3fc', light: '#0369a1' },
  hochbaucad:   { name: 'Hochbau CAD',                   abbr: 'Hochb. CAD', dark: '#67e8f9', light: '#0e7490' },
  bemessung:    { name: 'Bemessung von Tragwerken',      abbr: 'Bemessung',  dark: '#86efac', light: '#15803d' },
};

/* ── Die Klassen ───────────────────────────────────────────────────────
   lessons[tag][stunde] = { s: Fachschlüssel, r: Raum, t: Lehrkraft }
     tag: 0 = Mo, 1 = Di, 2 = Mi, 3 = Do, 4 = Fr
     drop: true  → entfällt (Standard: ausgeblendet)
     alt:        → geteilte Gruppe, zweites Fach

   timeOverrides[tag][stunde] = { start: [h, m], end: [h, m] }          */
const CLASSES = [

  /* ═══════════════ FST 2 TB · Tiefbau ═══════════════ */
  {
    id:     'tb',
    klasse: 'FST 2 TB',
    kurz:   'TB',
    zweig:  'Tiefbau',
    leiter: 'Matthias Finck',

    /* Donnerstag beginnt die 4. Stunde (Bauvertragsrecht) erst um 10:45. */
    timeOverrides: {
      3: { 4: { start: [10, 45] } },
    },

    lessons: [
      /* ── Montag ── */
      {
        1:  { s: 'mathe',      r: 'E 204', t: 'Drexler',        drop: true },
        2:  { s: 'mathe',      r: 'E 204', t: 'Drexler',        drop: true },
        3:  { s: 'englisch',   r: 'E 204', t: 'Finck' },
        4:  { s: 'englisch',   r: 'E 204', t: 'Finck' },
        5:  { s: 'englisch',   r: 'E 204', t: 'Finck' },
        6:  { s: 'baurecht',   r: 'E 204', t: 'Schmitt Sascha' },
        7:  { s: 'baurecht',   r: 'E 204', t: 'Schmitt Sascha' },
        9:  { s: 'stahlbeton', alt: 'vermessung', r: 'E 204 / E 102', t: 'Abraham / Jonas', drop: true },
        10: { s: 'stahlbeton', alt: 'vermessung', r: 'E 204 / E 103', t: 'Abraham / Jonas', drop: true },
        11: { s: 'stahlbeton', r: 'E 204', t: 'Abraham',        drop: true },
      },
      /* ── Dienstag ── */
      {
        1:  { s: 'tiefbaucad', r: 'E 102', t: 'Schwind' },
        2:  { s: 'tiefbaucad', r: 'E 102', t: 'Schwind' },
        3:  { s: 'strbrueck',  r: 'E 102', t: 'Schwind' },
        4:  { s: 'strbrueck',  r: 'E 102', t: 'Schwind' },
        5:  { s: 'projekt',    r: 'E 102', t: 'Schwind' },
        6:  { s: 'projekt',    r: 'E 102', t: 'Schwind' },
        7:  { s: 'projekt',    r: 'E 102', t: 'Schwind' },
        9:  { s: 'baubetrieb', r: 'E 204', t: 'Jonas' },
        10: { s: 'baubetrieb', r: 'E 204', t: 'Jonas' },
        11: { s: 'arbeitsvorb',r: 'E 204', t: 'Jonas' },
      },
      /* ── Mittwoch ── */
      {
        1:  { s: 'baurecht',   r: 'E 204', t: 'Schmitt Sascha' },
        2:  { s: 'baurecht',   r: 'E 204', t: 'Schmitt Sascha' },
        3:  { s: 'bwr',        r: 'E 204', t: 'Seiler' },
        4:  { s: 'bwr',        r: 'E 204', t: 'Seiler' },
        5:  { s: 'bwl',        r: 'E 204', t: 'Frank' },
        6:  { s: 'bwl',        r: 'E 204', t: 'Frank' },
        8:  { s: 'brueckenbau',r: 'E 102', t: 'Horn' },
        9:  { s: 'brueckenbau',r: 'E 102', t: 'Horn' },
        10: { s: 'brueckenbau',r: 'E 102', t: 'Horn' },
      },
      /* ── Donnerstag ── */
      {
        1:  { s: 'geotechnik', r: 'E 102', t: 'Johannsen' },
        2:  { s: 'geotechnik', r: 'E 102', t: 'Johannsen' },
        3:  { s: 'geotechnik', r: 'E 102', t: 'Johannsen' },
        4:  { s: 'bauvertrag', r: 'E 204', t: 'Schmachtenberger' },
        5:  { s: 'bauvertrag', r: 'E 204', t: 'Schmachtenberger' },
        6:  { s: 'bauvertrag', r: 'E 204', t: 'Schmachtenberger' },
        8:  { s: 'mathe',      r: 'E 204', t: 'Drexler',        drop: true },
        9:  { s: 'mathe',      r: 'E 204', t: 'Drexler',        drop: true },
        10: { s: 'baubetrieb', r: 'E 204', t: 'Jonas' },
        11: { s: 'baubetrieb', r: 'E 204', t: 'Jonas' },
      },
      /* ── Freitag ──
         Statt Baugeschichte (Goldbach) liegt hier UVV: die Lehrkraft für
         Baugeschichte ist verhindert. Kommt sie zurück, wieder auf
         { s: 'baugeschichte', r: 'E 204', t: 'Goldbach' } ändern.       */
      {
        1:  { s: 'uvv',           r: 'E 204', t: 'N. N.' },
        2:  { s: 'uvv',           r: 'E 204', t: 'N. N.' },
        3:  { s: 'wasserbau',     r: 'E 102', t: 'Drexler' },
        4:  { s: 'wasserbau',     r: 'E 102', t: 'Drexler' },
        5:  { s: 'wasserbau',     r: 'E 102', t: 'Drexler' },
        6:  { s: 'strunterhalt',  r: 'E 102', t: 'Metz' },
        7:  { s: 'strunterhalt',  r: 'E 102', t: 'Metz' },
      },
    ],
  },

  /* ═══════════════ FST 2 HB · Hochbau ═══════════════ */
  {
    id:     'hb',
    klasse: 'FST 2 HB',
    kurz:   'HB',
    zweig:  'Hochbau',
    leiter: 'Matthias Finck',

    /* Donnerstag: die 3. Stunde endet laut Plan schon um 10:15, die
       4. beginnt — wie beim Tiefbau — erst um 10:45.
       Freitag: die 4. Stunde beginnt um 10:45.                          */
    timeOverrides: {
      3: { 3: { end: [10, 15] }, 4: { start: [10, 45] } },
      4: { 4: { start: [10, 45] } },
    },

    lessons: [
      /* ── Montag ── */
      {
        1:  { s: 'mathe',      r: 'E 204', t: 'Drexler' },
        2:  { s: 'mathe',      r: 'E 204', t: 'Drexler' },
        3:  { s: 'englisch',   r: 'E 204', t: 'Finck' },
        4:  { s: 'englisch',   r: 'E 204', t: 'Finck' },
        5:  { s: 'englisch',   r: 'E 204', t: 'Finck' },
        6:  { s: 'baurecht',   r: 'E 204', t: 'Schmitt Sascha' },
        7:  { s: 'baurecht',   r: 'E 204', t: 'Schmitt Sascha' },
        /* auf dem Aushang durchgestrichen */
        9:  { s: 'stahlbeton', r: 'A 105', t: 'Abraham', drop: true },
        10: { s: 'stahlbeton', r: 'A 105', t: 'Abraham', drop: true },
        11: { s: 'stahlbeton', r: 'A 105', t: 'Abraham', drop: true },
      },
      /* ── Dienstag ── */
      {
        1:  { s: 'baukonstr',  r: 'E 204', t: 'Finck' },
        2:  { s: 'baukonstr',  r: 'E 204', t: 'Finck' },
        3:  { s: 'baukonstr',  r: 'E 204', t: 'Finck' },
        4:  { s: 'baukonstr',  r: 'E 204', t: 'Finck' },
        5:  { s: 'facility',   r: 'E 204', t: 'Campanozzi' },
        6:  { s: 'facility',   r: 'E 204', t: 'Campanozzi' },
        7:  { s: 'facility',   r: 'E 204', t: 'Campanozzi' },
        9:  { s: 'baubetrieb', r: 'E 204', t: 'Jonas' },
        10: { s: 'baubetrieb', r: 'E 204', t: 'Jonas' },
        11: { s: 'arbeitsvorb',r: 'E 204', t: 'Jonas' },
      },
      /* ── Mittwoch ── */
      {
        1:  { s: 'baurecht',   r: 'E 204', t: 'Schmitt Sascha' },
        2:  { s: 'baurecht',   r: 'E 204', t: 'Schmitt Sascha' },
        3:  { s: 'bwr',        r: 'E 204', t: 'Seiler' },
        4:  { s: 'bwr',        r: 'E 204', t: 'Seiler' },
        5:  { s: 'bwl',        r: 'E 204', t: 'Frank' },
        6:  { s: 'bwl',        r: 'E 204', t: 'Frank' },
        8:  { s: 'hochbaucad', r: 'E 204', t: 'Campanozzi' },
        9:  { s: 'hochbaucad', r: 'E 204', t: 'Campanozzi' },
      },
      /* ── Donnerstag ── */
      {
        1:  { s: 'tgebaeude',  r: 'E 204', t: 'Küsel' },
        2:  { s: 'tgebaeude',  r: 'E 204', t: 'Küsel' },
        3:  { s: 'tgebaeude',  r: 'E 204', t: 'Küsel' },
        4:  { s: 'bauvertrag', r: 'E 204', t: 'Schmachtenberger' },
        5:  { s: 'bauvertrag', r: 'E 204', t: 'Schmachtenberger' },
        6:  { s: 'bauvertrag', r: 'E 204', t: 'Schmachtenberger' },
        8:  { s: 'mathe',      r: 'E 204', t: 'Drexler' },
        9:  { s: 'mathe',      r: 'E 204', t: 'Drexler' },
        10: { s: 'baubetrieb', r: 'E 204', t: 'Jonas' },
        11: { s: 'baubetrieb', r: 'E 204', t: 'Jonas' },
      },
      /* ── Freitag ──
         Auch hier steht statt Baugeschichte (Goldbach) jetzt UVV.       */
      {
        1:  { s: 'uvv',        r: 'E 204', t: 'N. N.' },
        2:  { s: 'uvv',        r: 'E 204', t: 'N. N.' },
        4:  { s: 'bemessung',  r: 'E 204', t: 'Abraham' },
        5:  { s: 'bemessung',  r: 'E 204', t: 'Abraham' },
        6:  { s: 'bemessung',  r: 'E 204', t: 'Abraham' },
      },
    ],
  },
];

/* ── Unterrichtsfreie Tage ───────────────────────────────────
   [von, bis, Bezeichnung]  ·  bis ist inklusive
   Quelle: "Korrekturblatt zur Begrüßungsmappe 2026-27" der Schule.

   Achtung: Buß- und Bettag steht bewusst NICHT hier. An allgemein-
   bildenden Schulen in Bayern ist er unterrichtsfrei, an den Fachschulen
   laut Korrekturblatt aber nicht — SW 9 (16.–20.11.2026) ist dort eine
   volle Unterrichtswoche.                                              */
const FREE_RANGES = [
  ['2026-11-02', '2026-11-06', 'Allerheiligenferien'],
  ['2026-12-24', '2027-01-08', 'Weihnachtsferien'],
  ['2027-02-08', '2027-02-12', 'Frühjahrsferien'],
  /* ab hier Sommersemester — nur noch für die Kalenderansicht */
  ['2027-03-22', '2027-04-02', 'Osterferien'],
  ['2027-05-06', '2027-05-07', 'Christi Himmelfahrt & Brückentag'],
  ['2027-05-17', '2027-05-28', 'Pfingstferien'],
  ['2027-08-02', '2027-09-10', 'Sommerferien'],
];

/* ── Termine für die Monatsansicht ──────────────────────────────
   d    = Datum (bei mehrtägigen Terminen der erste Tag)
   bis  = optional, letzter Tag
   art  = 'nachschreiben' | 'pruefung' | 'info'  (steuert nur die Farbe)
   text = Bezeichnung
   zeit / raum = optional                                               */
const TERMINE = [
  /* Nachschreibtermine, jeweils Freitag 14:00 Uhr in B 101 */
  { d: '2026-11-13', art: 'nachschreiben', text: 'Nachschreibtermin', zeit: '14:00', raum: 'B 101' },
  { d: '2026-12-18', art: 'nachschreiben', text: 'Nachschreibtermin', zeit: '14:00', raum: 'B 101' },
  { d: '2027-01-29', art: 'nachschreiben', text: 'Nachschreibtermin', zeit: '14:00', raum: 'B 101' },
  { d: '2027-02-05', art: 'nachschreiben', text: 'Nachschreibtermin', zeit: '14:00', raum: 'B 101' },
  { d: '2027-03-12', art: 'nachschreiben', text: 'Nachschreibtermin', zeit: '14:00', raum: 'B 101' },
  { d: '2027-04-30', art: 'nachschreiben', text: 'Nachschreibtermin', zeit: '14:00', raum: 'B 101' },
  { d: '2027-06-04', art: 'nachschreiben', text: 'Nachschreibtermin', zeit: '14:00', raum: 'B 101' },
  { d: '2027-06-25', art: 'nachschreiben', text: 'Nachschreibtermin', zeit: '14:00', raum: 'B 101' },
  { d: '2027-07-23', art: 'nachschreiben', text: 'Nachschreibtermin', zeit: '14:00', raum: 'B 101' },

  /* Ablauf des Schuljahres */
  { d: '2027-02-19', art: 'info', text: 'Semesterwechsel' },
  { d: '2027-03-15', bis: '2027-03-19', art: 'info', text: 'Semesterfahrt' },
  { d: '2027-06-11', art: 'info', text: 'Letzter Unterrichtstag (BAföG)' },

  /* Abschlussprüfung — handschriftlich auf dem Korrekturblatt */
  { d: '2027-06-14', bis: '2027-06-18', art: 'pruefung', text: 'Schriftliche Prüfung' },
  { d: '2027-07-05', art: 'pruefung', text: 'Notenbekanntgabe' },
  { d: '2027-07-09', art: 'pruefung', text: 'Mündliche Prüfung' },
  { d: '2027-07-12', art: 'pruefung', text: 'Verabschiedung & Zeugnis' },
];
