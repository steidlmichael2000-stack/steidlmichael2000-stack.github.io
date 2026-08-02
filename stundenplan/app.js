/* ═══════════════════════════════════════════════════════════════════════
   FST 2 TB · Stundenplan  —  Anwendungslogik
   ─────────────────────────────────────────────────────────────────────
   Die Plandaten stehen in plan.js. Hier passiert nur noch Darstellung
   und Zeitrechnung.
   ═══════════════════════════════════════════════════════════════════════ */
(() => {
'use strict';

/* ─── KONSTANTEN ──────────────────────────────────────────────────── */
const DAY_FULL  = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
const DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
const CAL_HEAD  = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];   // Montag zuerst (Kalender)
const WD_SHORT  = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];   // nach Date.getDay()
const MONTHS    = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                   'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const VIEWS   = ['week', 'day', 'month', 'subj'];
const ACCENTS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#ef4444', '#06b6d4'];
const STORE   = 'fst2tb.';

const $  = id => document.getElementById(id);
const mk = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };

/* ─── EINSTELLUNGEN ───────────────────────────────────────────────── */
const DEFAULTS = {
  theme: '',            // '' = Systemvorgabe folgen
  accent: '#f59e0b',
  showAll: false,       // kompletten Klassenplan zeigen
  showFree: true,
  compact: false,
  mergeBlocks: true,
  showFerien: true,
  startView: 'auto',
  notif: false,
  notifMinutes: 10,
  cdLabel: '',
  cdDate: '',
};

let settings = { ...DEFAULTS };
let notes = {};

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE + 'settings');
    if (raw) settings = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* kaputter Eintrag → Standardwerte */ }
  try {
    notes = JSON.parse(localStorage.getItem(STORE + 'notes') || '{}') || {};
  } catch { notes = {}; }
}
function saveSettings() {
  try { localStorage.setItem(STORE + 'settings', JSON.stringify(settings)); } catch {}
}
function saveNotes() {
  try { localStorage.setItem(STORE + 'notes', JSON.stringify(notes)); } catch {}
}

/* ─── KLEINE HELFER ───────────────────────────────────────────────── */
const pad     = n => String(n).padStart(2, '0');
const fmt     = ([h, m]) => `${pad(h)}:${pad(m)}`;
const toMin   = ([h, m]) => h * 60 + m;
const fmtMin  = t => `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
const plural  = (n, one, many) => (n === 1 ? one : many);

function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseKey(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function midnight(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d, n) { const x = midnight(d); x.setDate(x.getDate() + n); return x; }
function dayDiff(a, b) { return Math.round((midnight(b) - midnight(a)) / 86400000); }

function fmtCountdown(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
function fmtDate(d) {
  return `${WD_SHORT[d.getDay()]}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}
/** nur der Datumsteil, ohne Wochentag */
function fmtDateShort(d) {
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/* ─── SEMESTER & FREIE TAGE ───────────────────────────────────────── */
const SEM_START = KLASSE.gueltigAb;
const SEM_END   = KLASSE.semesterEnde;

const freeMap = new Map();
FREE_RANGES.forEach(([from, to, label]) => {
  let cur = parseKey(from);
  const end = parseKey(to);
  while (cur <= end) { freeMap.set(dateKey(cur), label); cur = addDays(cur, 1); }
});

/** Was für ein Tag ist das?  school | free | weekend | before | after */
function dayInfo(date) {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return { kind: 'weekend', label: 'Wochenende' };
  const key = dateKey(date);
  if (key < SEM_START) return { kind: 'before', label: 'vor Semesterbeginn' };
  if (key > SEM_END)   return { kind: 'after',  label: 'nach Semesterende' };
  const free = freeMap.get(key);
  if (free) return { kind: 'free', label: free };
  return { kind: 'school', label: 'Schultag' };
}

/* ─── FÄCHER ──────────────────────────────────────────────────────── */
const FALLBACK_SUBJ = { name: 'Unbekannt', abbr: '?', dark: '#94a3b8', light: '#475569' };
const subjOf = key => SUBJECTS[key] || FALLBACK_SUBJ;

function isLight() { return document.documentElement.dataset.theme === 'light'; }
function subjColor(key) { const s = subjOf(key); return isLight() ? s.light : s.dark; }

function lessonTitle(l) {
  const a = subjOf(l.s).name;
  return l.alt ? `${a} / ${subjOf(l.alt).name}` : a;
}
function lessonAbbr(l) {
  const a = subjOf(l.s).abbr;
  return l.alt ? `${a} / ${subjOf(l.alt).abbr}` : a;
}

/* ─── ZEITEN (inkl. Abweichungen) ─────────────────────────────────── */
function timesOf(dayIdx, planIdx) {
  const p = PLAN[planIdx];
  const ov = p.type === 'hour' && TIME_OVERRIDES[dayIdx] && TIME_OVERRIDES[dayIdx][p.nr];
  if (!ov) return { start: p.start, end: p.end, shifted: false };
  return { start: ov.start || p.start, end: ov.end || p.end, shifted: true };
}

/* ─── TAGESMODELL ─────────────────────────────────────────────────────
   Baut aus PLAN + LESSONS die tatsächliche Abfolge eines Wochentags:
   Stunden, Pausen, Freistunden, Mittagspause und echte Lücken.        */
let modelCache = new Map();
const invalidateModels = () => { modelCache = new Map(); };

function dayModel(dayIdx) {
  const ck = `${dayIdx}|${settings.showAll ? 1 : 0}`;
  if (modelCache.has(ck)) return modelCache.get(ck);

  const lessons = LESSONS[dayIdx] || {};
  const visible = nr => {
    const l = lessons[nr];
    if (!l) return null;
    if (l.drop && !settings.showAll) return null;
    return l;
  };

  let firstIdx = -1, lastIdx = -1;
  PLAN.forEach((p, i) => {
    if (p.type === 'hour' && visible(p.nr)) { if (firstIdx < 0) firstIdx = i; lastIdx = i; }
  });

  const model = {
    dayIdx, segs: [], hours: 0, mine: 0, empty: firstIdx < 0,
    firstMin: 0, lastMin: 0, mineFirstMin: 0, mineLastMin: 0,
  };
  if (model.empty) { modelCache.set(ck, model); return model; }

  const raw = [];
  for (let i = firstIdx; i <= lastIdx; i++) {
    const p = PLAN[i];
    const t = timesOf(dayIdx, i);
    const sMin = toMin(t.start), eMin = toMin(t.end);
    if (p.type === 'pause') { raw.push({ kind: 'pause', planIdx: i, sMin, eMin }); continue; }
    const l = visible(p.nr);
    if (l) raw.push({ kind: 'lesson', planIdx: i, nr: p.nr, sMin, eMin, lesson: l, dropped: !!l.drop, shifted: t.shifted });
    else   raw.push({ kind: 'free',   planIdx: i, nr: p.nr, sMin, eMin });
  }

  // Die erste freie Stunde rund um die Mittagszeit ist die Mittagspause
  const lunch = raw.find(s => s.kind === 'free' && s.sMin >= 12 * 60 && s.sMin < 14 * 60 + 30);
  if (lunch) lunch.kind = 'lunch';

  // Echte Lücken sichtbar machen (Do: 3. Std endet 10:30, 4. Std beginnt 10:45)
  raw.forEach((s, i) => {
    if (i > 0 && s.sMin > raw[i - 1].eMin) {
      model.segs.push({ kind: 'gap', sMin: raw[i - 1].eMin, eMin: s.sMin });
    }
    model.segs.push(s);
  });

  const les = model.segs.filter(s => s.kind === 'lesson');
  const own = les.filter(s => !s.dropped);
  model.hours = les.length;
  model.mine  = own.length;
  model.firstMin = les[0].sMin;
  model.lastMin  = les[les.length - 1].eMin;
  if (own.length) { model.mineFirstMin = own[0].sMin; model.mineLastMin = own[own.length - 1].eMin; }

  modelCache.set(ck, model);
  return model;
}

/* ─── BLÖCKE ──────────────────────────────────────────────────────────
   Fasst zeitlich direkt aneinandergrenzende Stunden desselben Fachs
   zusammen. Über eine Pause hinweg wird NICHT zusammengefasst, damit
   die Pause sichtbar bleibt.                                          */
function sameLesson(a, b) {
  if (!a || !b || !a.lesson || !b.lesson) return false;
  return a.lesson.s === b.lesson.s
      && (a.lesson.alt || '') === (b.lesson.alt || '')
      && a.lesson.r === b.lesson.r
      && a.lesson.t === b.lesson.t
      && a.dropped === b.dropped;
}

function groupBlocks(segs) {
  const out = [];
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.kind !== 'lesson' || !settings.mergeBlocks) {
      out.push({ ...s, span: 1, endMin: s.eMin, lastNr: s.nr });
      continue;
    }
    let j = i;
    while (j + 1 < segs.length && segs[j + 1].kind === 'lesson'
           && segs[j + 1].sMin === segs[j].eMin && sameLesson(s, segs[j + 1])) j++;
    out.push({ ...s, span: j - i + 1, endMin: segs[j].eMin, lastNr: segs[j].nr });
    i = j;
  }
  return out;
}

