/* Fahrer-App › Tour (V4): Fortschritt, Stopps als Lieferzettel, „Zugestellt & weiter“ mit Google-Maps-Link, Problem melden, Ladeliste. */
(function (root) {
  const App = root.App = root.App || {};
  const { html, useState } = App.lib;
  const { Icon, Btn, Pill, Segmented, Sheet, Bar, Empty, toast } = App.ui;
  const T = App.time;

  const REASONS = ['Niemand erreichbar', 'Zugang nicht möglich', 'Adresse nicht gefunden', 'Ablageort blockiert', 'Lieferung abgelehnt', 'Sonstiges'];
  const hm = (m) => T.fmt.hm(m);

  const pcs = (items) => App.sel.pieces(items);

  function placementText(c) {
    const lab = App.config.labels.placement;
    if (c.placement === 'hinweis') return c.note ? c.note : lab.hinweis;
    return lab[c.placement] || '';
  }

  function Tags({ st, isNew }) {
    const one = st.kinds.indexOf('abo') < 0;
    if (!one && !isNew) return null;
    return html`<span class="fa-tags">${one ? html`<${Pill} tone="kraft">einmalig<//>` : null}${isNew ? html`<${Pill} tone="info">neu<//>` : null}</span>`;
  }

  function DoneRow({ st, d, onUndo }) {
    const bad = d.status === 'problem';
    return html`<li class=${'fa-done' + (bad ? ' is-problem' : '')}>
      <span class="fa-done-ic"><${Icon} name=${bad ? 'alert' : 'check'} size=${16} /></span>
      <div class="fa-done-main"><strong>${st.seq} · ${st.customer.street} ${st.customer.houseNo}</strong>
        <span class="ui-muted">${bad ? 'Problem' + (d.reason ? ': ' + d.reason : '') : 'zugestellt'} · ${hm(new Date(d.at))}</span></div>
      <${Btn} variant="quiet" size="sm" icon="refresh" onClick=${onUndo}>Rückgängig<//>
    </li>`;
  }

  function Ticket({ s, st, next, following, onDone, onProblem, isNew }) {
    const c = st.customer;
    const navUrl = App.sel.mapsUrl(s, st.customerId);
    return html`<li class=${'fa-ticket' + (next ? ' is-next' : '')} aria-current=${next ? 'step' : undefined}>
      <div class="fa-t-top"><span class="fa-no ui-mono">${st.seq}</span><span class="fa-eta ui-mono">${hm(st.etaMin)}</span>
        ${next ? html`<${Pill} tone="sun">Nächster Stopp<//>` : null}<${Tags} st=${st} isNew=${isNew} /></div>
      <div class="fa-addr">${c.street} ${c.houseNo}</div>
      <div class="fa-name">${c.name} · ${c.plz} ${c.city}</div>
      <div class="fa-tear"></div>
      <div class="fa-items">${App.sel.itemsText(s, st.items, 99)}</div>
      <div class="fa-place"><${Icon} name="door" size=${16} /><span>${placementText(c)}</span></div>
      ${next ? html`<div class="fa-actions">
        ${following
          ? html`<${Btn} variant="sun" size="lg" full icon="check" href=${App.sel.mapsUrl(s, following.customerId)} target="_blank" rel="noopener" onClick=${onDone}>Zugestellt & weiter<//>
            <div class="fa-hint ui-muted">Verbucht diesen Stopp und öffnet die Navigation zu ${following.customer.street} ${following.customer.houseNo}.</div>`
          : html`<${Btn} variant="sun" size="lg" full icon="check" onClick=${onDone}>Zugestellt – letzter Stopp<//>`}
        <div class="fa-actions-row">
          ${following ? html`<${Btn} variant="primary" icon="check" onClick=${onDone} class="fa-only" data-only="1">Nur zugestellt<//>` : null}
          <${Btn} variant="ghost" icon="map" href=${navUrl} target="_blank" rel="noopener">Navigation<//>
          <${Btn} variant="ghost" icon="alert" onClick=${onProblem}>Problem melden<//>
        </div></div>`
        : html`<div class="fa-actions-row">
          <${Btn} variant="ghost" size="sm" icon="map" href=${navUrl} target="_blank" rel="noopener">Navigation<//>
          <${Btn} variant="quiet" size="sm" icon="alert" onClick=${onProblem}>Problem melden<//></div>`}
    </li>`;
  }

  function Tour() {
    const s = App.useStore();
    const [problem, setProblem] = useState(null);
    const [showDone, setShowDone] = useState(false);
    const [showLoad, setShowLoad] = useState(false);
    const reg0 = App.sel.region(s, s.ui.boRegion);
    const regionId = reg0 && !reg0.planned ? reg0.id : 'nord';
    const date = s.ui.driverDate, today = T.today();
    const plan = App.sel.tourPlan(s, regionId, date);
    const tour = plan.tours[s.ui.driverIdx];
    const dateSeg = [{ value: today, label: 'Heute · ' + T.fmt.day(today) }, { value: T.addDays(today, 1), label: 'Morgen · ' + T.fmt.day(T.addDays(today, 1)) }];
    const seg = html`<${Segmented} full label="Tag wählen" value=${date} options=${dateSeg} onChange=${(v) => App.actions.setUi({ driverDate: v })} />`;

    if (!tour || !tour.stops.length) {
      const d = (s.drivers || [])[s.ui.driverIdx];
      return html`<div class="fa-tour">${seg}<${Empty} icon="truck" title="Keine Tour für Sie"
        text=${(d ? d.name + ' hat' : 'Sie haben') + ' am ' + T.fmt.dayLong(date) + ' keine Tour. Es sind ' + plan.tours.length + ' Fahrer eingeplant.'} /></div>`;
    }

    const stops = tour.stops;
    const handled = stops.filter((st) => st.delivery);
    const open = stops.filter((st) => !st.delivery);
    const nextId = open.length ? open[0].customerId : null;
    const problems = handled.filter((st) => st.delivery.status === 'problem').length;
    const lateMin = tour.endMin - plan.deadlineMin;
    const newSince = T.addDays(today, -14);
    const recentDone = handled.slice(-3);
    const doneShown = showDone ? handled : recentDone;

    const loads = {};
    stops.forEach((st) => Object.keys(st.items).forEach((id) => { loads[id] = (loads[id] || 0) + st.items[id]; }));
    const loadList = s.products.filter((p) => loads[p.id]);
    const loadTotal = loadList.reduce((n, p) => n + loads[p.id], 0);

    const rate = App.config.economics.driverPerPiece;
    const doneStops = stops.filter((st) => st.delivery && st.delivery.status === 'delivered');
    const piecesDone = doneStops.reduce((n, st) => n + pcs(st.items), 0);
    const piecesAll = stops.reduce((n, st) => n + pcs(st.items), 0);
    const markDone = (st) => App.actions.markStop(date, st.customerId, 'delivered');
    const routeIds = open.slice(0, 10).map((st) => st.customerId);

    return html`<div class="fa-tour">
      ${seg}
      <section class="fa-head" aria-label="Fortschritt">
        <div class="fa-head-top"><div class="fa-prog"><b class="ui-mono">${handled.length}</b> von ${stops.length}</div>
          <span class="ui-muted">erledigt${problems ? ' · ' + problems + (problems === 1 ? ' Problem' : ' Probleme') : ''}</span></div>
        <${Bar} value=${handled.length} max=${stops.length} tone="ok" label="Fortschritt" />
        <div class="fa-head-facts">
          <div><span>Ende ca.</span><b class=${'ui-mono ' + (lateMin > 0 ? 'is-late' : '')}>${hm(tour.endMin)}</b></div>
          <div><span>Deadline</span><b class="ui-mono">${hm(plan.deadlineMin)}</b></div>
          <div><span>Start</span><b class="ui-mono">${hm(tour.startMin)}</b></div>
        </div>
        ${html`<div class="fa-earn"><span>Ihr Verdienst heute</span><b class="ui-mono">${App.fmt.eur(piecesDone * rate)}</b><span class="ui-muted">von ca. ${App.fmt.eur(piecesAll * rate)} · ${piecesDone} von ${piecesAll} Stück</span></div>`}
        ${lateMin > 0 ? html`<div class="fa-late"><${Icon} name="alert" size=${16} /> ${lateMin} Min nach der Deadline – die Disposition ist informiert.</div>` : null}
      </section>

      ${open.length ? html`<${Btn} variant="primary" full icon="route" href=${App.sel.mapsRouteUrl(s, routeIds)} target="_blank" rel="noopener">Nächste ${routeIds.length} Stopps als Route öffnen<//>` : null}

      <section class="fa-load">
        <button type="button" class="fa-load-btn" aria-expanded=${showLoad ? 'true' : 'false'} onClick=${() => setShowLoad(!showLoad)}>
          <${Icon} name="bag" size=${18} /><strong>Ladeliste</strong><span class="ui-muted">${loadTotal} Stück</span><span class="ui-grow"></span><${Icon} name=${showLoad ? 'chevron-up' : 'chevron-down'} size=${18} /></button>
        ${showLoad ? html`<ul class="fa-load-list">${loadList.map((p) => html`<li key=${p.id}><span class="ui-mono fa-load-n">${loads[p.id]}×</span><span>${p.name}</span></li>`)}</ul>` : null}
      </section>

      ${handled.length ? html`<section aria-label="Erledigte Stopps">
        ${handled.length > recentDone.length ? html`<button type="button" class="fa-more" onClick=${() => setShowDone(!showDone)}>${showDone ? 'Erledigte ausblenden' : 'Alle ' + handled.length + ' erledigten anzeigen'}</button>` : null}
        <ul class="fa-done-list">${doneShown.map((st) => html`<${DoneRow} key=${st.customerId} st=${st} d=${st.delivery} onUndo=${() => App.actions.undoStop(date, st.customerId)} />`)}</ul></section>` : null}

      ${open.length === 0 ? html`<div class="fa-finished"><${Icon} name="check" size=${28} /><div><strong>Tour abgeschlossen</strong><div class="ui-muted">Alle ${stops.length} Stopps sind erledigt. Danke!</div></div></div>` : null}

      <ol class="fa-list" aria-label="Offene Stopps">
        ${open.map((st, i) => html`<${Ticket} key=${st.customerId} s=${s} st=${st} next=${i === 0} following=${open[i + 1]}
          isNew=${st.customer.since >= newSince}
          onDone=${() => markDone(st)} onProblem=${() => setProblem(st)} />`)}
      </ol>

      <p class="fa-note ui-muted">Die Demo-Adressen sind erfunden. In der echten Version stehen hier die Kundenadressen.</p>

      <${Sheet} open=${!!problem} onClose=${() => setProblem(null)} title="Problem melden">
        ${problem ? html`<p class="ui-muted" style="margin-top:0">${problem.seq} · ${problem.customer.street} ${problem.customer.houseNo}. Was ist passiert?</p>
          <div class="fa-reasons">${REASONS.map((r) => html`<${Btn} key=${r} variant="ghost" full onClick=${() => {
            App.actions.markStop(date, problem.customerId, 'problem', r);
            toast('Problem gemeldet: ' + r, 'warn');
            setProblem(null);
          }}>${r}<//>`)}</div>` : null}
      <//>
    </div>`;
  }

  App.views = App.views || {};
  App.views.driver = App.views.driver || {};
  App.views.driver.tour = Tour;
})(typeof window !== 'undefined' ? window : globalThis);
