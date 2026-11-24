/* ==========================================================================
   App.ui – geteilte Komponenten (Preact + htm). Klassen: ui-*  (Styles in css/base.css)

   Alle Komponenten sind Funktionskomponenten; `html` kommt aus App.lib.
   Zeiten/Preise formatieren die Aufrufer über App.time.fmt / App.fmt.

   Icon({ name, size=20 })           Strichicon (Inline-SVG, currentColor). Namen: siehe ICONS unten.
   Btn({ variant='sun'|'primary'|'ghost'|'quiet'|'danger', size='sm'|'md'|'lg', icon, iconAfter, full,
         disabled, onClick, type, href, … })        Schaltfläche; children = Beschriftung. Mit `href` ein <a>.
   Pill({ tone='neutral'|'ok'|'warn'|'full'|'info'|'sun'|'kraft', icon, mono })  Kleine Statusmarke.
   StatusPill({ effective })         Pill mit Punkt + Text aus config.labels.effective (frei, wenige Plätze, …).
   Chip({ selected, onClick, icon })  Antippbare Auswahlmarke (ohne onClick: statisch).
   Sheet({ open, onClose, title, footer, wide })   Mobil von unten, ab 720 px mittig; Esc/Hintergrund schließt. children = Inhalt, footer = Knopfzeile.
   ConfirmSheet({ open, title, text, confirmLabel, cancelLabel, danger, onConfirm, onClose })  Rückfrage statt confirm().
   toast(text, tone='info'|'ok'|'warn'|'full')  zeigt eine Meldung; ToastHost() einmal in der Hülle (macht app.js).
   Stepper({ value, onChange(n), min=0, max=99, label, size='md'|'sm' })   − 3 +
   Segmented({ options:[{value,label,icon,count}|string], value, onChange(value), label, full, tone:'night' })
   Tabs({ tabs:[{id,label,badge,icon}], value, onChange(id), label })       Unterstrichene Reiter (scrollbar).
   Field({ id, label, hint, error, as:'input'|'textarea'|'select', options:[{value,label}], suffix, …inputProps })
        Label + Eingabe; Pflicht: stabile id. Übrige Props (type, value, onInput, onChange, placeholder, …) gehen an das Feld.
   Toggle({ id, label, hint, checked, onChange(bool) })   Schalter.
   DayTag({ wd, dateLabel, effective, sub, promo, selected, disabled, onClick, time })   Türanhänger. wd 0=Mo…6=So;
        effective: free|few|full|closed|planned|booked|reserved; promo: Aktions-Etikett (Text); time: Text der Lieferzeit (Standard „bis 06:30“/„bis 08:30“; false = ausblenden).
   WeekStrip({ days:[{wd,dateLabel,effective,sub,promo,selected,disabled,time}], onPick(day), label })   Sieben Türanhänger; mobil scrollbar mit Snap.
   Ticket({ title, rows:[{label,value,strong}|[label,value]], footer, stamp, children })   Lieferzettel (Packpapier, Mono).
   Photo({ id, alt, ratio='4/3' })   Foto aus App.photos[id] bzw. config.photos[id] (bei Ladefehler/ohne Eintrag: App.art.Product({id}) bzw. Hero (id 'hero'), sonst Platzhalter). Produkte quadratisch (ratio 1/1), Szenen hero/baecker/hofladen/buero/geschenk/fruehstueck quer (z. B. 3/2).
   ProductCard({ product, qty=0, onQty(n), compact, badge })   Kachel mit „+“ bzw. Stepper; compact = Zeile für Listen/Sheets; badge = kurzer Text (z. B. „5 + 1 gratis“) als Sonnen-Pille auf dem Bild.
   Bar({ value, max=1, tone='auto'|'ok'|'warn'|'full'|'info'|'sun', label })   Fortschritts-/Auslastungsbalken (auto: >100 % rot, ≥90 % gelb).
   Kpi({ label, value, sub, tone })   Kennzahl-Kachel.
   PushBanner({ notification, onOpen, onClose })   Benachrichtigung im Handy-Stil; Position setzt der Aufrufer.
   Empty({ icon, title, text, action })   Leerzustand; action = fertiger Knopf (vnode).
   Countdown({ to })   „noch 2 Std 13 Min“ bis Date/ms/ISO-String; aktualisiert sich selbst.
   Logo({ onNight, size=22 })   Marke + Wortmarke.
   Accordion({ items:[{id,title,body}], single=true })   FAQ-Akkordeon.
   ErrorBoundary({ name, children })   Fängt Renderfehler und zeigt einen lesbaren Kasten.
   Placeholder({ title, text })   Neutraler Platzhalter (für Stubs und fehlende Views).
   cx(...)   Klassen verbinden (falsy wird ignoriert).

   CSS-Helfer für Views (base.css): ui-wrap (Seiten-Gutter, max. 1120 px), ui-band-night, ui-card, ui-card-flat, ui-stack, ui-row, ui-grow,
   ui-eyebrow, ui-lead, ui-muted, ui-mono, ui-price, ui-tablewrap + ui-table (th/td, .num), ui-hr, ui-sr, ui-input, ui-label.

   View-Vertrag der Shells: Eine View wird mit Gutter (ui-wrap) gerendert. Wer volle Breite für Bänder braucht
   (Hero, Nacht-Fuß), setzt `App.views.<bereich>.<name>.fullBleed = true` und nutzt dann selbst `ui-wrap` je Band.
   ========================================================================== */