/** Für Kalenderexport & Statusanzeige: ein Fachblock auch über Pausen hinweg. */
function subjectRuns(segs) {
  const les = segs.filter(s => s.kind === 'lesson');
  const out = [];
  let i = 0;
  while (i < les.length) {
    let j = i;
    while (j + 1 < les.length && sameLesson(les[i], les[j + 1])
           && les[j + 1].planIdx <= les[j].planIdx + 2) j++;
    out.push({ ...les[i], endMin: les[j].eMin, span: j - i + 1, lastNr: les[j].nr });
    i = j + 1;
  }
  return out;
}

/* ─── ZUSTAND ─────────────────────────────────────────────────────── */
let currentView = 'week';
let dayIdx = 0;
let dayPinned = false;   // hat der Nutzer den Tag selbst gewählt?
let calYear = 0, calMonth = 0;
let lastMinute = -1;
let switching = false;
const notified = new Set();

/* ═══════════════════════════════════════════════════════════════════
   WOCHENANSICHT
   ═══════════════════════════════════════════════════════════════════ */
function buildWeek() {
  const body = $('plan-body');
  body.textContent = '';

  const days = [0, 1, 2, 3, 4].map(d => {
    const model = dayModel(d);
    const blocks = groupBlocks(model.segs.filter(s => s.kind !== 'gap'));
    const map = new Map(), skip = new Set();
    blocks.forEach(b => {
      if (b.planIdx == null) return;
      map.set(b.planIdx, b);
      for (let k = 1; k < b.span; k++) skip.add(b.planIdx + k);
    });
    return { map, skip, model };
  });

  PLAN.forEach((p, i) => {
    const tr = mk('tr');

    if (p.type === 'pause') {
      tr.appendChild(mk('td', 'pause-cell pause-time'));
    } else {
      const tc = mk('td', 'time-cell');
      const nr = mk('span', 'hour-nr');
      nr.textContent = `${p.nr}.`;
      tc.appendChild(nr);
      tc.appendChild(document.createTextNode(fmt(p.start)));
      tc.appendChild(mk('br'));
      tc.appendChild(document.createTextNode(fmt(p.end)));
      tr.appendChild(tc);
    }

    for (let d = 0; d < 5; d++) {
      const { map, skip } = days[d];
      if (skip.has(i)) continue;
      const seg = map.get(i);
      let td;

      if (p.type === 'pause') {
        td = mk('td', 'pause-cell');
      } else if (!seg) {
        td = mk('td', 'free-cell');
      } else if (seg.kind === 'lunch') {
        td = mk('td', 'lunch-cell');
        td.textContent = 'Mittag';
      } else if (seg.kind === 'free') {
        td = mk('td', 'free-cell');
        if (settings.showFree) {
          const s = mk('span', 'free-mark');
          s.textContent = 'frei';
          td.appendChild(s);
        }
      } else {
        td = mk('td', 'lesson-cell');
        td.rowSpan = seg.span;
        td.style.setProperty('--sc', subjColor(seg.lesson.s));
        if (seg.dropped) td.classList.add('is-dropped');

        const tag = mk('span', 'subj-tag');
        tag.textContent = lessonAbbr(seg.lesson);
        td.appendChild(tag);

        // Raum und Lehrkraft getrennt, damit auf dem Handy nur der Raum bleibt
        const info = mk('span', 'info');
        const room = mk('span', 'i-room');
        room.textContent = seg.lesson.r;
        const teacher = mk('span', 'i-teacher');
        teacher.textContent = seg.lesson.t;
        info.appendChild(room);
        info.appendChild(teacher);
        td.appendChild(info);

        if (seg.shifted) {
          const badge = mk('span', 'time-badge');
          badge.textContent = `ab ${fmtMin(seg.sMin)}`;
          td.appendChild(badge);
        }

        const parts = [lessonTitle(seg.lesson), seg.lesson.t, seg.lesson.r];
        if (seg.span > 1) parts.push(`${seg.span} ${plural(seg.span, 'Stunde', 'Stunden')}`);
        if (seg.dropped) parts.push('entfällt für dich');
        td.dataset.tip = parts.join(' · ');
      }

      if (seg) { td.dataset.smin = seg.sMin; td.dataset.emin = seg.endMin || seg.eMin; }
      td.dataset.day = d;
      tr.appendChild(td);
    }

    body.appendChild(tr);
  });
}

/** Markiert die heutige Spalte und die laufende Stunde. */
function highlightWeek(todayIdx, nowMin) {
  const body = $('plan-body');
  body.querySelectorAll('.today-col, .active').forEach(td => td.classList.remove('today-col', 'active'));
  for (let d = 0; d < 5; d++) $(`head-${d}`).classList.toggle('today-head', d === todayIdx);
  if (todayIdx < 0 || todayIdx > 4) return;

  body.querySelectorAll(`td[data-day="${todayIdx}"]`).forEach(td => {
    td.classList.add('today-col');
    const s = Number(td.dataset.smin), e = Number(td.dataset.emin);
    if (nowMin != null && !Number.isNaN(s) && nowMin >= s && nowMin < e) td.classList.add('active');
  });
}

/* ═══════════════════════════════════════════════════════════════════
   TAGESANSICHT
   ═══════════════════════════════════════════════════════════════════ */
