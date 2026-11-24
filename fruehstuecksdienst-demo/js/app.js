/* App-Hülle: Demo-Leiste, Rollenwechsel, Hash-Sync, Uhr, Zurücksetzen, Fehlergrenze, Mount. */
(function (root) {
  const App = root.App = root.App || {};
  const { html, useState, useEffect, useErrorBoundary, render } = App.lib;
  const { Icon, Btn, Segmented, Sheet, ConfirmSheet, ToastHost, Placeholder, ErrorBoundary, toast } = App.ui;

  const L2 = (long, short) => App.lib.html`<span class="fd-l-long">${long}</span><span class="fd-l-short">${short}</span>`;
  const ROLES = [
    { value: 'kunde', label: L2('Kunden-App', 'Kunde') },
    { value: 'backoffice', label: L2('Backoffice', 'Backoffice') },
    { value: 'fahrer', label: L2('Fahrer-App', 'Fahrer') },
    { value: 'konzept', label: L2('Konzept', 'Konzept') }
  ];
  const roleFromHash = () => {
    const r = String(root.location.hash || '').replace(/^#/, '');
    return ROLES.some(x => x.value === r) ? r : null;
  };

  function clockText() {
    const t = App.time, d = new Date(t.now());
    return t.WD[(d.getDay() + 6) % 7] + ' ' + t.fmt.hm(d);
  }

  function DemoBar({ s }) {
    const [clockOpen, setClockOpen] = useState(false);
    const [resetOpen, setResetOpen] = useState(false);
    useEffect(() => {
      const box = document.querySelector('.fd-demo-roles');
      const el = box && box.querySelector('[aria-pressed="true"]');
      if (el) {
        try {
          const b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
          box.scrollLeft += (r.left + r.width / 2) - (b.left + b.width / 2);
        } catch (e) { /* egal */ }
      }
    }, [s.ui.role]);
    const shifted = s.clockPreset && s.clockPreset !== 'echt';
    const pick = (id) => {
      App.actions.setClock(id); setClockOpen(false);
      toast(id === 'echt' ? 'Echtzeit' : 'Demo-Zeit: ' + clockText(), 'ok');
    };
    const doReset = () => { App.actions.resetDemo(); setResetOpen(false); toast('Demo zurückgesetzt', 'ok'); };
    const bar = html`<div class="fd-demobar"><div class="ui-wrap ui-wrap-wide fd-demobar-in">
      <span class="fd-demo-tag">DEMO</span>
      <div class="fd-demo-roles"><${Segmented} tone="night" label="Bereich wählen" options=${ROLES} value=${s.ui.role} onChange=${(r) => App.actions.go(r)} /></div>
      <button type="button" class=${'fd-demo-btn' + (shifted ? ' is-shifted' : '')} aria-label=${'Demo-Uhr: ' + clockText() + ', ändern'} onClick=${() => setClockOpen(true)}><${Icon} name="clock" size=${15} /><span class="fd-clock-day">${clockText().split(' ')[0] + ' '}</span>${clockText().split(' ').slice(1).join(' ')}</button>
      <button type="button" class="fd-demo-btn fd-demo-reset" aria-label="Demo zurücksetzen" onClick=${() => setResetOpen(true)}><${Icon} name="refresh" size=${16} /></button>
    </div></div>`;
    return [bar, html`<${Sheet} key="clock" open=${clockOpen} onClose=${() => setClockOpen(false)} title="Demo-Uhr">
      <p class="ui-muted">Springen Sie zu einem Zeitpunkt, an dem die Geschichte spielt. Jetzt: <strong>${App.time.fmt.dateTime(App.time.now())}</strong></p>
      <div class="fd-clock-list">${App.time.presets.map(p => html`<button type="button" key=${p.id} class=${'fd-clock-opt' + ((s.clockPreset || 'echt') === p.id ? ' is-on' : '')} onClick=${() => pick(p.id)}>
        <span>${p.label}</span>${(s.clockPreset || 'echt') === p.id ? html`<${Icon} name="check" size=${18} />` : null}</button>`)}</div>
    <//>`, html`<${ConfirmSheet} key="reset" open=${resetOpen} onClose=${() => setResetOpen(false)} title="Demo zurücksetzen?" danger confirmLabel="Zurücksetzen"
      text="Alle Eingaben, Bestellungen und Einstellungen dieser Demo werden gelöscht. Die Beispieldaten werden neu geladen." onConfirm=${doReset} />`];
  }

  function Area({ s }) {
    const role = s.ui.role;
    if (role === 'kunde') return html`<${App.shells.customer} s=${s} />`;
    if (role === 'backoffice') return html`<${App.shells.backoffice} s=${s} />`;
    if (role === 'fahrer') return html`<${App.shells.driver} s=${s} />`;
    const V = App.views && App.views.concept && App.views.concept.konzept;
    const body = typeof V === 'function' ? html`<${ErrorBoundary} name="konzept"><${V} /><//>` : html`<${Placeholder} title="Konzept" text="Die Konzept-Seite ist noch nicht gebaut." />`;
    return html`<div class="kz-shell">${V && V.fullBleed ? body : html`<div class="ui-wrap kz-view">${body}</div>`}</div>`;
  }

  function Root() {
    const s = App.useStore();
    const [err, reset] = useErrorBoundary((e) => { try { console.error(e); } catch (x) { /* egal */ } });
    const role = s.ui.role;

    useEffect(() => {
      const want = '#' + role;
      if (root.location.hash !== want) root.location.hash = want;
    }, [role]);
    useEffect(() => {
      const onHash = () => { const r = roleFromHash(); if (r && r !== App.store.getState().ui.role) App.actions.go(r); };
      root.addEventListener('hashchange', onHash);
      const t = setInterval(() => App.actions.tick(), 30000);
      return () => { root.removeEventListener('hashchange', onHash); clearInterval(t); };
    }, []);

    if (err) {
      return html`<div class="fd-boot-error ui-error" role="alert"><h3>Die Demo ist auf einen Fehler gestoßen</h3>
        <p>Ihre Daten sind nicht verloren. Versuchen Sie es erneut oder setzen Sie die Demo zurück.</p>
        <div class="ui-row"><${Btn} variant="ghost" onClick=${reset}>Erneut versuchen<//>
        <${Btn} variant="sun" onClick=${() => { try { App.actions.resetDemo(); } catch (e) { /* egal */ } reset(); }}>Demo zurücksetzen<//></div>
        <pre>${String(err && err.message ? err.message : err)}</pre></div>`;
    }
    return html`<div class=${'fd-root is-' + role}>
      <${DemoBar} s=${s} />
      <div class="fd-main"><${Area} s=${s} /></div>
      <${ToastHost} />
    </div>`;
  }

  function boot() {
    const mount = document.getElementById('app');
    document.documentElement.lang = 'de';
    try {
      const r = roleFromHash();
      if (r && App.store.getState().ui.role !== r) App.actions.go(r);
      render(html`<${Root} />`, mount);
    } catch (e) {
      mount.innerHTML = '';
      const box = document.createElement('div');
      box.className = 'fd-boot-error ui-error';
      const h3 = document.createElement('h3'); h3.textContent = 'Die Demo konnte nicht gestartet werden';
      const pre = document.createElement('pre'); pre.textContent = String(e && e.message ? e.message : e);
      box.appendChild(h3); box.appendChild(pre); mount.appendChild(box);
      try { console.error(e); } catch (x) { /* egal */ }
    }
  }
  App.boot = boot;
  if (typeof document !== 'undefined') boot();
})(typeof window !== 'undefined' ? window : globalThis);
