/* Backoffice › Übersicht (V3). Registriert App.views.backoffice.uebersicht und die kleinen Helfer App.boA (von den Nachbar-Views genutzt). */
(function (root) {
  const App = root.App = root.App || {};
  const { html } = App.lib;
  const { Btn, Kpi, Pill, StatusPill, Countdown, Icon, Empty } = App.ui;
  const T = App.time, F = App.fmt;

  /* ---------- gemeinsame Helfer ---------- */
  const B = App.boA = App.boA || {};
  B.regionOf = s => s.regions.find(r => r.id === s.ui.boRegion) || s.regions[0];
  B.go = (view, patch) => App.actions.setUi(Object.assign({ backofficeView: view }, patch || {}));
  B.head = (title, sub, right) => html`<div class="bo-hd"><div class="ui-grow"><h1>${title}</h1>${sub ? html`<p class="ui-muted">${sub}</p>` : null}</div>${right || null}</div>`;
  B.minus = s => String(s).replace('-', '−');
  B.estimateNote = () => {
    const e = App.config.economics || {}, d = e.purchaseDiscount != null ? e.purchaseDiscount : 0.10;
    return 'Schätzwerte: Einkauf = Ladenpreis −' + Math.round(d * 100) + ' %, Fahrer ' + F.eur(e.driverPerPiece || 0) + ' je Stück, alle Beträge netto';
  };
  B.plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  B.driversText = n => n + (n === 1 ? ' Fahrer' : ' Fahrern');

  /* ---------- Auslastung je Wochentag ---------- */
  function UtilChart({ util }) {
    const scale = Math.max.apply(null, util.map(u => Math.max(u.max, u.abo))) * 1.03 || 1;
    const pc = n => (n / scale * 100) + '%';
    return html`<div class="bo-chart" role="list" aria-label="Auslastung je Wochentag: Abo-Stopps gegen Kapazität">
      ${util.map(u => {
        const over = u.abo > u.max;
        const tone = over ? 'full' : u.pct >= 0.9 ? 'warn' : 'ok';
        const pct = Math.round(u.pct * 100);
        return html`<div class="bo-chart-row" role="listitem" key=${u.wd}
            aria-label=${T.WD_LONG[u.wd] + ': ' + u.abo + ' von ' + u.max + ' Plätzen, ' + pct + ' Prozent'}>
          <div class="bo-chart-day">${T.WD[u.wd]}</div>
          <div class="bo-chart-track">
            <div class="bo-chart-cap" style=${'width:' + pc(u.max)}></div>
            <div class=${'bo-chart-bar bo-chart-' + tone} style=${'width:' + pc(Math.min(u.abo, u.max))}></div>
            ${over ? html`<div class="bo-chart-over" style=${'left:' + pc(u.max) + ';width:' + pc(u.abo - u.max)}></div>` : null}
            <div class="bo-chart-line" style=${'left:' + pc(u.max)} title=${'Kapazität ' + u.max}></div>
          </div>
          <div class="bo-chart-val"><strong class=${'bo-chart-n bo-chart-n-' + tone}>${u.abo} / ${u.max}</strong>
            <span class="bo-chart-pct">${pct} %</span></div>
          <div class="bo-chart-st"><${StatusPill} effective=${u.effective} /></div>
        </div>`;
      })}
      <div class="bo-chart-legend"><span><i class="bo-lg bo-lg-bar"></i>Abo-Stopps</span><span><i class="bo-lg bo-lg-cap"></i>Kapazität (Fahrer × Stopps)</span><span><i class="bo-lg bo-lg-over"></i>Überbuchung</span></div>
    </div>`;
  }

  /* ---------- Empfehlungen ---------- */
  function Reco({ tone, icon, title, children, actions }) {
    return html`<div class=${'bo-reco bo-reco-' + tone}>
      <div class="bo-reco-ic"><${Icon} name=${icon} size=${20} /></div>
      <div class="bo-reco-main"><h3>${title}</h3><div class="bo-reco-text">${children}</div>
        ${actions ? html`<div class="ui-row bo-reco-act">${actions}</div>` : null}</div>
    </div>`;
  }

  function Recommendations({ s, region, util }) {
    const out = [];
    const rid = region.id;
    if (region.planned) {
      const n = s.waitlist.filter(w => w.regionId === rid && w.weekday == null && w.status === 'waiting').length;
      out.push(html`<${Reco} key="planned" tone="info" icon="map" title=${region.name + ' ist noch in Planung'}>
        ${n} von ${region.neededPrereg} Haushalten sind vorgemerkt. Touren und Kapazität gibt es erst nach dem Start.
        <//>`);
      return out;
    }
    util.filter(u => u.abo > u.max || (u.effective === 'full' && u.status !== 'closed' && u.freeAbo <= 0)).forEach(u => {
      const fe1 = App.sel.forecastEnd(s, rid, u.wd, u.drivers), fe2 = App.sel.forecastEnd(s, rid, u.wd, u.drivers + 1);
      const wait = App.sel.waitlistFor(s, rid, u.wd).length;
      const late = fe1.endMin - fe1.deadlineMin;
      const lines = [];
      lines.push(html`<span key="a">${T.WD_LONG[u.wd]} hat ${u.abo} Abo-Stopps bei ${u.max} Plätzen (${Math.round(u.pct * 100)} %). </span>`);
      lines.push(fe1.late
        ? html`<span key="b">Mit ${B.driversText(u.drivers)} endet die Tour um <strong class="bo-neg">${T.fmt.hm(fe1.endMin)}</strong>, ${B.plural(late, 'Minute', 'Minuten')} nach der Frist (${T.fmt.hm(fe1.deadlineMin)}). </span>`
        : html`<span key="b">Die Tour endet mit ${B.driversText(u.drivers)} um ${T.fmt.hm(fe1.endMin)}, noch pünktlich. </span>`);
      lines.push(html`<span key="c">Mit ${B.driversText(u.drivers + 1)} endet sie um <strong class=${fe2.late ? 'bo-neg' : 'bo-pos'}>${T.fmt.hm(fe2.endMin)}</strong>${fe2.late ? ' (immer noch zu spät)' : ' (pünktlich)'}. </span>`);
      if (wait) lines.push(html`<span key="d">${B.plural(wait, 'Interessent wartet', 'Interessenten warten')} auf diesen Tag und kann sofort benachrichtigt werden.</span>`);
      out.push(html`<${Reco} key=${'over' + u.wd} tone="full" icon="alert" title=${T.WD_LONG[u.wd] + ' ist überbucht'}
        actions=${[
          html`<${Btn} key="t" size="sm" variant="primary" icon="route" onClick=${() => B.go('touren', { boDate: fe1.dateKey })}>Touren ansehen<//>`,
          html`<${Btn} key="k" size="sm" variant="sun" icon="calendar" onClick=${() => B.go('kapazitaet', { capEdit: u.wd })}>${T.WD[u.wd]} mit ${u.drivers + 1} Fahrern öffnen<//>`
        ]}>${lines}<//>`);
    });
    const mid = util.filter(u => u.wd >= 1 && u.wd <= 4 && u.effective === 'free');
    if (mid.length) {
      const stops = mid.reduce((a, u) => a + u.abo, 0), max = mid.reduce((a, u) => a + u.max, 0);
      const freeSlots = mid.reduce((a, u) => a + Math.max(0, u.freeAbo), 0);
      const avg = Math.round(stops / max * 100);
      const eco = App.sel.weekdayEconomics(s, rid).filter(e => mid.some(u => u.wd === e.wd) && e.hours > 0).sort((a, b) => a.perHour - b.perHour)[0];
      const ecoText = eco ? ' Am schwächsten Tag (' + T.WD_LONG[eco.wd] + ', ' + eco.stops + ' Stopps, ' + Math.round(eco.km) + ' km) bleiben dem Fahrer nach Fahrzeugkosten ' + F.eur(eco.afterKm) + ', rund ' + F.eur(eco.perHour) + ' je Stunde.' : '';
      out.push(html`<${Reco} key="mid" tone="warn" icon="megaphone" title=${T.WD[mid[0].wd] + '–' + T.WD[mid[mid.length - 1].wd] + ' sind nur zu ' + avg + ' % ausgelastet'}
        actions=${[html`<${Btn} key="m" size="sm" variant="sun" icon="megaphone" onClick=${() => B.go('marketing')}>Aktion vorbereiten<//>`]}>
        ${freeSlots} Abo-Plätze sind frei (${stops} von ${max} belegt). Eine Aktion „Zustellung ${App.config.promo.weakDayFreeWeeks} Wochen gratis“ füllt diese Tage, ohne die vollen Tage weiter zu belasten.${ecoText}
      <//>`);
    }
    util.filter(u => u.effective === 'few').forEach(u => {
      out.push(html`<${Reco} key=${'few' + u.wd} tone="warn" icon="info" title=${T.WD_LONG[u.wd] + ': nur noch ' + B.plural(u.freeAbo, 'Platz', 'Plätze') + ' frei'}
        actions=${[html`<${Btn} key="f" size="sm" variant="ghost" icon="calendar" onClick=${() => B.go('kapazitaet', { capEdit: u.wd })}>Kapazität prüfen<//>`]}>
        ${u.abo} von ${u.max} Plätzen sind belegt. Kunden sehen „wenige Plätze“.
      <//>`);
    });
    if (!out.length) out.push(html`<${Reco} key="ok" tone="ok" icon="check" title="Alles im grünen Bereich">Kein Tag ist überbucht, kein Tag ist auffällig leer.<//>`);
    return out;
  }

  /* ---------- Heute zu tun ---------- */
  function Todo({ s, region }) {
    const dates = App.sel.bakeryDates(s);
    const first = dates[0];
    const items = [];
    if (first) {
      const cutoff = T.cutoffFor(first);
      const sent = s.bakeryOrders[first];
      items.push(html`<li key="cut" class="bo-todo"><div class="bo-todo-main"><strong>Bestellschluss ${T.fmt.rel(cutoff)}</strong>
        <span class="ui-muted">für ${dates.map(d => T.fmt.day(d)).join(', ')} · <${Countdown} to=${cutoff} /></span></div></li>`);
      items.push(html`<li key="bak" class="bo-todo"><div class="bo-todo-main"><strong>Bäckerbestellung</strong>
        <span class="ui-muted">${dates.length > 1 ? 'für ' + dates.length + ' Liefertage' : 'für ' + T.fmt.day(first)}</span></div>
        ${sent ? html`<${Pill} tone="ok" icon="check">gesendet um ${T.fmt.hm(new Date(sent.sentAt))}<//>` : html`<${Pill} tone="warn" icon="clock">noch nicht gesendet<//>`}
        <${Btn} size="sm" variant=${sent ? 'ghost' : 'sun'} onClick=${() => B.go('baecker')}>${sent ? 'Ansehen' : 'Bestellung prüfen'}<//></li>`);
      const t1 = T.nextDates(1)[0];
      const tsent = s.toursSent[region.id + '|' + t1];
      items.push(html`<li key="tour" class="bo-todo"><div class="bo-todo-main"><strong>Tour für ${T.fmt.day(t1)}</strong>
        <span class="ui-muted">an die Fahrer-App senden</span></div>
        ${tsent ? html`<${Pill} tone="ok" icon="check">gesendet um ${T.fmt.hm(new Date(tsent))}<//>` : html`<${Pill} tone="neutral" icon="clock">noch offen<//>`}
        <${Btn} size="sm" variant="ghost" onClick=${() => B.go('touren', { boDate: t1 })}>Zur Tour<//></li>`);
    }
    const today = T.today(), dmap = s.deliveries[today] || {};
    const problems = Object.keys(dmap).filter(id => dmap[id].status === 'problem').map(id => ({ c: App.sel.customer(s, id), d: dmap[id] }))
      .filter(x => x.c && x.c.regionId === region.id);
    problems.forEach((p, i) => items.push(html`<li key=${'p' + i} class="bo-todo"><div class="bo-todo-main"><strong>Problem bei ${p.c.name}</strong>
      <span class="ui-muted">${p.c.street} ${p.c.houseNo}, ${p.c.city} · ${p.d.reason || 'ohne Angabe'} · ${T.fmt.hm(new Date(p.d.at))}</span></div>
      <${Pill} tone="full" icon="alert">Zustellung offen<//></li>`));
    if (!problems.length) items.push(html`<li key="np" class="bo-todo"><div class="bo-todo-main"><strong>Keine offenen Probleme</strong><span class="ui-muted">Heute wurde keine Zustellung als Problem gemeldet.</span></div><${Pill} tone="ok" icon="check">in Ordnung<//></li>`);
    const waiting = s.waitlist.filter(w => w.regionId === region.id && w.status === 'waiting').length;
    if (waiting) items.push(html`<li key="wl" class="bo-todo"><div class="bo-todo-main"><strong>${B.plural(waiting, 'Person wartet', 'Personen warten')} auf einen Platz</strong>
      <span class="ui-muted">Sobald Platz frei ist, können Sie sie benachrichtigen.</span></div><${Btn} size="sm" variant="ghost" onClick=${() => B.go('warteliste')}>Warteliste<//></li>`);
    return html`<ul class="bo-todos">${items}</ul>`;
  }

  /* ---------- letzte Bestellungen ---------- */
  function latestOrders(s, region) {
    const rows = [];
    const inRegion = id => { const c = App.sel.customer(s, id); return c && c.regionId === region.id ? c : null; };
    const appOrderCustomers = new Set();
    s.notifications.filter(n => n.kind === 'order').forEach(n => {
      const c = inRegion(n.customerId);
      if (!c) return;
      appOrderCustomers.add(c.id);
      const subs = s.subs.filter(x => x.customerId === c.id).sort((a, b) => a.weekday - b.weekday);
      const fl = s.flexOrders.filter(f => f.customerId === c.id && f.status === 'confirmed').slice(-1)[0];
      let text;
      if (subs.length) text = 'Abo ' + subs.map(x => T.WD[x.weekday]).join(' + ') + ' · ' + F.eur(subs.reduce((a, x) => a + App.sel.priceBag(s, x.items, { wd: x.weekday }).total, 0)) + ' je Woche';
      else if (fl) text = 'Einmallieferung ' + T.fmt.day(fl.dateKey) + ' · ' + F.eur(App.sel.priceBag(s, fl.items, { wd: T.weekday(fl.dateKey) }).total);
      else text = n.title;
      rows.push({ at: n.createdAt, name: c.name, text, app: true, channel: n.channel });
    });
    s.flexOrders.filter(f => f.status === 'confirmed' && !appOrderCustomers.has(f.customerId)).forEach(f => {
      const c = inRegion(f.customerId);
      if (!c) return;
      rows.push({ at: f.createdAt, name: c.name, text: 'Einmallieferung ' + T.fmt.day(f.dateKey) + ' · ' + App.sel.itemsText(s, f.items, 2) + ' · ' + F.eur(App.sel.priceBag(s, f.items, { wd: T.weekday(f.dateKey) }).total), app: false });
    });
    return rows.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 7);
  }

  function Orders({ s, region }) {
    const rows = latestOrders(s, region);
    if (!rows.length) return html`<${Empty} icon="bag" title="Noch keine Bestellungen" text="Neue Bestellungen aus der Kunden-App erscheinen hier." />`;
    return html`<ul class="bo-lorders">${rows.map((r, i) => html`<li key=${i} class="bo-lorder">
      <span class="bo-lorder-time ui-mono">${T.fmt.rel(new Date(r.at))}</span>
      <span class="bo-lorder-main"><strong>${r.name}</strong><span class="ui-muted">${r.text}</span></span>
      ${r.app ? html`<${Pill} tone="info" icon="phone">Kunden-App<//>` : html`<${Pill} tone="neutral">Einmalig<//>`}</li>`)}</ul>`;
  }

  /* ---------- Deckungsbeitrag pro Woche ---------- */
  function Margin({ k }) {
    if (k.weeklyMargin == null) return null;
    const rows = [
      ['Warenumsatz (netto)', k.weeklyProductRevenue, 1], ['Zustellgebühren (netto)', k.weeklyFees, 1],
      ['Wareneinsatz (netto)', -k.weeklyGoodsCost, -1], ['Fahrervergütung (' + F.eur(App.config.economics.driverPerPiece) + ' je Stück, netto)', -k.weeklyDriverPay, -1]
    ];
    return html`<section class="ui-card bo-sec bo-margin" aria-labelledby="bo-h-m"><div class="bo-margin-top"><div><h2 id="bo-h-m">Deckungsbeitrag pro Woche (netto)</h2>
        <p class="ui-muted bo-sec-sub">aus den Abos dieses Gebiets, nach Ware und Fahrern</p></div>
        <div class=${'bo-margin-sum ' + (k.weeklyMargin < 0 ? 'bo-neg' : 'bo-pos')}>${F.eur(k.weeklyMargin)}</div></div>
      <dl class="bo-margin-rows">${rows.map(r => html`<div key=${r[0]} class="bo-margin-row"><dt>${r[1] < 0 ? '− ' : '+ '}${r[0]}</dt><dd class="ui-mono">${F.eur(Math.abs(r[1]))}</dd></div>`)}
        <div class="bo-margin-row bo-margin-total"><dt>= Deckungsbeitrag</dt><dd class="ui-mono">${F.eur(k.weeklyMargin)}</dd></div></dl>
      <p class="ui-muted bo-sec-sub">Die Zustellgebühr ist die wichtigste Ertragsquelle; die Gebäckpreise liegen nur knapp über dem Ladenpreis. ${B.estimateNote()}.</p></section>`;
  }

  /* ---------- Was die Tour je Wochentag bringt ---------- */
  function TourEco({ s, region, util }) {
    if (region.planned || !App.sel.weekdayEconomics) return null;
    const rows = App.sel.weekdayEconomics(s, region.id);
    const m = App.sel.marginalStop(s, region.id);
    const e = App.config.economics || {};
    const weak = wd => { const u = util[wd]; return u.effective === 'free' && u.pct <= App.config.promo.weakBelowPct; };
    const neg = n => B.minus(F.eur(n));
    return html`<section class="ui-card bo-sec" aria-labelledby="bo-h-eco"><h2 id="bo-h-eco">Was die Tour je Wochentag bringt</h2>
      <p class="ui-muted bo-sec-sub">Nächster Liefertag je Wochentag mit der hinterlegten Fahrerzahl, Fahrerwerte je Fahrer im Mittel.</p>
      <div class="ui-tablewrap"><table class="ui-table bo-eco"><thead><tr><th>Tag</th><th class="num">Stopps</th><th class="num">km</th><th class="num">Deckungsbeitrag Unternehmen</th>
        <th class="num">Fahrer: Vergütung</th><th class="num">nach Fahrzeugkosten</th><th class="num">je Stunde</th><th>Einschätzung</th></tr></thead>
        <tbody>${rows.map(r => html`<tr key=${r.wd} class=${weak(r.wd) ? 'bo-eco-weak' : ''}><td><strong>${T.WD[r.wd]}</strong><span class="ui-muted"> ${T.fmt.day(r.dateKey).split(' ')[1] || ''}</span></td>
          <td class="num">${r.stops}</td><td class="num">${Math.round(r.km)}</td><td class="num">${neg(r.businessMargin)}</td><td class="num">${F.eur(r.driverPay)}</td>
          <td class=${'num' + (r.afterKm < 0 ? ' bo-neg' : '')}>${neg(r.afterKm)}</td><td class=${'num' + (r.perHour < 0 ? ' bo-neg' : '')}><strong>${neg(r.perHour)}</strong></td>
          <td>${weak(r.wd) ? html`<${Pill} tone="warn" icon="alert">schwacher Tag<//>` : util[r.wd].effective === 'full' ? html`<${Pill} tone="full">ausgebucht<//>` : html`<${Pill} tone="ok" icon="check">gut gefüllt<//>`}</td></tr>`)}</tbody></table></div>
      <p class="bo-eco-sentence">Jeder zusätzliche Stopp bringt dem Unternehmen rund <strong>${F.eur(m.business)}</strong> und dem Fahrer rund <strong>${F.eur(m.driver)}</strong>.</p>
      <p class="ui-muted bo-sec-sub">Annahmen: Fahrer ${F.eur(e.driverPerPiece || 0)} je Stück, Fahrzeugkosten ${F.eur(e.kmCost || 0)} je km, alle Beträge netto, Einkaufspreise geschätzt. Größere und dichtere Touren machen schwache Tage für den Fahrer lohnender.</p></section>`;
  }

  /* ---------- Seite ---------- */
  function Uebersicht() {
    const s = App.useStore();
    const region = B.regionOf(s);
    const util = App.sel.utilization(s, region.id);
    const k = App.sel.kpis(s, region.id);
    const mon = util[0];
    const wb = App.config.promo.weakBelowPct;
    const over = util.filter(u => u.abo > u.max).map(u => T.WD_LONG[u.wd]);
    const headline = region.planned ? region.name + ' ist in Planung.'
      : (over.length ? over.join(' und ') + (over.length > 1 ? ' sind' : ' ist') + ' überbucht' : 'Kein Tag ist überbucht')
        + ' · ' + T.WD[1] + '–' + T.WD[4] + ' sind im Schnitt zu ' + F.pct(k.utilMidweek) + ' ausgelastet.';
    return html`<div class="bo-page">
      ${B.head('Übersicht', region.name + ' · ' + headline)}
      <div class="bo-kpis">
        <${Kpi} label="Haushalte" value=${k.households} sub=${k.weeklyStops + ' Abo-Stopps pro Woche'} />
        <${Kpi} label="Umsatz pro Woche (netto)" value=${F.eur(k.weeklyRevenue)} sub="aus Abos inkl. Zustellung" />
        <${Kpi} label="Auslastung Montag" value=${F.pct(k.utilMonday)} tone=${k.utilMonday > 1 ? 'full' : k.utilMonday >= 0.9 ? 'warn' : 'ok'} sub=${k.utilMonday > 1 ? 'überbucht' : 'der Plätze belegt'} />
        <${Kpi} label="Auslastung Di–Fr" value=${F.pct(k.utilMidweek)} tone=${k.utilMidweek < wb ? 'warn' : 'ok'} sub=${k.utilMidweek < wb ? 'viel freie Kapazität' : 'der Plätze belegt'} />
        <${Kpi} label="Warteliste" value=${k.waitlist} tone=${k.waitlist ? 'info' : undefined} sub=${k.waitlist ? 'warten auf einen Platz' : 'niemand wartet'} />
        <${Kpi} label="Einmallieferungen" value=${k.flexNext7} sub="in den nächsten 7 Tagen" />
      </div>
      <${Margin} k=${k} />
      <div class="bo-grid2">
        <section class="ui-card bo-sec" aria-labelledby="bo-h-chart"><h2 id="bo-h-chart">Auslastung je Wochentag</h2>
          <p class="ui-muted bo-sec-sub">Abo-Stopps gegen die Kapazität (Fahrer × Stopps je Fahrer).</p>
          <${UtilChart} util=${util} /></section>
        <section class="ui-card bo-sec" aria-labelledby="bo-h-reco"><h2 id="bo-h-reco">Empfehlungen</h2>
          <div class="ui-stack bo-recos"><${Recommendations} s=${s} region=${region} util=${util} /></div></section>
      </div>
      <${TourEco} s=${s} region=${region} util=${util} />
      <div class="bo-grid2">
        <section class="ui-card bo-sec" aria-labelledby="bo-h-todo"><h2 id="bo-h-todo">Heute zu tun</h2><${Todo} s=${s} region=${region} /></section>
        <section class="ui-card bo-sec" aria-labelledby="bo-h-ord"><h2 id="bo-h-ord">Letzte Bestellungen</h2><${Orders} s=${s} region=${region} /></section>
      </div>
    </div>`;
  }

  App.views = App.views || {};
  App.views.backoffice = App.views.backoffice || {};
  App.views.backoffice.uebersicht = Uebersicht;
})(typeof window !== 'undefined' ? window : globalThis);