function buildDayTabs() {
  const box = $('day-tabs');
  box.textContent = '';
  const today = todayIdx();
  DAY_SHORT.forEach((name, i) => {
    const b = mk('button', 'day-tab');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.textContent = name;
    if (i === today) b.classList.add('is-today');
    if (i === dayIdx) { b.classList.add('active'); b.setAttribute('aria-selected', 'true'); }
    else b.setAttribute('aria-selected', 'false');
    b.addEventListener('click', () => { dayIdx = i; dayPinned = true; buildDayTabs(); buildDay(); });
    box.appendChild(b);
  });
}

function buildDay() {
  const model = dayModel(dayIdx);
  const head = $('day-view-header');
  const tl = $('day-timeline');
  head.textContent = '';
  tl.textContent = '';
  tl.style.removeProperty('--tl-progress');
  tl.style.removeProperty('--tl-color');

  const title = mk('span', 'dv-title');
  title.textContent = DAY_FULL[dayIdx] + (dayIdx === todayIdx() ? ' · heute' : '');
  head.appendChild(title);

  if (model.empty || !model.mine) {
    const chips = mk('span', 'dv-chips');
    const c = mk('span', 'dv-chip');
    c.textContent = 'frei';
    chips.appendChild(c);
    head.appendChild(chips);
    const empty = mk('div', 'day-view-empty');
    empty.textContent = settings.showAll
      ? 'An diesem Tag ist kein Unterricht eingetragen.'
      : 'Für dich ist an diesem Tag kein Unterricht.';
    tl.appendChild(empty);
    return;
  }

  const chips = mk('span', 'dv-chips');
  const cHours = mk('span', 'dv-chip');
  cHours.textContent = `${model.mine} Std · ab ${fmtMin(model.mineFirstMin)}`;
  const cEnd = mk('span', 'dv-chip dv-chip-end');
  cEnd.textContent = `Schluss ${fmtMin(model.mineLastMin)}`;
  chips.appendChild(cHours);
  chips.appendChild(cEnd);
  head.appendChild(chips);

  const blocks = groupBlocks(model.segs);
  // letzter eigener Unterrichtsblock — danach kommt die Schlussmarke
  let lastOwn = null;
  blocks.forEach(b => { if (b.kind === 'lesson' && !b.dropped) lastOwn = b; });
  let prevRoom = null;

  blocks.forEach(b => {
    const slot = mk('div', 'dt-slot');
    slot.dataset.smin = b.sMin;
    slot.dataset.emin = b.endMin;

    const time = mk('div', 'dt-time');
    const content = mk('div', 'dt-content');
    const dot = mk('span', 'dt-dot');
    const card = mk('div', 'dt-card');

    if (b.kind === 'pause' || b.kind === 'gap') {
      slot.classList.add('is-pause');
      time.textContent = fmtMin(b.sMin);
      card.classList.add('pause-card');
      card.textContent = `Pause · ${b.eMin - b.sMin} Min`;
    } else if (b.kind === 'lunch') {
      time.textContent = fmtMin(b.sMin);
      card.classList.add('lunch');
      const top = mk('div', 'dt-card-top');
      const tag = mk('span');
      tag.style.fontWeight = '700';
      tag.style.fontSize = '0.82rem';
      tag.textContent = 'Mittagspause';
      const t = mk('span', 'dt-card-time');
      t.textContent = `${fmtMin(b.sMin)}–${fmtMin(b.endMin)}`;
      top.appendChild(tag); top.appendChild(t);
      card.appendChild(top);
    } else if (b.kind === 'free') {
      time.textContent = fmtMin(b.sMin);
      card.classList.add('free');
      const top = mk('div', 'dt-card-top');
      const tag = mk('span');
      tag.style.fontWeight = '600';
      tag.style.fontSize = '0.8rem';
      tag.style.color = 'var(--muted)';
      tag.textContent = `Freistunde · ${b.nr}. Stunde`;
      const t = mk('span', 'dt-card-time');
      t.textContent = `${fmtMin(b.sMin)}–${fmtMin(b.endMin)}`;
      top.appendChild(tag); top.appendChild(t);
      card.appendChild(top);
    } else {
      const color = subjColor(b.lesson.s);
      slot.style.setProperty('--sc', color);
      if (b.dropped) slot.classList.add('is-dropped');

      const nr = mk('span', 'dt-hour-nr');
      nr.textContent = b.span > 1 ? `${b.nr}.–${b.lastNr}.` : `${b.nr}.`;
      time.appendChild(nr);
      time.appendChild(document.createTextNode(fmtMin(b.sMin)));

      card.classList.add('lesson');
      const top = mk('div', 'dt-card-top');
      const tag = mk('span', 'subj-tag');
      tag.style.setProperty('--sc', color);
      tag.textContent = lessonTitle(b.lesson);
      top.appendChild(tag);
      if (b.dropped) {
        const dm = mk('span', 'dt-drop-mark');
        dm.textContent = 'entfällt';
        top.appendChild(dm);
      }
      const t = mk('span', 'dt-card-time');
      t.textContent = `${fmtMin(b.sMin)}–${fmtMin(b.endMin)}`;
      top.appendChild(t);
      card.appendChild(top);

      const info = mk('div', 'dt-card-info');
      const bits = [b.lesson.t, b.lesson.r];
      if (b.span > 1) bits.push(`${b.span} ${plural(b.span, 'Stunde', 'Stunden')}`);
      info.textContent = bits.join(' · ');
      card.appendChild(info);

      if (b.shifted) {
        const hint = mk('div', 'dt-card-hint');
        hint.textContent = `Beginnt erst um ${fmtMin(b.sMin)}`;
        card.appendChild(hint);
      }
      if (!b.dropped && prevRoom && prevRoom !== b.lesson.r) {
        const hint = mk('div', 'dt-card-hint');
        hint.textContent = `Raumwechsel → ${b.lesson.r}`;
        card.appendChild(hint);
      }
      const note = notes[b.lesson.s];
      if (note) {
        const n = mk('div', 'dt-card-note');
        n.textContent = note;
        card.appendChild(n);
      }
      if (!b.dropped) prevRoom = b.lesson.r;
    }

    content.appendChild(card);
    slot.appendChild(time);
    slot.appendChild(dot);
    slot.appendChild(content);
    tl.appendChild(slot);

    // Direkt nach der letzten eigenen Stunde: unmissverständliche Schlussmarke
    if (b === lastOwn) tl.appendChild(buildEndSlot(model, b));
  });

  trimTimelineTail();
  updateDayMarker();
}

/** Lässt die Zeitachse genau am Schlusspunkt enden statt darunter auszulaufen. */
function trimTimelineTail() {
  const tl = $('day-timeline');
  const end = tl.querySelector('.dt-slot.is-end');
  if (!end || !end.offsetHeight) { tl.style.removeProperty('--tl-tail'); return; }
  const DOT_CENTER = 18;   // Mitte des Schlusspunkts vom oberen Slotrand
  tl.style.setProperty('--tl-tail', `${Math.max(0, end.offsetHeight - DOT_CENTER)}px`);
}

