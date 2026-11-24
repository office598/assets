/* Zeit und Formatierung. Wochentage: 0 = Montag … 6 = Sonntag. Datumsschlüssel: 'YYYY-MM-DD' (lokal). */
(function (root) {
  const App = root.App = root.App || {};
  const C = App.config;

  const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const WD_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const MONTHS = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const NBSP = ' ';

  let override = null;   // absolute Zeit nur für Tests
  let offset = 0;        // Demo-Verschiebung in ms

  const pad = n => (n < 10 ? '0' : '') + n;
  const baseMs = () => (override ? override.getTime() : Date.now());

  function now() { return new Date(baseMs() + offset); }
  function setOffset(ms) { offset = Number(ms) || 0; }
  function getOffset() { return offset; }
  function setNow(d) { override = d ? new Date(d) : null; }

  function key(date) { return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()); }
  function fromKey(k) {
    const p = String(k).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2], 0, 0, 0, 0);
  }
  function addDays(k, n) {
    const d = fromKey(k);
    d.setDate(d.getDate() + n);
    return key(d);
  }
  function today() { return key(now()); }
  function weekday(k) { return (fromKey(k).getDay() + 6) % 7; }
  function isWeekend(k) { return weekday(k) >= 5; }

  // Bestellschluss: Di–Fr am Vortag, Sa/So/Mo am Freitag davor (jeweils 16:30).
  function cutoffFor(k) {
    const wd = weekday(k);
    const back = wd === 0 ? 3 : wd === 6 ? 2 : 1;
    const d = fromKey(addDays(k, -back));
    d.setHours(C.cutoff.h, C.cutoff.m, 0, 0);
    return d;
  }
  function isOpenFor(k) { return now().getTime() < cutoffFor(k).getTime(); }
  function deadlineMin(k) { return isWeekend(k) ? C.deadlineMin.weekend : C.deadlineMin.weekday; }

  function nextDates(n, from) {
    const start = from || today();
    const out = [];
    for (let i = 1; i <= n; i++) out.push(addDays(start, i));
    return out;
  }
  function nextDateForWeekday(wd) {
    const t = today();
    for (let i = 1; i <= 14; i++) {
      const k = addDays(t, i);
      if (weekday(k) === wd && isOpenFor(k)) return k;
    }
    return addDays(t, 7);
  }

  // Demo-Zeitpunkte ----------------------------------------------------------
  const presets = [
    { id: 'echt', label: 'Echtzeit' },
    { id: 'fr-1500', label: 'Freitag 15:00 · kurz vor Bestellschluss' },
    { id: 'fr-1700', label: 'Freitag 17:00 · Bestellschluss vorbei' },
    { id: 'mo-0500', label: 'Montag 05:00 · Tour läuft' }
  ];
  const PRESET_AT = { 'fr-1500': [4, 15, 0], 'fr-1700': [4, 17, 0], 'mo-0500': [0, 5, 0] };

  function offsetForPreset(id) {
    const at = PRESET_AT[id];
    if (!at) return 0;
    const b = new Date(baseMs());
    for (let i = 0; i <= 7; i++) {
      const d = new Date(b.getFullYear(), b.getMonth(), b.getDate() + i, at[1], at[2], 0, 0);
      if ((d.getDay() + 6) % 7 === at[0] && d.getTime() > b.getTime()) return d.getTime() - b.getTime();
    }
    return 0;
  }

  // Formatierung -------------------------------------------------------------
  const fmt = {
    day(k) {
      const d = fromKey(k);
      return WD[weekday(k)] + ', ' + d.getDate() + '.' + (d.getMonth() + 1) + '.';
    },
    dayLong(k) {
      const d = fromKey(k);
      return WD_LONG[weekday(k)] + ', ' + d.getDate() + '. ' + MONTHS[d.getMonth()];
    },
    hm(x) {
      if (typeof x === 'number') {
        const m = ((Math.round(x) % 1440) + 1440) % 1440;
        return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
      }
      const d = typeof x === 'string' ? new Date(x) : x;
      return pad(d.getHours()) + ':' + pad(d.getMinutes());
    },
    rel(x) {
      const d = typeof x === 'string' ? new Date(x) : x;
      const k = key(d), t = today();
      const time = fmt.hm(d);
      if (k === t) return 'heute ' + time;
      if (k === addDays(t, 1)) return 'morgen ' + time;
      return fmt.day(k) + ' ' + time;
    },
    left(x) {
      const d = typeof x === 'string' ? new Date(x) : x;
      const mins = Math.floor((d.getTime() - now().getTime()) / 60000);
      if (mins < 0) return 'vorbei';
      const days = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
      if (days > 0) return 'noch ' + days + ' Tg ' + h + ' Std';
      if (h > 0) return 'noch ' + h + ' Std ' + m + ' Min';
      return 'noch ' + Math.max(1, m) + ' Min';
    },
    dateTime(x) {
      const d = typeof x === 'string' ? new Date(x) : x;
      return fmt.day(key(d)) + ' ' + fmt.hm(d);
    }
  };

  function group3(intStr) { return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  const appFmt = {
    eur(n) {
      const v = Math.round((Number(n) || 0) * 100) / 100;
      const parts = Math.abs(v).toFixed(2).split('.');
      return (v < 0 ? '−' : '') + '€' + NBSP + group3(parts[0]) + ',' + parts[1];
    },
    num(n) {
      const v = Math.round((Number(n) || 0) * 100) / 100;
      const parts = String(Math.abs(v)).split('.');
      return (v < 0 ? '−' : '') + group3(parts[0]) + (parts[1] ? ',' + parts[1] : '');
    },
    pct(x) { return Math.round((Number(x) || 0) * 100) + NBSP + '%'; }
  };

  App.time = {
    WD, WD_LONG, MONTHS, presets,
    now, setOffset, getOffset, setNow, offsetForPreset,
    key, fromKey, addDays, today, weekday, isWeekend,
    cutoffFor, isOpenFor, deadlineMin, nextDates, nextDateForWeekday,
    fmt
  };
  App.fmt = appFmt;
})(typeof window !== 'undefined' ? window : globalThis);