(function (root) {
  const App = root.App = root.App || {};
  const L = App.lib;
  const { html, h, useState, useEffect, useRef, useErrorBoundary } = L;

  const cx = (...a) => a.filter(Boolean).join(' ');
  const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const WD_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const T = () => App.time || {};
  const labels = () => (App.config && App.config.labels) || {};

  /* ---------- Icons ---------- */
  const C = (cx_, cy, r) => `<circle cx="${cx_}" cy="${cy}" r="${r}"/>`;
  const ICONS = {
    bag: '<path d="M5.5 8h13l-1 12h-11z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    door: '<path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21"/><path d="M3.5 21h17"/><path d="M14.5 12.5v.5"/>',
    clock: C(12, 12, 9) + '<path d="M12 7v5l3.2 2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7.5l8.5 6 8.5-6"/>',
    truck: '<path d="M2.5 6.5h11v10h-11z"/><path d="M13.5 9.5h4l3 3v4h-7"/>' + C(7, 18, 1.8) + C(17, 18, 1.8),
    map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
    route: C(6, 18, 2.5) + C(18, 6, 2.5) + '<path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
    pin: '<path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z"/>' + C(12, 9.5, 2.5),
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    pause: '<path d="M9 5.5v13M15 5.5v13"/>',
    gift: '<rect x="3.5" y="9" width="17" height="11" rx="1.5"/><path d="M12 9v11M3.5 13h17"/><path d="M12 9C9.5 9 8 8 8 6.5S9 4 10 4c1.5 0 2 2.5 2 5zM12 9c2.5 0 4-1 4-2.5S15 4 14 4c-1.5 0-2 2.5-2 5z"/>',
    users: C(9, 8.5, 3.5) + '<path d="M2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5"/>' + C(17, 9.5, 2.7) + '<path d="M17 14.5c2.5 0 4.2 1.7 4.5 4.5"/>',
    chart: '<path d="M4 20v-8M10 20V5M16 20v-5M2.5 20.5h19"/>',
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/>' + C(15, 7, 2) + C(9, 17, 2),
    'chevron-left': '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
    'chevron-right': '<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
    'chevron-down': '<path d="M5.5 9.5L12 16l6.5-6.5"/>',
    'chevron-up': '<path d="M5.5 14.5L12 8l6.5 6.5"/>',
    info: C(12, 12, 9) + '<path d="M12 11v5.5M12 7.8v.2"/>',
    alert: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.2v.2"/>',
    leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-5 6-8 10-10"/>',
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>',
    search: C(10.5, 10.5, 6.5) + '<path d="M15.5 15.5l5 5"/>',
    logout: '<path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10"/><path d="M15 8l4 4-4 4M19 12H9"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
    send: '<path d="M21 3L10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5z"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.3L4 8.5M4 4v4.5h4.5"/><path d="M4 13a8 8 0 0 0 14.3 4.3L20 15.5M20 20v-4.5h-4.5"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    euro: '<path d="M18 6.5A7 7 0 1 0 18 17.5"/><path d="M4 10.5h10M4 13.5h9"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9L3.5 9.7l5.9-.8z"/>',
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
    list: '<path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20M4 6.5h.01M4 12h.01M4 17.5h.01"/>',
    user: C(12, 8, 4) + '<path d="M4.5 20.5c.7-4 3.7-6 7.5-6s6.8 2 7.5 6"/>',
    basket: '<path d="M3.5 10h17l-1.8 9.5H5.3z"/><path d="M8 10l3-6M16 10l-3-6"/>',
    megaphone: '<path d="M4 10v4h3l8 4.5v-13L7 10z"/><path d="M18.5 9.5a4 4 0 0 1 0 5M7 14l1.2 5h2.3l-1.2-4.5"/>',
    bread: '<path d="M4 11c0-4 3.5-6 8-6s8 2 8 6c0 1.3-.6 2.1-1.5 2.4V19a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-5.6C4.6 13.1 4 12.3 4 11z"/><path d="M9 9.5l1.2 2M13 9l1.2 2.2"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/>',
    sun: C(12, 12, 4) + '<path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>'
  };

  function Icon({ name, size = 20, class: klass }) {
    return html`<svg class=${cx('ui-icon', klass)} width=${size} height=${size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" dangerouslySetInnerHTML=${{ __html: ICONS[name] || C(12, 12, 8) }} />`;
  }

  /* ---------- Buttons, Pills ---------- */
  function Btn({ variant = 'sun', size = 'md', icon, iconAfter, full, disabled, onClick, type = 'button', href, class: klass, children, ...rest }) {
    const cls = cx('ui-btn', 'ui-btn-' + variant, size !== 'md' && 'ui-btn-' + size, full && 'ui-btn-full', klass);
    const isz = size === 'sm' ? 16 : size === 'lg' ? 22 : 20;
    const inner = [icon ? html`<${Icon} name=${icon} size=${isz} />` : null, children, iconAfter ? html`<${Icon} name=${iconAfter} size=${isz} />` : null];
    if (href) return h('a', { class: cls, href, onClick, 'aria-disabled': disabled ? 'true' : undefined, ...rest }, inner);
    return h('button', { class: cls, type, disabled, onClick, ...rest }, inner);
  }

  function Pill({ tone = 'neutral', icon, mono, class: klass, children, ...rest }) {
    return h('span', { class: cx('ui-pill', 'ui-pill-' + tone, mono && 'ui-pill-mono', klass), ...rest },
      icon ? html`<${Icon} name=${icon} size=${14} />` : null, children);
  }

  const EFF_TONE = { free: 'ok', few: 'warn', full: 'full', closed: 'neutral', planned: 'neutral', booked: 'info', reserved: 'info' };
  function effLabel(effective) {
    const l = labels().effective || {};
    return l[effective] || effective || '';
  }
  function StatusPill({ effective }) {
    return html`<${Pill} tone=${EFF_TONE[effective] || 'neutral'}><span class="ui-dot"></span>${effLabel(effective)}<//>`;
  }

  function Chip({ selected, onClick, icon, children, ...rest }) {
    const inner = [icon ? html`<${Icon} name=${icon} size=${16} />` : null, children];
    if (!onClick) return h('span', { class: cx('ui-chip', selected && 'is-on'), ...rest }, inner);
    return h('button', { type: 'button', class: cx('ui-chip', selected && 'is-on'), 'aria-pressed': selected ? 'true' : 'false', onClick, ...rest }, inner);
  }

  /* ---------- Sheet ---------- */
  let sheetSeq = 0, lockCount = 0;
  const FOCUSABLE = 'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';
  function Sheet({ open, onClose, title, footer, wide, children }) {
    const panel = useRef(null);
    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    const idRef = useRef(null);
    if (!idRef.current) idRef.current = 'ui-sheet-' + (++sheetSeq);
    useEffect(() => {
      if (!open) return undefined;
      const prev = document.activeElement;
      lockCount++; document.documentElement.classList.add('ui-lock');
      if (panel.current) panel.current.focus();
      const onKey = (e) => {
        if (e.key === 'Escape') { e.stopPropagation(); if (closeRef.current) closeRef.current(); return; }
        if (e.key === 'Tab' && panel.current) {
          const f = Array.from(panel.current.querySelectorAll(FOCUSABLE)).filter(n => n.offsetParent !== null);
          if (!f.length) { e.preventDefault(); return; }
          const first = f[0], last = f[f.length - 1], a = document.activeElement;
          if (e.shiftKey && (a === first || a === panel.current)) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
        }
      };
      document.addEventListener('keydown', onKey, true);
      return () => {
        document.removeEventListener('keydown', onKey, true);
        if (--lockCount <= 0) { lockCount = 0; document.documentElement.classList.remove('ui-lock'); }
        if (prev && prev.focus && document.contains(prev)) { try { prev.focus(); } catch (e) { /* egal */ } }
      };
    }, [open]);
    if (!open) return null;
    return html`
      <div class="ui-sheet-root">
        <div class="ui-sheet-back" onClick=${() => closeRef.current && closeRef.current()}></div>
        <div class=${cx('ui-sheet', wide && 'ui-sheet-wide')} role="dialog" aria-modal="true" aria-labelledby=${title ? idRef.current : undefined} tabindex="-1" ref=${panel}>
          <div class="ui-sheet-head">
            ${title ? html`<h3 id=${idRef.current}>${title}</h3>` : html`<div style="flex:1"></div>`}
            <${Btn} variant="quiet" size="sm" icon="x" aria-label="Schließen" onClick=${() => closeRef.current && closeRef.current()} />
          </div>
          <div class="ui-sheet-body">${children}</div>
          ${footer ? html`<div class="ui-sheet-foot">${footer}</div>` : null}
        </div>
      </div>`;
  }

  function ConfirmSheet({ open, title, text, confirmLabel = 'Bestätigen', cancelLabel = 'Abbrechen', danger, onConfirm, onClose }) {
    return html`<${Sheet} open=${open} onClose=${onClose} title=${title}
      footer=${[
        html`<${Btn} key="n" variant="ghost" onClick=${onClose}>${cancelLabel}<//>`,
        html`<${Btn} key="y" variant=${danger ? 'danger' : 'sun'} onClick=${onConfirm}>${confirmLabel}<//>`
      ]}>${typeof text === 'string' ? html`<p>${text}</p>` : text}<//>`;
  }

  /* ---------- Toast ---------- */
  let toastList = [], toastSeq = 0;
  const toastSubs = new Set();
  const toastEmit = () => toastSubs.forEach(fn => fn(toastList));
  function toast(text, tone = 'info') {
    const t = { id: ++toastSeq, text, tone };
    toastList = toastList.concat([t]).slice(-3);
    toastEmit();
    setTimeout(() => { toastList = toastList.filter(x => x.id !== t.id); toastEmit(); }, tone === 'warn' || tone === 'full' ? 5600 : 4000);
  }
  function ToastHost() {
    const [list, setList] = useState(toastList);
    useEffect(() => { toastSubs.add(setList); setList(toastList); return () => toastSubs.delete(setList); }, []);
    const ic = { ok: 'check', warn: 'alert', full: 'alert', info: 'info' };
    return html`<div class="ui-toasts" role="status" aria-live="polite">
      ${list.map(t => html`<div class=${cx('ui-toast', 'ui-toast-' + t.tone)} key=${t.id}><${Icon} name=${ic[t.tone] || 'info'} size=${20} /><span>${t.text}</span></div>`)}
    </div>`;
  }

  /* ---------- Stepper, Segmented, Tabs ---------- */
  function Stepper({ value = 0, onChange, min = 0, max = 99, label = 'Menge', size = 'md' }) {
    const set = (n) => { if (onChange && n >= min && n <= max) onChange(n); };
    return html`<div class=${cx('ui-stepper', size === 'sm' && 'ui-stepper-sm')} role="group" aria-label=${label}>
      <button type="button" aria-label=${label + ' verringern'} disabled=${value <= min} onClick=${() => set(value - 1)}><${Icon} name="minus" size=${size === 'sm' ? 16 : 18} /></button>
      <span class="ui-stepper-val" aria-live="polite">${value}</span>
      <button type="button" aria-label=${label + ' erhöhen'} disabled=${value >= max} onClick=${() => set(value + 1)}><${Icon} name="plus" size=${size === 'sm' ? 16 : 18} /></button>
    </div>`;
  }

  function Segmented({ options = [], value, onChange, label, full, tone }) {
    return html`<div class=${cx('ui-seg', full && 'ui-seg-full', tone === 'night' && 'ui-seg-night')} role="group" aria-label=${label}>
      ${options.map(o => {
        const opt = typeof o === 'object' ? o : { value: o, label: o };
        const on = opt.value === value;
        return html`<button type="button" key=${String(opt.value)} aria-pressed=${on ? 'true' : 'false'} onClick=${() => onChange && onChange(opt.value)}>
          ${opt.icon ? html`<${Icon} name=${opt.icon} size=${16} />` : null}${opt.label}${opt.count ? html`<span class="ui-seg-count">${opt.count}</span>` : null}
        </button>`;
      })}
    </div>`;
  }

  function Tabs({ tabs = [], value, onChange, label }) {
    const onKey = (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const i = tabs.findIndex(t => t.id === value);
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      if (n && onChange) { onChange(n.id); }
    };
    return html`<div class="ui-tabs" role="tablist" aria-label=${label} onKeyDown=${onKey}>
      ${tabs.map(t => html`<button type="button" role="tab" class="ui-tab" key=${t.id} aria-selected=${t.id === value ? 'true' : 'false'} tabindex=${t.id === value ? 0 : -1} onClick=${() => onChange && onChange(t.id)}>
        ${t.icon ? html`<${Icon} name=${t.icon} size=${18} />` : null}${t.label}${t.badge || t.badge === 0 ? html`<span class="ui-tab-badge">${t.badge}</span>` : null}
      </button>`)}
    </div>`;
  }

  /* ---------- Formular ---------- */
  function Field({ id, label, hint, error, as = 'input', options, suffix, class: klass, children, ...rest }) {
    const desc = [hint ? id + '-hint' : null, error ? id + '-err' : null].filter(Boolean).join(' ') || undefined;
    const props = { id, class: 'ui-input', 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': desc, ...rest };
    let control;
    if (as === 'select') control = h('select', props, options ? options.map(o => h('option', { value: o.value, key: String(o.value) }, o.label)) : children);
    else if (as === 'textarea') control = h('textarea', props);
    else control = h('input', props);
    return html`<div class=${cx('ui-field', klass)}>
      ${label ? html`<label class="ui-label" for=${id}>${label}</label>` : null}
      ${suffix ? html`<div class="ui-inputwrap">${control}<span class="ui-suffix">${suffix}</span></div>` : control}
      ${hint ? html`<div class="ui-hint" id=${id + '-hint'}>${hint}</div>` : null}
      ${error ? html`<div class="ui-error-text" id=${id + '-err'} role="alert"><${Icon} name="alert" size=${16} /><span>${error}</span></div>` : null}
    </div>`;
  }

  function Toggle({ id, label, hint, checked, onChange, disabled }) {
    return html`<label class="ui-toggle" for=${id}>
      <input type="checkbox" role="switch" id=${id} checked=${!!checked} disabled=${disabled} onChange=${(e) => onChange && onChange(e.target.checked)} />
      <span class="ui-toggle-track"></span>
      <span class="ui-toggle-text">${label}${hint ? html`<small>${hint}</small>` : null}</span>
    </label>`;
  }

  /* ---------- Türanhänger ---------- */
  function defaultTime(wd) {
    const c = (App.config && App.config.deadlineMin) || { weekday: 390, weekend: 510 };
    const m = wd >= 5 ? c.weekend : c.weekday;
    return 'bis ' + String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }
  function DayTag({ wd, dateLabel, effective = 'free', sub, promo, selected, disabled, onClick, time }) {
    const tm = time === false ? null : (time || defaultTime(wd));
    const aria = [WD_LONG[wd], dateLabel, effLabel(effective), sub, promo].filter(Boolean).join(', ');
    return html`<button type="button" class=${cx('ui-day', 'ui-day-' + effective, selected && 'is-selected')} disabled=${disabled} aria-pressed=${selected ? 'true' : 'false'} aria-label=${aria} onClick=${onClick}>
      <span class="ui-day-wd">${WD[wd]}</span>
      ${dateLabel ? html`<span class="ui-day-date">${dateLabel}</span>` : null}
      <span class="ui-day-status"><span class="ui-dot"></span><span>${effLabel(effective)}</span></span>
      ${sub ? html`<span class="ui-day-sub">${sub}</span>` : null}
      ${promo ? html`<span class="ui-day-promo">${promo}</span>` : null}
      ${tm ? html`<span class="ui-day-time">${tm}</span>` : null}
    </button>`;
  }
  function WeekStrip({ days = [], onPick, label = 'Liefertage der Woche', hole }) {
    return html`<div class="ui-week" role="group" aria-label=${label} style=${hole ? '--hole:' + hole : undefined}>
      ${days.map(d => html`<${DayTag} key=${d.wd} ...${d} onClick=${() => onPick && onPick(d)} />`)}
    </div>`;
  }

  /* ---------- Lieferzettel ---------- */
  function Ticket({ title, rows = [], footer, stamp, children, class: klass }) {
    return html`<div class=${cx('ui-ticket', klass)}>
      ${title || stamp ? html`<div class="ui-ticket-head"><span class="ui-ticket-title">${title}</span>${stamp ? html`<span class="ui-ticket-stamp">${stamp}</span>` : null}</div>` : null}
      <div class="ui-ticket-body">
        ${children}
        ${rows.map((r, i) => {
          const row = Array.isArray(r) ? { label: r[0], value: r[1] } : r;
          return html`<div class=${cx('ui-trow', row.strong && 'ui-trow-strong')} key=${i}>
            <span class="ui-trow-label">${row.label}</span><span class="ui-trow-fill"></span><span class="ui-trow-val">${row.value}</span>
          </div>`;
        })}
      </div>
      ${footer ? html`<div class="ui-ticket-foot">${footer}</div>` : null}
    </div>`;
  }

  /* ---------- Foto, Produkt ---------- */
  function Photo({ id, alt, ratio = '4/3', class: klass }) {
    const [failed, setFailed] = useState(null);
    const man = (App.photos && App.photos[id]) || (App.config && App.config.photos && App.config.photos[id]) || null;
    const src = man && failed !== man ? man : null;
    const art = App.art;
    const isHero = id === 'hero';
    let inner;
    if (src) inner = html`<img src=${src} alt=${alt || ''} loading="lazy" decoding="async" onError=${() => setFailed(man)} />`;
    else if (isHero && art && art.Hero) inner = html`<div class="ui-photo-art" role="img" aria-label=${alt || ''}>${h(art.Hero, {})}</div>`;
    else if (!isHero && art && art.Product && (!art.has || art.has(id))) inner = html`<div class="ui-photo-art" role=${alt ? 'img' : undefined} aria-label=${alt || undefined} aria-hidden=${alt ? undefined : 'true'}>${h(art.Product, { id })}</div>`;
    else inner = html`<span class="ui-photo-fallback" aria-hidden="true">${String(alt || id || '?').charAt(0).toUpperCase()}</span>`;
    const r = String(ratio).replace(/\s*\/\s*/, ' / ');
    return html`<div class=${cx('ui-photo', isHero && !src && 'ui-photo-hero', klass)} style=${'--ratio:' + r}>${inner}</div>`;
  }

  const TAG_LABELS = { bio: 'Bio', vegan: 'vegan', vegetarisch: 'vegetarisch', regional: 'regional', wochenende: 'Wochenende', gekuehlt: 'gekühlt', hofladen: 'vom Hofladen', saison: 'Saison', neu: 'neu' };
  function productTags(p) {
    const out = [];
    (p.tags || []).forEach(t => { const l = TAG_LABELS[t] || t; if (l && out.indexOf(l) < 0) out.push(l); });
    if (p.weekendOnly && out.indexOf('Wochenende') < 0) out.push('Wochenende');
    if (p.chilled && out.indexOf('gekühlt') < 0) out.push('gekühlt');
    if (p.partner === 'Hofladen' && out.indexOf('vom Hofladen') < 0) out.push('vom Hofladen');
    if (p.season && out.indexOf('Saison') < 0) out.push('Saison');
    return out;
  }
  const eur = (n) => (App.fmt && App.fmt.eur ? App.fmt.eur(n) : '€ ' + Number(n).toFixed(2).replace('.', ','));

  function ProductCard({ product: p, qty = 0, onQty, compact, badge }) {
    if (!p) return null;
    const tags = productTags(p);
    const ctl = onQty ? (qty > 0
      ? html`<${Stepper} value=${qty} onChange=${onQty} size="sm" label=${p.name} />`
      : html`<button type="button" class="ui-add" aria-label=${p.name + ' hinzufügen'} onClick=${() => onQty(1)}><${Icon} name="plus" size=${22} /></button>`) : null;
    const price = html`<div class="ui-price">${eur(p.price)}${p.unit ? html`<small>${p.unit}</small>` : null}</div>`;
    if (compact) {
      return html`<div class="ui-product ui-product-compact">
        <${Photo} id=${p.id} alt=${p.name} ratio="1/1" />
        <div class="ui-product-body"><div class="ui-product-name">${p.name}</div>${badge ? html`<span class="ui-pill ui-pill-sun">${badge}</span>` : null}${price}</div>
        <div class="ui-product-foot">${ctl}</div>
      </div>`;
    }
    return html`<article class="ui-product">
      <div class="ui-product-img"><${Photo} id=${p.id} alt=${p.name} ratio="1/1" />${badge ? html`<span class="ui-pill ui-pill-sun ui-product-badge">${badge}</span>` : null}</div>
      <div class="ui-product-body">
        <h4 class="ui-product-name">${p.name}</h4>
        ${p.desc ? html`<div class="ui-product-desc">${p.desc}</div>` : null}
        ${tags.length ? html`<div class="ui-product-tags">${tags.map(t => html`<${Pill} key=${t} tone=${t === 'Bio' ? 'ok' : t === 'gekühlt' ? 'info' : 'kraft'}>${t}<//>`)}</div>` : null}
      </div>
      <div class="ui-product-foot">${price}${ctl}</div>
    </article>`;
  }

  /* ---------- Bar, Kpi ---------- */
  function Bar({ value = 0, max = 1, tone = 'auto', label }) {
    const ratio = max > 0 ? value / max : 0;
    const t = tone === 'auto' ? (ratio > 1 ? 'full' : ratio >= 0.9 ? 'warn' : 'ok') : tone;
    const over = ratio > 1;
    return html`<div class=${cx('ui-bar', t !== 'ok' && 'ui-bar-' + t, over && 'ui-bar-over')} role="progressbar" aria-valuemin="0" aria-valuemax=${max} aria-valuenow=${value} aria-label=${label}>
      <div class="ui-bar-fill" style=${'width:' + Math.max(0, Math.min(1, ratio)) * 100 + '%'}></div>
    </div>`;
  }
  function Kpi({ label, value, sub, tone }) {
    return html`<div class=${cx('ui-kpi', tone && 'ui-kpi-' + tone)}>
      <div class="ui-kpi-label">${label}</div><div class="ui-kpi-value">${value}</div>${sub ? html`<div class="ui-kpi-sub">${sub}</div>` : null}
    </div>`;
  }

  /* ---------- Push ---------- */
  function PushBanner({ notification: n, onOpen, onClose }) {
    if (!n) return null;
    const brand = (App.config && App.config.brand && App.config.brand.name) || 'Mitteilung';
    const art = App.art;
    return html`<div class="ui-push" role="alert">
      <div class="ui-push-icon">${art && art.Mark ? h(art.Mark, { size: 40 }) : html`<${Icon} name="bread" size=${22} />`}</div>
      <button type="button" class="ui-push-main" onClick=${() => onOpen && onOpen(n)}>
        <span class="ui-push-meta"><span>${brand}</span><span>jetzt</span></span>
        <span class="ui-push-title">${n.title}</span>
        <span class="ui-push-body">${n.body}</span>
      </button>
      <button type="button" class="ui-push-x" aria-label="Benachrichtigung schließen" onClick=${() => onClose && onClose(n)}><${Icon} name="x" size=${16} /></button>
    </div>`;
  }

  /* ---------- Empty, Countdown, Logo, Accordion ---------- */
  function Empty({ icon = 'info', title, text, action }) {
    return html`<div class="ui-empty"><div class="ui-empty-icon"><${Icon} name=${icon} size=${28} /></div>
      ${title ? html`<h3>${title}</h3>` : null}${text ? html`<p>${text}</p>` : null}${action || null}</div>`;
  }

  function Countdown({ to, prefix }) {
    const [, force] = useState(0);
    useEffect(() => { const t = setInterval(() => force(x => x + 1), 15000); return () => clearInterval(t); }, []);
    const d = to instanceof Date ? to : new Date(to);
    let txt;
    if (T().fmt && T().fmt.left) txt = T().fmt.left(d);
    else txt = d.getTime() > Date.now() ? 'noch ' + Math.ceil((d.getTime() - Date.now()) / 60000) + ' Min' : 'vorbei';
    return html`<span class=${cx('ui-countdown', txt === 'vorbei' && 'is-over')}>${prefix ? prefix + ' ' : ''}${txt}</span>`;
  }

  function Logo({ onNight, size = 22, class: klass }) {
    const name = (App.config && App.config.brand && App.config.brand.name) || 'Frühstücksdienst';
    const art = App.art;
    const ms = Math.round(size * 1.45);
    const mark = art && art.Mark ? h(art.Mark, { size: ms })
      : html`<svg class="ui-logo-mark" width=${ms} height=${ms} viewBox="0 0 32 32" aria-hidden="true">
        <ellipse cx="16" cy="6.5" rx="8" ry="2.6" fill="none" stroke="var(--butter)" stroke-width="2" />
        <ellipse cx="16" cy="20" rx="12.5" ry="9" fill="var(--crust-2)" />
        <path d="M8 16.5q8-6 16 0" fill="none" stroke="var(--crust-4)" stroke-width="1.6" stroke-linecap="round" />
        <path d="M16 13v9M11.5 15l9 5M20.5 15l-9 5" fill="none" stroke="var(--crust-4)" stroke-width="1.5" stroke-linecap="round" />
      </svg>`;
    return html`<span class=${cx('ui-logo', onNight && 'on-night', klass)} style=${'font-size:' + size + 'px'}>${mark}<span>${name}</span></span>`;
  }

  function Accordion({ items = [], single = true }) {
    const [open, setOpen] = useState({});
    const uid = useRef('acc' + (++sheetSeq));
    return html`<div class="ui-acc">
      ${items.map((it, i) => {
        const key = it.id || i;
        const on = !!open[key];
        const pid = uid.current + '-p' + i;
        return html`<div class=${cx('ui-acc-item', on && 'is-open')} key=${key}>
          <button type="button" aria-expanded=${on ? 'true' : 'false'} aria-controls=${pid} onClick=${() => setOpen(single ? (on ? {} : { [key]: true }) : { ...open, [key]: !on })}>
            <span>${it.title}</span><${Icon} name="chevron-down" size=${20} />
          </button>
          ${on ? html`<div class="ui-acc-panel" id=${pid}>${typeof it.body === 'string' ? html`<p>${it.body}</p>` : it.body}</div>` : null}
        </div>`;
      })}
    </div>`;
  }

  /* ---------- Fehlerkasten, Platzhalter ---------- */
  function ErrorBoundary({ name, children }) {
    const [err, reset] = useErrorBoundary((e) => { try { console.error('[' + (name || 'View') + ']', e); } catch (x) { /* egal */ } });
    if (err) {
      return html`<div class="ui-error" role="alert">
        <h3>Dieser Bereich konnte nicht angezeigt werden</h3>
        <p>Der Rest der Demo funktioniert weiter. Wechseln Sie die Ansicht oder versuchen Sie es erneut.</p>
        <${Btn} variant="ghost" size="sm" icon="refresh" onClick=${reset}>Erneut versuchen<//>
        <pre>${(name ? name + ': ' : '') + (err && err.message ? err.message : String(err))}</pre>
      </div>`;
    }
    return children;
  }

  function Placeholder({ title = 'In Arbeit', text }) {
    return html`<div class="ui-placeholder"><strong>${title}</strong>${text ? html`<span>${text}</span>` : null}</div>`;
  }

  App.ui = {
    cx, Icon, Btn, Pill, StatusPill, Chip, Sheet, ConfirmSheet, toast, ToastHost, Stepper, Segmented, Tabs, Field, Toggle,
    DayTag, WeekStrip, Ticket, Photo, ProductCard, Bar, Kpi, PushBanner, Empty, Countdown, Logo, Accordion, ErrorBoundary, Placeholder,
    ICON_NAMES: Object.keys(ICONS)
  };
})(typeof window !== 'undefined' ? window : globalThis);