/** Abschlusszeile der Timeline: „Schulschluss · 13:45“ */
function buildEndSlot(model, lastBlock) {
  const slot = mk('div', 'dt-slot is-end');
  slot.dataset.smin = lastBlock.endMin;
  slot.dataset.emin = lastBlock.endMin;

  const time = mk('div', 'dt-time');
  time.textContent = fmtMin(model.mineLastMin);
  const dot = mk('span', 'dt-dot dot-end');
  const content = mk('div', 'dt-content');
  const card = mk('div', 'dt-card end-card');

  const label = mk('span', 'end-label');
  label.textContent = 'Schulschluss';
  const clock = mk('span', 'end-time');
  clock.textContent = `${fmtMin(model.mineLastMin)} Uhr`;
  card.appendChild(label);
  card.appendChild(clock);

  if (model.hours > model.mine && model.lastMin > model.mineLastMin) {
    const note = mk('span', 'end-note');
    note.textContent = `Klasse bis ${fmtMin(model.lastMin)}`;
    card.appendChild(note);
  }

  content.appendChild(card);
  slot.appendChild(time);
  slot.appendChild(dot);
  slot.appendChild(content);
  return slot;
}

/** Fortschrittslinie + leuchtender Punkt in der Tagesansicht. */
function updateDayMarker() {
  const tl = $('day-timeline');
  const old = tl.querySelector('.tl-marker');
  if (old) old.remove();
  tl.style.removeProperty('--tl-progress');

  if (dayIdx !== todayIdx()) return;
  const now = new Date();
  if (dayInfo(now).kind !== 'school') return;

  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  // Die Schlussmarke ist kein Zeitabschnitt — sie bleibt außen vor
  const slots = [...tl.querySelectorAll('.dt-slot:not(.is-end)')];
  if (!slots.length) return;

  let top = null, color = 'var(--accent)';
  for (const slot of slots) {
    const s = Number(slot.dataset.smin), e = Number(slot.dataset.emin);
    if (nowMin >= s && nowMin < e) {
      const frac = (nowMin - s) / (e - s);
      top = slot.offsetTop + frac * slot.offsetHeight;
      color = slot.style.getPropertyValue('--sc') || 'var(--accent)';
      break;
    }
    if (nowMin >= e) top = slot.offsetTop + slot.offsetHeight;
  }
  if (top == null) return;

  tl.style.setProperty('--tl-progress', `${top}px`);
  tl.style.setProperty('--tl-color', color);
  const marker = mk('span', 'tl-marker');
  marker.style.top = `${top - 6}px`;
  tl.appendChild(marker);

  // Vergangene und laufende Slots kennzeichnen
  slots.forEach(slot => {
    const s = Number(slot.dataset.smin), e = Number(slot.dataset.emin);
    slot.classList.toggle('is-past', nowMin >= e);
    slot.classList.toggle('is-active', nowMin >= s && nowMin < e);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   MONATSANSICHT
   ═══════════════════════════════════════════════════════════════════ */
function isoWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNr = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dayNr + 3);
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  const fDayNr = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - fDayNr + 3);
  return 1 + Math.round((d - firstThursday) / (7 * 86400000));
}

function renderCalendar() {
  $('cal-title').textContent = `${MONTHS[calMonth]} ${calYear}`;
  const grid = $('cal-grid');
  grid.textContent = '';

  grid.appendChild(mk('div', 'cal-kw'));
  CAL_HEAD.forEach(n => {
    const h = mk('div', 'cal-day-head');
    h.textContent = n;
    grid.appendChild(h);
  });

  const first = new Date(calYear, calMonth, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const todayKey = dateKey(new Date());

  let cursor = addDays(first, -lead);
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7;

  for (let i = 0; i < cells; i++) {
    if (i % 7 === 0) {
      const kw = mk('div', 'cal-kw');
      kw.textContent = isoWeek(cursor);
      grid.appendChild(kw);
    }

    const cell = mk('div', 'cal-day');
    if (cursor.getMonth() !== calMonth) {
      cell.classList.add('empty');
      grid.appendChild(cell);
      cursor = addDays(cursor, 1);
      continue;
    }

    const num = mk('span');
    num.textContent = cursor.getDate();
    cell.appendChild(num);

    const info = dayInfo(cursor);
    if (info.kind === 'weekend') {
      cell.classList.add('weekend');
    } else if (info.kind === 'free') {
      cell.classList.add('ferien');
      cell.title = info.label;
    } else if (info.kind === 'school') {
      cell.classList.add('school');
      const wd = cursor.getDay() - 1;
      const m = dayModel(wd);
      const hours = mk('span', 'cal-hours');
      hours.textContent = m.mine ? `${m.mine} Std` : 'frei';
      cell.appendChild(hours);
      cell.title = `${DAY_FULL[wd]} · ${m.mine} ${plural(m.mine, 'Stunde', 'Stunden')}`;
      cell.tabIndex = 0;
      const jump = () => { dayIdx = wd; dayPinned = true; switchView('day'); };
      cell.addEventListener('click', jump);
      cell.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jump(); } });
    } else {
      cell.classList.add('outside');
      cell.title = info.label;
    }
    if (dateKey(cursor) === todayKey) cell.classList.add('today');

    grid.appendChild(cell);
    cursor = addDays(cursor, 1);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   FÄCHERÜBERSICHT
   ═══════════════════════════════════════════════════════════════════ */
