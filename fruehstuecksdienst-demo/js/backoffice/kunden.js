/* Backoffice › Kunden (V3): Suche, Filter, Tabelle, Detail im Sheet. */
(function (root) {
  const App = root.App = root.App || {};
  const { html, useState, useMemo } = App.lib;
  const { Btn, Pill, Sheet, Field, Empty, Icon, AccessBlock } = App.ui;
  const T = App.time, F = App.fmt;
  const PAGE = 40;

  function Row({ label, children }) {
    return html`<div class="bo-kv"><dt>${label}</dt><dd>${children}</dd></div>`;
  }

  function Detail({ s, c, onClose }) {
    const plan = App.sel.weeklyPlan(s, c.id);
    const pauses = s.pauses.filter(p => p.customerId === c.id);
    const skips = (s.skips[c.id] || []).filter(k => k >= T.today());
    const inbox = App.sel.inbox(s, c.id).slice(0, 4);
    const next = App.sel.upcoming(s, c.id, 3);
    const region = App.sel.region(s, c.regionId);
    const place = App.config.labels.placement[c.placement] || '–';
    return html`<${Sheet} open=${true} onClose=${onClose} title=${c.name}
      footer=${[html`<${Btn} key="c" variant="ghost" onClick=${onClose}>Schließen<//>`]}>
      <div class="ui-stack">
        <dl class="bo-kvs">
          <${Row} label="Adresse">${c.street} ${c.houseNo}, ${c.plz} ${c.city}<//>
          <${Row} label="Gebiet">${region ? region.name : '–'}<//>
          <${Row} label="Ablageort">${place}${c.note ? html`<div class="ui-muted">„${c.note}“</div>` : null}<//>
          <${Row} label="Kontakt"><span class="ui-mono">${c.email}</span><br /><span class="ui-mono">${c.phone}</span><//>
          <${Row} label="Benachrichtigung">${[c.notify && c.notify.push ? 'Push' : null, c.notify && c.notify.email ? 'E-Mail' : null].filter(Boolean).join(' und ') || 'keine'}<//>
          <${Row} label="Kunde seit">${T.fmt.day(c.since)} · ${c.kind === 'abo' ? 'Abo' : 'Einmalbesteller'}<//>
        </dl>
        <div><h4>Zugangshilfe für Fahrer</h4><${AccessBlock} customerId=${c.id} addedBy="backoffice" /></div>
        <div><h4>Wochenplan</h4>
          ${plan.length ? html`<ul class="bo-list">${plan.map(p => html`<li key=${p.wd}><strong>${T.WD_LONG[p.wd]}</strong><span class="ui-muted">${App.sel.itemsText(s, p.items, 4)}</span><span class="ui-mono">${F.eur(p.total)}</span></li>`)}</ul>`
            : html`<p class="ui-muted">Kein Abo. Bestellt nur einzeln.</p>`}</div>
        <div><h4>Nächste Lieferungen</h4>
          ${next.length ? html`<ul class="bo-list">${next.map(u => html`<li key=${u.dateKey}><strong>${T.fmt.day(u.dateKey)}</strong>
            <span class="ui-muted">${u.kinds.includes('flex') ? 'einmalig' : 'Abo'}</span>
            ${u.skipped ? html`<${Pill} tone="warn">ausgesetzt<//>` : u.paused ? html`<${Pill} tone="warn">Pause<//>` : html`<span class="ui-mono">${F.eur(u.total)}</span>`}</li>`)}</ul>` : html`<p class="ui-muted">Keine anstehenden Lieferungen.</p>`}</div>
        <div><h4>Pausen und Aussetzer</h4>
          ${pauses.length || skips.length ? html`<ul class="bo-list">
            ${pauses.map(p => html`<li key=${p.id}><strong>Pause</strong><span class="ui-muted">${T.fmt.day(p.from)} bis ${T.fmt.day(p.to)}</span></li>`)}
            ${skips.map(k => html`<li key=${k}><strong>Ausgesetzt</strong><span class="ui-muted">${T.fmt.dayLong(k)}</span></li>`)}</ul>` : html`<p class="ui-muted">Keine.</p>`}</div>
        <div><h4>Nachrichten</h4>
          ${inbox.length ? html`<ul class="bo-list">${inbox.map(n => html`<li key=${n.id}><strong>${n.title}</strong><span class="ui-muted">${n.channel === 'push' ? 'Push' : 'E-Mail'} · ${T.fmt.rel(new Date(n.createdAt))}</span></li>`)}</ul>` : html`<p class="ui-muted">Noch keine Nachrichten.</p>`}</div>
      </div></${Sheet}>`;
  }

  function Kunden() {
    const s = App.useStore();
    const [q, setQ] = useState('');
    const [reg, setReg] = useState('');
    const [kind, setKind] = useState('');
    const [wd, setWd] = useState('');
    const [acc, setAcc] = useState('');
    const [limit, setLimit] = useState(PAGE);
    const [open, setOpen] = useState(null);
    const days = useMemo(() => {
      const m = new Map();
      s.subs.forEach(x => { if (!m.has(x.customerId)) m.set(x.customerId, []); m.get(x.customerId).push(x.weekday); });
      m.forEach(v => v.sort((a, b) => a - b));
      return m;
    }, [s.subs]);
    const all = s.customers.filter(c => c.registered);
    const term = q.trim().toLowerCase();
    const list = all.filter(c => (!reg || c.regionId === reg) && (!kind || c.kind === kind) && (!acc || App.sel.hasAccessHelp(c)) &&
      (wd === '' || (days.get(c.id) || []).includes(Number(wd))) &&
      (!term || (c.name + ' ' + c.street + ' ' + c.city + ' ' + c.plz + ' ' + c.email).toLowerCase().includes(term)));
    const shown = list.slice(0, limit);
    const reset = fn => v => { fn(v); setLimit(PAGE); };
    const cust = open ? App.sel.customer(s, open) : null;

    return html`<div class="bo-page">
      ${App.boA.head('Kunden', all.length + ' registrierte Haushalte')}
      <div class="ui-card bo-filters">
        <${Field} id="kd-q" label="Suche" type="search" placeholder="Name, Straße, Ort oder PLZ" value=${q} onInput=${e => reset(setQ)(e.target.value)} />
        <${Field} id="kd-reg" label="Gebiet" as="select" value=${reg} onChange=${e => reset(setReg)(e.target.value)}
          options=${[{ value: '', label: 'Alle Gebiete' }].concat(s.regions.filter(r => !r.planned).map(r => ({ value: r.id, label: r.name })))} />
        <${Field} id="kd-kind" label="Art" as="select" value=${kind} onChange=${e => reset(setKind)(e.target.value)}
          options=${[{ value: '', label: 'Abo und Einmalig' }, { value: 'abo', label: 'Abo' }, { value: 'flex', label: 'Nur einmalig' }]} />
        <${Field} id="kd-acc" label="Zugangshilfe" as="select" value=${acc} onChange=${e => reset(setAcc)(e.target.value)}
          options=${[{ value: '', label: 'Alle' }, { value: '1', label: 'mit Zugangshilfe' }]} />
        <${Field} id="kd-wd" label="Liefertag" as="select" value=${wd} onChange=${e => reset(setWd)(e.target.value)}
          options=${[{ value: '', label: 'Alle Tage' }].concat(T.WD_LONG.map((n, i) => ({ value: String(i), label: n })))} />
      </div>
      <div class="ui-muted bo-count" aria-live="polite">${list.length} ${list.length === 1 ? 'Treffer' : 'Treffer'}</div>
      ${list.length ? html`<div class="ui-tablewrap"><table class="ui-table bo-cust-table"><thead><tr><th>Name</th><th>Adresse</th><th>Art</th><th>Liefertage</th><th>Seit</th><th></th></tr></thead>
        <tbody>${shown.map(c => html`<tr key=${c.id} class="bo-click" onClick=${() => setOpen(c.id)}>
          <td><strong>${c.name}</strong>${App.sel.hasAccessHelp(c) ? html` <span title="Zugangshilfe hinterlegt" aria-label="Zugangshilfe hinterlegt"><${Icon} name="route" size=${15} /></span>` : null}</td><td>${c.street} ${c.houseNo}, <span class="ui-muted">${c.plz} ${c.city}</span></td>
          <td><${Pill} tone=${c.kind === 'abo' ? 'ok' : 'neutral'}>${c.kind === 'abo' ? 'Abo' : 'Einmalig'}<//></td>
          <td>${(days.get(c.id) || []).map(d => T.WD[d]).join(' · ') || html`<span class="ui-muted">–</span>`}</td>
          <td class="ui-mono">${T.fmt.day(c.since)}</td>
          <td><${Btn} size="sm" variant="ghost" onClick=${e => { e.stopPropagation(); setOpen(c.id); }} aria-label=${'Details zu ' + c.name}>Details<//></td></tr>`)}</tbody></table></div>`
        : html`<div class="ui-card"><${Empty} icon="search" title="Keine Treffer" text="Ändern Sie Suche oder Filter." /></div>`}
      ${list.length > shown.length ? html`<div class="bo-more"><${Btn} variant="ghost" onClick=${() => setLimit(limit + PAGE)}>Mehr anzeigen (${list.length - shown.length} weitere)<//></div>` : null}
      ${cust ? html`<${Detail} s=${s} c=${cust} onClose=${() => setOpen(null)} />` : null}
    </div>`;
  }

  App.views = App.views || {};
  App.views.backoffice = App.views.backoffice || {};
  App.views.backoffice.kunden = Kunden;
})(typeof window !== 'undefined' ? window : globalThis);
