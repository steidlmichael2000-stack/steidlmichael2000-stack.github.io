/* ═══════════════════════════════════════════════════════════════════════
   PLANDATEN  ·  FST 2 TB  ·  Wintersemester 2026/27
   ─────────────────────────────────────────────────────────────────────
   Das ist die EINZIGE Datei, die du anfassen musst, wenn sich der
   Stundenplan ändert. Die App liest alles hier heraus.

   Kurzanleitung:
   · Stunde fällt für dich weg      →  drop: true  bei der Stunde
   · Fach dazu                      →  in SUBJECTS eintragen + in LESSONS
   · Abweichende Uhrzeit            →  TIME_OVERRIDES
   · Ferien / Feiertage             →  FREE_RANGES
   ═══════════════════════════════════════════════════════════════════════ */

const KLASSE = {
  klasse:       'FST 2 TB',
  semester:     'Wintersemester 2026/27',
  schule:       'Josef-Greising-Schule Würzburg',
  schuleZusatz: 'Städtisches Gewerbliches Berufsbildungszentrum II',
  leiter:       'Matthias Finck',
  gueltigAb:    '2026-09-15',
  semesterEnde: '2027-02-05',
};

/* ── Stundenraster (gilt für alle Tage, Abweichungen unten) ───────────── */
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

/* ── Abweichende Uhrzeiten:  TIME_OVERRIDES[tag][stunde] ──────────────
   tag: 0 = Mo, 1 = Di, 2 = Mi, 3 = Do, 4 = Fr
   Donnerstag beginnt die 4. Stunde (Bauvertragsrecht) laut Plan erst
   um 10:45 statt 10:30.                                                */
const TIME_OVERRIDES = {
  3: { 4: { start: [10, 45] } },
};

/* ── Fächer ────────────────────────────────────────────────────────────
   dark / light = Fachfarbe im jeweiligen Theme
   abbr         = Kurzform in der Wochenansicht                         */
const SUBJECTS = {
  mathe:        { name: 'Mathematik',                    abbr: 'Mathe',      dark: '#facc15', light: '#ca8a04' },
  englisch:     { name: 'Englisch',                      abbr: 'Englisch',   dark: '#c084fc', light: '#9333ea' },
  baurecht:     { name: 'Baurecht & Bauplanung',         abbr: 'B-Recht',    dark: '#fb923c', light: '#ea580c' },
  bauvertrag:   { name: 'Bauvertragsrecht',              abbr: 'B-Vertr.',   dark: '#fb7185', light: '#e11d48' },
  stahlbeton:   { name: 'Stahlbetonbau',                 abbr: 'StB-Bau',    dark: '#f87171', light: '#dc2626' },
  vermessung:   { name: 'Vermessung',                    abbr: 'Vermess.',   dark: '#a3e635', light: '#65a30d' },
  tiefbaucad:   { name: 'Tiefbau CAD',                   abbr: 'Tiefb. CAD', dark: '#22d3ee', light: '#0891b2' },
  strbrueck:    { name: 'Straßen- und Brückenbau',       abbr: 'Str./Brb.',  dark: '#4ade80', light: '#16a34a' },
  brueckenbau:  { name: 'Brückenbau',                    abbr: 'Brückenb.',  dark: '#60a5fa', light: '#2563eb' },
  projekt:      { name: 'Projektarbeit',                 abbr: 'Projekt',    dark: '#a78bfa', light: '#7c3aed' },
  baubetrieb:   { name: 'Baubetrieb',                    abbr: 'Baubetr.',   dark: '#fbbf24', light: '#d97706' },
  arbeitsvorb:  { name: 'Arbeitsvorbereitung',           abbr: 'Arb.-Vorb.', dark: '#f472b6', light: '#db2777' },
  bwr:          { name: 'Betriebswirtschaftliches Rechnungswesen', abbr: 'BWR', dark: '#38bdf8', light: '#0284c7' },
  bwl:          { name: 'Betriebswirtschaftslehre',      abbr: 'BWL',        dark: '#818cf8', light: '#4f46e5' },
  geotechnik:   { name: 'Geotechnik',                    abbr: 'Geotechn.',  dark: '#d6a15a', light: '#92400e' },
  baugeschichte:{ name: 'Baugeschichte',                 abbr: 'Baugesch.',  dark: '#e879f9', light: '#c026d3' },
  wasserbau:    { name: 'Wasserbau',                     abbr: 'Wasserb.',   dark: '#2dd4bf', light: '#0d9488' },
  strunterhalt: { name: 'Straßenunterhalt',              abbr: 'Str.-Unt.',  dark: '#94a3b8', light: '#475569' },
};

/* ── Der Stundenplan ───────────────────────────────────────────────────
   LESSONS[tag][stunde] = { s: Fachschlüssel, r: Raum, t: Lehrkraft }
     drop: true  → fällt für dich weg (Standard: ausgeblendet)
     alt:        → geteilte Gruppe, zweites Fach                        */
const LESSONS = [
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
  /* ── Freitag ── */
  {
    1:  { s: 'baugeschichte', r: 'E 204', t: 'Goldbach' },
    2:  { s: 'baugeschichte', r: 'E 204', t: 'Goldbach' },
    3:  { s: 'wasserbau',     r: 'E 102', t: 'Drexler' },
    4:  { s: 'wasserbau',     r: 'E 102', t: 'Drexler' },
    5:  { s: 'wasserbau',     r: 'E 102', t: 'Drexler' },
    6:  { s: 'strunterhalt',  r: 'E 102', t: 'Metz' },
    7:  { s: 'strunterhalt',  r: 'E 102', t: 'Metz' },
  },
];

/* ── Unterrichtsfreie Tage (Bayern, Semesterzeitraum) ──────────────────
   [von, bis, Bezeichnung]  ·  bis ist inklusive
   Stand geprüft am 03.08.2026 gegen die offiziellen bayerischen Termine.

   ACHTUNG: Bayern hat zusätzlich 4 bewegliche Ferientage pro Schuljahr,
   die jede Schule selbst festlegt. Die stehen hier nicht drin, weil sie
   schulspezifisch sind — sobald du sie kennst, einfach als weitere Zeile
   ergänzen, z. B.  ['2026-12-23', '2026-12-23', 'beweglicher Ferientag'].
   Dasselbe gilt für Prüfungs- oder Projekttage ohne Unterricht.        */
const FREE_RANGES = [
  ['2026-11-02', '2026-11-06', 'Herbstferien'],
  ['2026-11-18', '2026-11-18', 'Buß- und Bettag'],   // in Bayern unterrichtsfrei
  ['2026-12-24', '2027-01-08', 'Weihnachtsferien'],
  /* nach Semesterende, nur noch für die Kalenderansicht relevant */
  ['2027-02-08', '2027-02-12', 'Frühjahrsferien'],
];