function buildSubjects() {
  const box = $('view-subj');
  box.textContent = '';

  const stats = new Map();
  LESSONS.forEach((day, d) => {
    Object.keys(day).forEach(nr => {
      const l = day[nr];
      const key = l.s + (l.alt ? '/' + l.alt : '');
      if (!stats.has(key)) {
        stats.set(key, { lesson: l, hours: 0, days: new Set(), rooms: new Set(), teachers: new Set(), dropped: !!l.drop });
      }
      const e = stats.get(key);
      e.hours++;
      e.days.add(d);
      e.rooms.add(l.r);
      e.teachers.add(l.t);
    });
  });

  const rows = [...stats.values()].sort((a, b) =>
    (a.dropped - b.dropped) || (b.hours - a.hours) || lessonTitle(a.lesson).localeCompare(lessonTitle(b.lesson), 'de'));

  const mine = rows.filter(r => !r.dropped);
  const gone = rows.filter(r => r.dropped);
  const sumMine = mine.reduce((s, r) => s + r.hours, 0);
  const sumGone = gone.reduce((s, r) => s + r.hours, 0);

  const sum = mk('div', 'subj-summary');
  sum.innerHTML =
    `<span><b>${sumMine}</b> Wochenstunden für dich</span>` +
    `<span><b>${mine.length}</b> Fächer</span>` +
    (sumGone ? `<span><b>${sumGone}</b> Stunden entfallen</span>` : '') +
    `<span>Klasse gesamt: <b>${sumMine + sumGone}</b></span>`;
  box.appendChild(sum);

  rows.forEach(r => {
    const row = mk('div', 'subj-row');
    row.style.setProperty('--sc', subjColor(r.lesson.s));
    if (r.dropped) row.classList.add('is-dropped');

    const main = mk('div', 'subj-row-main');
    const name = mk('div', 'subj-row-name');
    name.textContent = lessonTitle(r.lesson);
    main.appendChild(name);

    const meta = mk('div', 'subj-row-meta');
    const days = [...r.days].sort().map(d => DAY_SHORT[d]).join(', ');
    meta.textContent = `${days} · ${[...r.teachers].join(', ')} · ${[...r.rooms].join(', ')}` +
      (r.dropped ? ' · entfällt für dich' : '');
    main.appendChild(meta);
    row.appendChild(main);

    const h = mk('span', 'subj-row-hours');
    h.textContent = `${r.hours} Std`;
    row.appendChild(h);

    box.appendChild(row);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   STATUS-KARTE
   ═══════════════════════════════════════════════════════════════════ */
function todayIdx() {
  const d = new Date().getDay();
  return d === 0 || d === 6 ? -1 : d - 1;
}

/** Nächste eigene Stunde ab jetzt. */
function nextOwnLesson(from) {
  const nowMin = from.getHours() * 60 + from.getMinutes();
  for (let off = 0; off < 400; off++) {
    const date = addDays(from, off);
    if (dayInfo(date).kind !== 'school') continue;
    const model = dayModel(date.getDay() - 1);
    const blocks = groupBlocks(model.segs).filter(b => b.kind === 'lesson' && !b.dropped);
    for (const b of blocks) {
      if (off === 0 && b.sMin <= nowMin) continue;
      return { date, block: b, offset: off };
    }
  }
  return null;
}

function resetStatus() {
  const card = $('status-card');
  card.style.removeProperty('border-color');
  const dot = $('status-dot');
  dot.className = 'status-dot';
  dot.style.cssText = '';
  const pill = $('countdown-pill');
  pill.classList.add('hidden');
  pill.style.cssText = '';
  $('progress-wrap').classList.add('hidden');
  $('progress-fill').style.removeProperty('--prog');
  $('next-preview').classList.add('hidden');
}

function setDot(color) {
  const dot = $('status-dot');
  dot.classList.add('is-live');
  dot.style.background = color;
  dot.style.boxShadow = `0 0 12px ${color}`;
}

function setCountdown(sec, color) {
  const pill = $('countdown-pill');
  pill.classList.remove('hidden');
  pill.textContent = fmtCountdown(sec);
  if (color) {
    pill.style.color = color;
    pill.style.background = `color-mix(in srgb, ${color} 12%, transparent)`;
    pill.style.borderColor = `color-mix(in srgb, ${color} 26%, transparent)`;
  }
}

function setProgress(leftSec, totalSec, color) {
  if (totalSec <= 0) return;
  const pct = Math.min(100, Math.max(0, ((totalSec - leftSec) / totalSec) * 100));
  $('progress-wrap').classList.remove('hidden');
  $('progress-wrap').setAttribute('aria-valuenow', Math.round(pct));
  $('progress-fill').style.width = pct.toFixed(2) + '%';
  if (color) $('progress-fill').style.setProperty('--prog', color);
  $('progress-pct').textContent = Math.round(pct) + ' %';
}

function setNext(text, info) {
  $('next-preview').classList.remove('hidden');
  $('next-subject').textContent = text;
  $('next-info').textContent = info || '';
}

function showNextOwn(now) {
  const nx = nextOwnLesson(now);
  if (!nx) return;
  const when = nx.offset === 0 ? `${fmtMin(nx.block.sMin)}` : `${fmtDate(nx.date)}, ${fmtMin(nx.block.sMin)}`;
  setNext(lessonTitle(nx.block.lesson), `· ${when} · ${nx.block.lesson.r}`);
}

function updateStatus(now) {
  resetStatus();
  const label = $('status-label'), main = $('status-main'), sub = $('status-sub');
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowSec = nowMin * 60 + now.getSeconds();
  const info = dayInfo(now);
  const banner = $('info-banner');

  /* ── kein Schultag ── */
  if (info.kind !== 'school') {
    banner.classList.add('show');
    banner.textContent =
      info.kind === 'weekend' ? 'Wochenende – genieß die freie Zeit.' :
      info.kind === 'before'  ? `Das Semester beginnt am ${fmtDate(parseKey(SEM_START))}.` :
      info.kind === 'after'   ? 'Das Semester ist beendet.' :
      `${info.label} – unterrichtsfrei.`;

    const nx = nextOwnLesson(now);
    label.textContent = info.label;
    if (nx) {
      main.textContent = `${DAY_FULL[nx.date.getDay() - 1]}, ${fmtMin(nx.block.sMin)} Uhr`;
      sub.textContent = `${lessonTitle(nx.block.lesson)} · ${nx.block.lesson.t} · ${nx.block.lesson.r}`;
      const days = dayDiff(now, nx.date);
      setNext(fmtDate(nx.date), days === 1 ? '· morgen' : `· in ${days} Tagen`);
      setDot(subjColor(nx.block.lesson.s));
    } else {
      main.textContent = 'Kein Unterricht';
      sub.textContent = '';
    }
    return;
  }

  banner.classList.remove('show');
  const model = dayModel(todayIdx());
  const blocks = groupBlocks(model.segs);
  const runs = subjectRuns(model.segs);
  const current = blocks.find(b => nowMin >= b.sMin && nowMin < b.endMin);

  /* ── vor dem ersten oder nach dem letzten Block ── */
  if (!current) {
    if (!model.mine) {
      label.textContent = 'Heute';
      main.textContent = 'Kein Unterricht';
      showNextOwn(now);
      return;
    }
    if (nowMin < model.mineFirstMin) {
      label.textContent = 'Vor dem Unterricht';
      main.textContent = `Beginn um ${fmtMin(model.mineFirstMin)} Uhr`;
      const first = blocks.find(b => b.kind === 'lesson' && !b.dropped);
      sub.textContent = first ? `${lessonTitle(first.lesson)} · ${first.lesson.r}` : '';
      setCountdown(model.mineFirstMin * 60 - nowSec, null);
    } else {
      label.textContent = 'Feierabend';
      main.textContent = 'Schulschluss';
      sub.textContent = `Unterricht bis ${fmtMin(model.mineLastMin)} Uhr`;
      showNextOwn(now);
    }
    return;
  }

  /* ── Pause / Lücke ── */
  if (current.kind === 'pause' || current.kind === 'gap') {
    setDot('var(--accent2)');
    label.textContent = 'Jetzt';
    main.textContent = 'Pause';
    sub.textContent = `Bis ${fmtMin(current.endMin)} Uhr`;
    setCountdown(current.endMin * 60 - nowSec, null);
    setProgress(current.endMin * 60 - nowSec, (current.endMin - current.sMin) * 60, null);
    showNextOwn(now);
    return;
  }

  /* ── Mittagspause ── */
  if (current.kind === 'lunch') {
    setDot('var(--green)');
    label.textContent = 'Jetzt';
    main.textContent = 'Mittagspause';
    sub.textContent = `Bis ${fmtMin(current.endMin)} Uhr`;
    setCountdown(current.endMin * 60 - nowSec, null);
    setProgress(current.endMin * 60 - nowSec, (current.endMin - current.sMin) * 60, null);
    showNextOwn(now);
    return;
  }

  /* ── Freistunde ── */
  if (current.kind === 'free') {
    label.textContent = `${current.nr}. Stunde`;
    main.textContent = 'Freistunde';
    sub.textContent = `Bis ${fmtMin(current.endMin)} Uhr`;
    setCountdown(current.endMin * 60 - nowSec, null);
    setProgress(current.endMin * 60 - nowSec, (current.endMin - current.sMin) * 60, null);
    showNextOwn(now);
    return;
  }

  /* ── Unterricht ── */
  const l = current.lesson;
  const color = subjColor(l.s);
  const run = runs.find(r => nowMin >= r.sMin && nowMin < r.endMin) || current;

  if (current.dropped) {
    label.textContent = `${current.nr}. Stunde · entfällt für dich`;
    main.textContent = lessonTitle(l);
    sub.textContent = `Die Klasse hat ${lessonTitle(l)} bis ${fmtMin(current.endMin)} · ${l.r}`;
    showNextOwn(now);
    return;
  }

  const runTotal = (run.endMin - run.sMin) * 60;
  const runLeft = Math.max(0, run.endMin * 60 - nowSec);
  setDot(color);
  label.textContent = run.span > 1
    ? `${current.nr}. Stunde · Block ${run.span} ${plural(run.span, 'Stunde', 'Stunden')}`
    : `${current.nr}. Stunde`;
  main.textContent = lessonTitle(l);
  sub.textContent = `${l.t} · ${l.r} · bis ${fmtMin(run.endMin)} Uhr`;
  setCountdown(runLeft, color);
  setProgress(runLeft, runTotal, color);
  $('status-card').style.borderColor = `color-mix(in srgb, ${color} 22%, transparent)`;

  // Was kommt danach?
  const idx = blocks.indexOf(current);
  const moreOwn = blocks.slice(idx + 1).some(b => b.kind === 'lesson' && !b.dropped);
  if (!moreOwn) {
    // Nichts mehr für dich heute — dann ist die Schlusszeit die wichtigste Angabe
    setNext('Schulschluss', `· ${fmtMin(model.mineLastMin)} Uhr`);
    return;
  }
  for (let i = idx + 1; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.kind === 'lunch') { setNext('Mittagspause', `· ${fmtMin(b.sMin)}`); break; }
    if (b.kind === 'free')  { setNext('Freistunde', `· ${fmtMin(b.sMin)}`); break; }
    if (b.kind === 'lesson' && b.dropped) continue;   // überspringen, du bist nicht dabei
    if (b.kind === 'lesson' && !sameLesson(b, current)) {
      setNext(lessonTitle(b.lesson), `· ${fmtMin(b.sMin)} · ${b.lesson.r}`);
      break;
    }
  }
}

/* ─── COUNTDOWN-PILLEN ────────────────────────────────────────────── */
function updateBreakPill(now) {
  const pill = $('ferien-countdown');
  if (!settings.showFerien) { pill.classList.add('hidden'); return; }

  const key = dateKey(now);
  let text = '';

  if (key < SEM_START) {
    const d = dayDiff(now, parseKey(SEM_START));
    text = `Semesterbeginn in <span class="cd-value">${d}</span> ${plural(d, 'Tag', 'Tagen')}`;
  } else if (key > SEM_END) {
    text = 'Semester beendet';
  } else if (freeMap.has(key) || now.getDay() === 0 || now.getDay() === 6) {
    // frei: wie lange noch?
    let off = 1;
    while (off < 60 && dayInfo(addDays(now, off)).kind !== 'school') off++;
    text = off === 1
      ? 'Morgen wieder Unterricht'
      : `Noch <span class="cd-value">${off - 1}</span> ${plural(off - 1, 'Tag', 'Tage')} frei`;
  } else {
    // nächster freier Tag oder Semesterende
    let off = 1, found = null;
    while (off < 400) {
      const d = addDays(now, off);
      const inf = dayInfo(d);
      if (inf.kind === 'free')  { found = { label: inf.label, off }; break; }
      if (inf.kind === 'after') { found = { label: 'Semesterende', off }; break; }
      off++;
    }
    if (found) {
      text = `${found.label} in <span class="cd-value">${found.off}</span> ${plural(found.off, 'Tag', 'Tagen')}`;
    }
  }

  if (text) { pill.innerHTML = text; pill.classList.remove('hidden'); }
  else pill.classList.add('hidden');
}

function updateCustomPill(now) {
  const pill = $('custom-countdown');
  if (!settings.cdDate) { pill.classList.add('hidden'); return; }
  const target = parseKey(settings.cdDate);
  const d = dayDiff(now, target);
  const name = settings.cdLabel || 'Termin';
  if (d < 0) { pill.classList.add('hidden'); return; }
  pill.innerHTML = d === 0
    ? `${name} <span class="cd-value">heute</span>`
    : `${name} in <span class="cd-value">${d}</span> ${plural(d, 'Tag', 'Tagen')}`;
  pill.classList.remove('hidden');
}

/* ═══════════════════════════════════════════════════════════════════
   ANSICHTSWECHSEL
   ═══════════════════════════════════════════════════════════════════ */
const viewEl = v => $('view-' + v);

function switchView(view, silent) {
  if (!VIEWS.includes(view) || view === currentView || switching) return;
  const from = viewEl(currentView), to = viewEl(view);
  const goRight = VIEWS.indexOf(view) > VIEWS.indexOf(currentView);
  currentView = view;

  document.querySelectorAll('#view-toggle .vt-btn').forEach(b => {
    const on = b.dataset.view === view;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });

  if (silent) {
    from.hidden = true;
    to.hidden = false;
    afterViewShown();
    return;
  }

  switching = true;
  // Notbremse: der Umschalter darf nie dauerhaft blockiert bleiben
  setTimeout(() => { switching = false; }, 900);
  from.classList.add(goRight ? 'slide-out-left' : 'slide-out-right');
  setTimeout(() => {
    from.hidden = true;
    from.classList.remove('slide-out-left', 'slide-out-right');
    to.hidden = false;
    to.classList.add(goRight ? 'slide-out-right' : 'slide-out-left');
    requestAnimationFrame(() => {
      to.classList.remove('slide-out-left', 'slide-out-right');
      switching = false;
      afterViewShown();
    });
  }, 180);
}

function afterViewShown() {
  if (currentView === 'day') {
    // Ohne eigene Auswahl immer auf heute springen
    if (!dayPinned) { const t = todayIdx(); if (t >= 0) dayIdx = t; }
    buildDayTabs();
    buildDay();
  }
  if (currentView === 'month') renderCalendar();
  if (currentView === 'subj') buildSubjects();
}

function initSwipe() {
  let x0 = 0, y0 = 0, t0 = 0, tracking = false;
  const area = document.querySelector('.wrap');
  area.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) { tracking = false; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); tracking = true;
  }, { passive: true });
  area.addEventListener('touchend', e => {
    if (!tracking) return;
    tracking = false;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    if (Date.now() - t0 > 700) return;
    if (Math.abs(dx) < 60 || Math.abs(dy) > 70) return;
    const i = VIEWS.indexOf(currentView);
    const next = dx < 0 ? i + 1 : i - 1;
    if (next >= 0 && next < VIEWS.length) switchView(VIEWS[next]);
  }, { passive: true });
}

function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const i = VIEWS.indexOf(currentView);
    if (e.key === 'ArrowRight' && i < VIEWS.length - 1) { switchView(VIEWS[i + 1]); e.preventDefault(); }
    else if (e.key === 'ArrowLeft' && i > 0) { switchView(VIEWS[i - 1]); e.preventDefault(); }
    else if (e.key >= '1' && e.key <= '4') { switchView(VIEWS[Number(e.key) - 1]); e.preventDefault(); }
    else if (e.key.toLowerCase() === 't') {
      const t = todayIdx();
      if (t >= 0) { dayIdx = t; dayPinned = false; }
      switchView('day');
      buildDayTabs(); buildDay();
    }
    else if (e.key.toLowerCase() === 'e') toggleSettings();
    else if (e.key === 'Escape') { const p = $('settings-panel'); if (!p.hidden) toggleSettings(); }
  });
}

/* ═══════════════════════════════════════════════════════════════════
   THEME & AKZENT
   ═══════════════════════════════════════════════════════════════════ */
function applyTheme() {
  const theme = settings.theme
    || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f4f5f7' : '#07080d');

  const icon = $('theme-icon');
  if (icon) {
    icon.innerHTML = theme === 'light'
      ? '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>'
      : '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
  }
  $('theme-btn').classList.toggle('is-on', theme === 'light');
}

function applyAccent() {
  document.documentElement.style.setProperty('--accent', settings.accent);
}

function applyCompact() {
  document.documentElement.dataset.compact = settings.compact ? 'true' : 'false';
}

/* ═══════════════════════════════════════════════════════════════════
   EINSTELLUNGS-OBERFLÄCHE
   ═══════════════════════════════════════════════════════════════════ */
function toggleSettings() {
  const panel = $('settings-panel');
  const open = panel.hidden;
  panel.hidden = !open;
  $('settings-btn').setAttribute('aria-expanded', open ? 'true' : 'false');
  $('settings-btn').classList.toggle('is-on', open);
  if (open) syncSettingsUI();
}

const TOGGLES = ['showAll', 'showFree', 'compact', 'mergeBlocks', 'showFerien', 'notif'];

function syncSettingsUI() {
  TOGGLES.forEach(k => {
    const b = $('tg-' + k);
    if (b) b.setAttribute('aria-checked', settings[k] ? 'true' : 'false');
  });
  $('notif-min-row').hidden = !settings.notif;
  document.querySelectorAll('#notif-min-btns .chip-btn').forEach(b =>
    b.classList.toggle('active', Number(b.dataset.min) === settings.notifMinutes));
  document.querySelectorAll('#startview-row .chip-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.view === settings.startView));
  document.querySelectorAll('#accent-picker .color-dot').forEach(b =>
    b.classList.toggle('active', b.dataset.color === settings.accent));
  $('cd-label').value = settings.cdLabel;
  $('cd-date').value = settings.cdDate;
}

function rebuildAll() {
  invalidateModels();
  buildWeek();
  buildDayTabs();
  buildDay();
  renderCalendar();
  buildSubjects();
  const now = new Date();
  highlightWeek(todayIdx(), now.getHours() * 60 + now.getMinutes());
  updateStatus(now);
}

function onToggle(key) {
  settings[key] = !settings[key];
  saveSettings();
  syncSettingsUI();

  if (key === 'compact') { applyCompact(); return; }
  if (key === 'showFerien') { updateBreakPill(new Date()); return; }
  if (key === 'notif') { setupNotifications(); return; }
  rebuildAll();
}

function buildAccentPicker() {
  const box = $('accent-picker');
  box.textContent = '';
  ACCENTS.forEach(c => {
    const b = mk('button', 'color-dot');
    b.type = 'button';
    b.dataset.color = c;
    b.style.background = c;
    b.setAttribute('aria-label', 'Akzentfarbe ' + c);
    b.addEventListener('click', () => {
      settings.accent = c;
      saveSettings();
      applyAccent();
      syncSettingsUI();
    });
    box.appendChild(b);
  });
}

function buildNotesList() {
  const box = $('notes-list');
  box.textContent = '';
  const used = new Set();
  LESSONS.forEach(day => Object.keys(day).forEach(nr => {
    const l = day[nr];
    if (!l.drop || settings.showAll) used.add(l.s);
  }));

  [...used]
    .sort((a, b) => subjOf(a).name.localeCompare(subjOf(b).name, 'de'))
    .forEach(key => {
      const row = mk('div', 'note-row');
      const tag = mk('span', 'tag-mini');
      tag.style.setProperty('--sc', subjColor(key));
      tag.textContent = subjOf(key).abbr;
      const input = mk('input');
      input.type = 'text';
      input.maxLength = 90;
      input.placeholder = 'Notiz zu ' + subjOf(key).name;
      input.value = notes[key] || '';
      input.addEventListener('input', () => {
        const v = input.value.trim();
        if (v) notes[key] = v; else delete notes[key];
        saveNotes();
      });
      input.addEventListener('change', () => { if (currentView === 'day') buildDay(); });
      row.appendChild(tag);
      row.appendChild(input);
      box.appendChild(row);
    });
}

/* ═══════════════════════════════════════════════════════════════════
   BENACHRICHTIGUNGEN
   ═══════════════════════════════════════════════════════════════════ */
function setupNotifications() {
  if (!settings.notif) return;
  if (!('Notification' in window)) {
    settings.notif = false;
    saveSettings();
    syncSettingsUI();
    alert('Dieser Browser unterstützt keine Benachrichtigungen.');
    return;
  }
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(p => {
      if (p !== 'granted') {
        settings.notif = false;
        saveSettings();
        syncSettingsUI();
      }
    });
  } else if (Notification.permission === 'denied') {
    settings.notif = false;
    saveSettings();
    syncSettingsUI();
    alert('Benachrichtigungen sind für diese Seite blockiert. Bitte in den Browser-Einstellungen erlauben.');
  }
}

function checkNotifications(now) {
  if (!settings.notif || !('Notification' in window) || Notification.permission !== 'granted') return;
  if (dayInfo(now).kind !== 'school') return;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const model = dayModel(todayIdx());

  groupBlocks(model.segs).forEach(b => {
    if (b.kind !== 'lesson' || b.dropped) return;
    if (nowMin !== b.sMin - settings.notifMinutes) return;
    const key = `${dateKey(now)}|${b.nr}`;
    if (notified.has(key)) return;
    notified.add(key);
    try {
      new Notification(lessonTitle(b.lesson), {
        body: `Beginnt um ${fmtMin(b.sMin)} Uhr · ${b.lesson.r} · ${b.lesson.t}`,
        icon: 'icon-192.png',
        tag: key,
      });
    } catch { /* manche Browser erlauben das nur über den Service Worker */ }
  });
}

/* ═══════════════════════════════════════════════════════════════════
   ICS-EXPORT
   ═══════════════════════════════════════════════════════════════════ */
function icsEscape(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
function icsStamp(d) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
         `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}
function icsLocal(date, minutes) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T` +
         `${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}00`;
}

function exportICS() {
  const out = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Josef-Greising-Schule//FST 2 TB Stundenplan//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(KLASSE.klasse + ' Stundenplan')}`,
    'X-WR-TIMEZONE:Europe/Berlin',
  ];
  const stamp = icsStamp(new Date());
  let cursor = parseKey(SEM_START);
  const end = parseKey(SEM_END);
  let count = 0;

  while (cursor <= end) {
    if (dayInfo(cursor).kind === 'school') {
      const model = dayModel(cursor.getDay() - 1);
      subjectRuns(model.segs).forEach(run => {
        if (run.dropped) return;   // nur die eigenen Stunden
        const note = notes[run.lesson.s];
        out.push(
          'BEGIN:VEVENT',
          `UID:${dateKey(cursor)}-${run.nr}-fst2tb@steidlmichael2000-stack.github.io`,
          `DTSTAMP:${stamp}`,
          `DTSTART:${icsLocal(cursor, run.sMin)}`,
          `DTEND:${icsLocal(cursor, run.endMin)}`,
          `SUMMARY:${icsEscape(lessonTitle(run.lesson))}`,
          `LOCATION:${icsEscape(run.lesson.r)}`,
          `DESCRIPTION:${icsEscape(run.lesson.t + (note ? ' · ' + note : ''))}`,
          'END:VEVENT'
        );
        count++;
      });
    }
    cursor = addDays(cursor, 1);
  }
  out.push('END:VCALENDAR');

  const blob = new Blob([out.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = mk('a');
  a.href = url;
  a.download = 'fst2tb-stundenplan.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);

  const btn = $('btn-ics');
  const label = btn.textContent;
  btn.textContent = `${count} Termine exportiert`;
  setTimeout(() => { btn.textContent = label; }, 2600);
}

/* ═══════════════════════════════════════════════════════════════════
   SERVICE WORKER
   ═══════════════════════════════════════════════════════════════════ */
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;

  navigator.serviceWorker.register('sw.js').then(reg => {
    const notifyUpdate = worker => {
      const banner = $('update-banner');
      banner.classList.add('show');
      $('update-reload').onclick = () => {
        worker.postMessage('skipWaiting');
        setTimeout(() => location.reload(), 400);
      };
    };
    if (reg.waiting) notifyUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) notifyUpdate(w);
      });
    });
  }).catch(() => { /* ohne Service Worker läuft die App trotzdem */ });
}

/* ═══════════════════════════════════════════════════════════════════
   HAUPTSCHLEIFE
   ═══════════════════════════════════════════════════════════════════ */
function tick() {
  const now = new Date();
  $('live-clock').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  updateStatus(now);

  if (nowMin !== lastMinute) {
    lastMinute = nowMin;
    highlightWeek(todayIdx(), nowMin);
    updateBreakPill(now);
    updateCustomPill(now);
    checkNotifications(now);
    if (currentView === 'day' && !dayPinned) {
      const t = todayIdx();
      if (t >= 0 && t !== dayIdx) { dayIdx = t; buildDayTabs(); }
      buildDay();
    } else if (currentView === 'day') {
      buildDay();
    }
  } else if (currentView === 'day') {
    updateDayMarker();
  }
}

/* ═══════════════════════════════════════════════════════════════════
   START
   ═══════════════════════════════════════════════════════════════════ */
function pickStartDay() {
  const t = todayIdx();
  if (t >= 0) return t;
  const nx = nextOwnLesson(new Date());
  return nx ? nx.date.getDay() - 1 : 0;
}

function pickStartView() {
  if (settings.startView !== 'auto') return settings.startView;
  return dayInfo(new Date()).kind === 'school' ? 'day' : 'week';
}

function init() {
  loadStore();
  applyTheme();
  applyAccent();
  applyCompact();

  $('header-sub').textContent =
    `${KLASSE.schule.replace(' Würzburg', '')} · ${KLASSE.semester} · gültig ab ${fmtDateShort(parseKey(SEM_START))}`;
  $('about').textContent =
    `${KLASSE.klasse} · Semesterplan ${KLASSE.semester.replace('Wintersemester ', '')} · ` +
    `Semesterleiter ${KLASSE.leiter} · ${fmtDateShort(parseKey(SEM_START))} – ${fmtDateShort(parseKey(SEM_END))} · ` +
    `Angaben ohne Gewähr · Tasten: 1–4 Ansicht, T heute, E Einstellungen`;

  dayIdx = pickStartDay();

  // Kalender: außerhalb des Semesters am Semesterbeginn aufschlagen,
  // sonst wäre der aktuelle Monat komplett leer
  const now = new Date();
  const key = dateKey(now);
  const anchor = (key < SEM_START) ? parseKey(SEM_START)
               : (key > SEM_END)   ? parseKey(SEM_END)
               : now;
  calYear = anchor.getFullYear();
  calMonth = anchor.getMonth();

  buildAccentPicker();
  buildNotesList();
  buildWeek();
  buildDayTabs();
  buildDay();
  renderCalendar();
  buildSubjects();

  // Ansichten verdrahten
  document.querySelectorAll('#view-toggle .vt-btn').forEach(b =>
    b.addEventListener('click', () => switchView(b.dataset.view)));

  $('settings-btn').addEventListener('click', toggleSettings);
  $('settings-close').addEventListener('click', toggleSettings);
  $('theme-btn').addEventListener('click', () => {
    settings.theme = isLight() ? 'dark' : 'light';
    saveSettings();
    applyTheme();
    buildNotesList();
    rebuildAll();
  });

  TOGGLES.forEach(k => {
    const b = $('tg-' + k);
    if (b) b.addEventListener('click', () => onToggle(k));
  });
  document.querySelectorAll('#notif-min-btns .chip-btn').forEach(b =>
    b.addEventListener('click', () => {
      settings.notifMinutes = Number(b.dataset.min);
      saveSettings();
      syncSettingsUI();
    }));
  document.querySelectorAll('#startview-row .chip-btn').forEach(b =>
    b.addEventListener('click', () => {
      settings.startView = b.dataset.view;
      saveSettings();
      syncSettingsUI();
    }));

  $('cal-prev').addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
  });
  $('cal-next').addEventListener('click', () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
  });

  $('cd-set').addEventListener('click', () => {
    settings.cdLabel = $('cd-label').value.trim();
    settings.cdDate = $('cd-date').value;
    saveSettings();
    updateCustomPill(new Date());
  });
  $('cd-clear').addEventListener('click', () => {
    settings.cdLabel = ''; settings.cdDate = '';
    saveSettings();
    syncSettingsUI();
    updateCustomPill(new Date());
  });

  $('btn-ics').addEventListener('click', exportICS);
  $('btn-reset').addEventListener('click', () => {
    if (!confirm('Alle Einstellungen und Notizen löschen?')) return;
    try {
      localStorage.removeItem(STORE + 'settings');
      localStorage.removeItem(STORE + 'notes');
    } catch {}
    location.reload();
  });

  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (!settings.theme) { applyTheme(); rebuildAll(); }
  });

  // Beim Drehen des Geräts können Karten umbrechen → Zeitachse neu vermessen
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (currentView === 'day') { trimTimelineTail(); updateDayMarker(); }
    }, 150);
  });

  initSwipe();
  initKeyboard();
  syncSettingsUI();

  const start = pickStartView();
  if (start !== 'week') switchView(start, true);

  tick();
  setInterval(tick, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

  registerSW();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
