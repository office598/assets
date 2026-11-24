/* Backoffice › Touren (V4): Datum, Fahrer-Was-wäre-wenn, schematische Karte, Stoppliste, „An Fahrer-App senden“. */
(function (root) {
  const App = root.App = root.App || {};
  const { html, h, useState, useEffect, useRef } = App.lib;
  const { Icon, Btn, Pill, Stepper, Chip, Empty, toast } = App.ui;
  const T = App.time;

  /* Je Fahrer: Tonfarbe + Strichmuster + Markenform (nicht nur Farbe unterscheidet) */
  const TONES = ['var(--info)', 'var(--sun-text)', 'var(--ok)', 'var(--berry)'];
  const DASH = ['', '9 5', '1.5 5', '11 4 2 4'];
  const SHAPE_NAMES = ['Kreis', 'Quadrat', 'Dreieck', 'Raute'];

  const hm = (m) => T.fmt.hm(m);
  const mm = (n) => (n === 1 ? '1 Min' : n + ' Min');

  function shape(i, x, y, r) {
    switch (i % 4) {
      case 0: return h('circle', { cx: x, cy: y, r });
      case 1: return h('rect', { x: x - r, y: y - r, width: 2 * r, height: 2 * r, rx: 1.5 });
      case 2: return h('path', { d: `M${x} ${y - r * 1.2}L${x + r * 1.15} ${y + r * .9}L${x - r * 1.15} ${y + r * .9}Z` });
      default: return h('path', { d: `M${x} ${y - r * 1.35}L${x + r * 1.35} ${y}L${x} ${y + r * 1.35}L${x - r * 1.35} ${y}Z` });
    }
  }

  function placementText(s, c) {
    const lab = App.config.labels.placement;
    if (c.placement === 'hinweis') return c.note ? 'Hinweis: ' + c.note : lab.hinweis;
    return lab[c.placement] || '';
  }
  const perDriver = (s, regionId, date, drivers) => App.sel.tourEconomics(s, regionId, date, drivers).perDriver;
  const addr = (c) => c.street + ' ' + c.houseNo;

  /* ---------- Karte ---------- */
  function MapView({ s, region, plan, active, setActive }) {
    const wrap = useRef(null);
    const [w, setW] = useState(640);
    useEffect(() => {
      const el = wrap.current;
      if (!el) return undefined;
      const measure = () => { const cw = Math.floor(el.getBoundingClientRect().width); if (cw > 120) setW(cw); };
      measure();
      let ro = null;
      if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(measure); ro.observe(el); }
      else window.addEventListener('resize', measure);
      return () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', measure); };
    }, []);

    const a = region.area, bk = region.bakery;
    const xs = [a.x0, a.x1, bk.x], ys = [a.y0, a.y1, bk.y];
    region.clusters.forEach((c) => { xs.push(c.x); ys.push(c.y); });
    plan.tours.forEach((t) => t.stops.forEach((st) => { xs.push(st.customer.x); ys.push(st.customer.y); }));
    const pad = 0.4;
    const x0 = Math.min.apply(null, xs) - pad, x1 = Math.max.apply(null, xs) + pad;
    const y0 = Math.min.apply(null, ys) - pad, y1 = Math.max.apply(null, ys) + pad;
    const sc = w / (x1 - x0);
    const H = Math.round((y1 - y0) * sc);
    const X = (x) => Math.round((x - x0) * sc * 10) / 10;
    const Y = (y) => Math.round((y - y0) * sc * 10) / 10;
    const clampX = (x, wd) => Math.max(4, Math.min(w - wd - 4, x));
    const clampY = (y, hh) => Math.max(hh + 4, Math.min(H - 4, y));

    /* Straßen: Bäckerei zu jedem Ortsteil (leicht gebogen) + Ortsteile untereinander */
    const roads = [];
    const curve = (p, q, k) => {
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, dx = q.x - p.x, dy = q.y - p.y;
      return `M${X(p.x)} ${Y(p.y)}Q${X(mx - dy * k)} ${Y(my + dx * k)} ${X(q.x)} ${Y(q.y)}`;
    };
    region.clusters.forEach((c, i) => roads.push(curve(bk, c, i % 2 ? 0.14 : -0.14)));
    const byX = region.clusters.slice().sort((p, q) => p.x - q.x);
    for (let i = 0; i < byX.length - 1; i++) roads.push(curve(byX[i], byX[i + 1], i % 2 ? -0.1 : 0.1));
    roads.push(`M${X(a.x0 - 0.3)} ${Y(bk.y + 0.7)}C${X(a.x0 + 1.4)} ${Y(bk.y + 0.1)} ${X(a.x1 - 1.4)} ${Y(bk.y + 1.3)} ${X(a.x1 + 0.3)} ${Y(bk.y + 0.6)}`);
    const rx = a.x0 + (a.x1 - a.x0) * 0.62;
    const river = `M${X(rx)} ${Y(y0)}C${X(rx - 0.9)} ${Y(a.y0 + 1.2)} ${X(rx + 0.8)} ${Y(a.y0 + 2.4)} ${X(rx - 0.2)} ${Y(y1)}`;

    /* Beschriftungen: je Kandidatenposition die Zahl der Überdeckungen zählen und die freieste wählen */
    const pts = [];
    const tags = [];
    plan.tours.forEach((t) => t.stops.forEach((st) => {
      const px = X(st.customer.x), py = Y(st.customer.y);
      pts.push([px, py]);
      if (st.seq % 5 === 0) { const tw = String(st.seq).length * 7 + 9; tags.push({ x: clampX(px + 7, tw), y: clampY(py - 7, 15) - 14, w: tw, h: 15 }); }
    }));
    const placed = [{ x: X(bk.x) - 12, y: Y(bk.y) - 12, w: 24, h: 24 }].concat(tags);
    const hit = (r, q) => !(r.x + r.w < q.x || q.x + q.w < r.x || r.y + r.h < q.y || q.y + q.h < r.y);
    const place = (lw, lh, cands) => {
      let best = null;
      cands.forEach((c) => {
        const r = { x: clampX(c[0], lw), y: Math.max(4, Math.min(H - lh - 4, c[1])), w: lw, h: lh };
        let sc2 = 0;
        pts.forEach((p) => { if (p[0] > r.x - 5 && p[0] < r.x + r.w + 5 && p[1] > r.y - 5 && p[1] < r.y + r.h + 5) sc2 += 1; });
        placed.forEach((q) => { if (hit(r, q)) sc2 += 6; });
        if (!best || sc2 < best.sc) best = { r, sc: sc2 };
      });
      placed.push(best.r);
      return best.r;
    };
    const bkW = bk.name.length * 6.4 + 12;
    const bkPos = place(bkW, 19, [[X(bk.x) - bkW / 2, Y(bk.y) + 15], [X(bk.x) - bkW / 2, Y(bk.y) - 34], [X(bk.x) + 15, Y(bk.y) - 9], [X(bk.x) - bkW - 15, Y(bk.y) - 9]]);
    const townPos = region.clusters.map((c) => {
      const lw = c.name.length * 6.2 + 6, lh = 14, cx0 = X(c.x), cy0 = Y(c.y), rr = Math.max(14, (c.spread || 0.5) * 1.5 * sc);
      const r = place(lw, lh, [[cx0 - lw / 2, cy0 - rr - lh - 2], [cx0 - lw / 2, cy0 + rr + 2], [cx0 - lw / 2, cy0 - lh / 2], [cx0 + rr * 0.6, cy0 - lh / 2], [cx0 - rr * 0.6 - lw, cy0 - lh / 2]]);
      return { c, r };
    });

    const act = active ? (() => {
      for (let ti = 0; ti < plan.tours.length; ti++) {
        const st = plan.tours[ti].stops.find((q) => q.customerId === active);
        if (st) return { st, ti, tour: plan.tours[ti] };
      }
      return null;
    })() : null;

    let tip = null;
    if (act) {
      const px = X(act.st.customer.x), py = Y(act.st.customer.y);
      const txt = act.tour.driver.name + ' · Nr. ' + act.st.seq + ' · ' + hm(act.st.etaMin) + ' · ' + addr(act.st.customer);
      const tw = Math.round(txt.length * 6.3 + 18), th = 24;
      const tx = clampX(px - tw / 2, tw);
      const below = py - th - 14 < 4;
      const ty = below ? Math.min(H - th - 4, py + 14) : py - th - 12;
      tip = html`<g class="bo-map-tip" pointer-events="none"><rect x=${tx} y=${ty} width=${tw} height=${th} rx="7" /><text x=${tx + 9} y=${ty + 16}>${txt}</text></g>`;
    }

    return html`<div class="bo-map" ref=${wrap}>
      <svg width=${w} height=${H} viewBox=${'0 0 ' + w + ' ' + H} role="img"
        aria-label=${'Schematische Karte mit ' + plan.stops + ' Stopps und ' + plan.tours.length + ' Tour(en)'} onClick=${(e) => { if (e.target.tagName === 'svg' || e.target.tagName === 'rect') setActive(null); }}>
        <rect class="bo-map-bg" x="0" y="0" width=${w} height=${H} />
        <path class="bo-map-river" d=${river} />
        <rect class="bo-map-area" x=${X(a.x0)} y=${Y(a.y0)} width=${(a.x1 - a.x0) * sc} height=${(a.y1 - a.y0) * sc} rx="18" />
        ${region.clusters.map((c) => html`<circle key=${c.id} class="bo-map-town" cx=${X(c.x)} cy=${Y(c.y)} r=${Math.max(14, (c.spread || 0.5) * 1.5 * sc)} />`)}
        <g class="bo-map-roads">${roads.map((d, i) => html`<path key=${i} class="bo-map-road-b" d=${d} />`)}${roads.map((d, i) => html`<path key=${'w' + i} class="bo-map-road-w" d=${d} />`)}</g>
        ${plan.tours.map((t, ti) => {
          const pts = [[bk.x, bk.y]].concat(t.stops.map((st) => [st.customer.x, st.customer.y]));
          return html`<polyline key=${'r' + ti} class="bo-map-route" points=${pts.map((p) => X(p[0]) + ',' + Y(p[1])).join(' ')}
            stroke=${TONES[ti % 4]} stroke-dasharray=${DASH[ti % 4] || undefined} />`;
        })}
        ${townPos.map((o) => html`<text key=${'l' + o.c.id} class="bo-map-label" x=${o.r.x + o.r.w / 2} y=${o.r.y + 11} text-anchor="middle">${o.c.name}</text>`)}
        ${plan.tours.map((t, ti) => html`<g key=${'s' + ti} fill=${TONES[ti % 4]} class="bo-map-stops">${t.stops.map((st) => {
          const px = X(st.customer.x), py = Y(st.customer.y), one = st.kinds.indexOf('abo') < 0, on = st.customerId === active;
          return html`<g key=${st.customerId} class=${'bo-map-stop' + (on ? ' is-on' : '')} onMouseEnter=${() => setActive(st.customerId)} onMouseLeave=${() => setActive(null)}
              onClick=${(e) => { e.stopPropagation(); setActive(on ? null : st.customerId); }}>
            <circle class="bo-map-hit" cx=${px} cy=${py} r="11" />
            ${one ? html`<circle class="bo-map-oneoff" cx=${px} cy=${py} r="8.5" />` : null}
            ${shape(ti, px, py, on ? 6.5 : 4.6)}
          </g>`;
        })}</g>`)}
        ${plan.tours.map((t, ti) => t.stops.filter((st) => st.seq % 5 === 0).map((st) => {
          const txt = String(st.seq), tw = txt.length * 7 + 9;
          const tx = clampX(X(st.customer.x) + 7, tw), ty = clampY(Y(st.customer.y) - 7, 15);
          return html`<g key=${'n' + ti + '-' + st.seq} class="bo-map-no" pointer-events="none"><rect x=${tx} y=${ty - 14} width=${tw} height="15" rx="7.5" fill=${TONES[ti % 4]} />
            <text x=${tx + tw / 2} y=${ty - 3} text-anchor="middle">${txt}</text></g>`;
        }))}
        <g class="bo-map-bakery">
          <rect x=${X(bk.x) - 11} y=${Y(bk.y) - 11} width="22" height="22" rx="6" />
          <path d=${`M${X(bk.x) - 6} ${Y(bk.y) + 1}l6 -5.5l6 5.5v5h-12z`} />
        </g>
        <g class="bo-map-bakery-label" pointer-events="none"><rect x=${bkPos.x} y=${bkPos.y} width=${bkPos.w} height=${bkPos.h} rx="6" /><text x=${bkPos.x + bkPos.w / 2} y=${bkPos.y + 13.5} text-anchor="middle">${bk.name}</text></g>
        ${tip}
      </svg>
    </div>`;
  }

  function Legend({ plan }) {
    return html`<ul class="bo-legend" aria-label="Legende">
      ${plan.tours.map((t, ti) => html`<li key=${ti}>
        <svg width="46" height="16" viewBox="0 0 46 16" aria-hidden="true"><line x1="2" y1="8" x2="44" y2="8" stroke=${TONES[ti % 4]} stroke-width="2.6" stroke-linecap="round" stroke-dasharray=${DASH[ti % 4] || undefined} />
          <g fill=${TONES[ti % 4]} stroke="var(--surface)" stroke-width="1.5">${shape(ti, 23, 8, 5)}</g></svg>
        <span>${t.driver.name}${plan.tours.length > 1 ? ' · ' + SHAPE_NAMES[ti % 4] : ''}</span></li>`)}
      <li><svg width="22" height="16" viewBox="0 0 22 16" aria-hidden="true"><circle cx="11" cy="8" r="7" fill="none" stroke="var(--ink)" stroke-width="1.5" /><circle cx="11" cy="8" r="3.6" fill="var(--muted)" /></svg><span>Einmallieferung (Ring)</span></li>
      <li><svg width="22" height="16" viewBox="0 0 22 16" aria-hidden="true"><rect x="3" y="1" width="16" height="14" rx="4" fill="var(--night)" stroke="var(--muted)" stroke-width="1" /></svg><span>Bäckerei</span></li>
      <li><span class="bo-legend-no">5</span><span>Jeder 5. Stopp beschriftet; Nummer sonst bei Hover/Tippen</span></li>
    </ul>`;
  }

  /* ---------- Stoppliste ---------- */
  function TourBlock({ s, t, ti, plan, active, setActive, date, eco }) {
    const dl = plan.deadlineMin;
    return html`<section class="bo-tour" aria-label=${'Tour ' + t.driver.name}>
      <header class="bo-tour-head">
        <svg width="34" height="16" viewBox="0 0 34 16" aria-hidden="true"><line x1="1" y1="8" x2="33" y2="8" stroke=${TONES[ti % 4]} stroke-width="2.6" stroke-linecap="round" stroke-dasharray=${DASH[ti % 4] || undefined} />
          <g fill=${TONES[ti % 4]} stroke="var(--surface)" stroke-width="1.5">${shape(ti, 17, 8, 4.6)}</g></svg>
        <div class="ui-grow"><strong>${t.driver.name}</strong>
          <div class="ui-muted bo-small">${t.stops.length} Stopps · ${Math.round(t.km * 10) / 10} km · ${hm(t.startMin)} bis ${hm(t.endMin)}</div>
          ${eco ? html`<div class="bo-small bo-tour-pay"><span>${eco.pieces} Stück</span>${eco.pay != null ? html`<span>Vergütung <strong>${App.fmt.eur(eco.pay)}</strong></span>` : null}</div>` : null}</div>
        ${t.endMin > dl ? html`<${Pill} tone="full" icon="alert">${mm(t.endMin - dl)} zu spät<//>` : html`<${Pill} tone="ok" icon="check">pünktlich<//>`}
      </header>
      <ol class="bo-stops">
        ${t.stops.map((st) => {
          const c = st.customer, d = st.delivery, on = active === st.customerId;
          return html`<li key=${st.customerId} class=${'bo-stop' + (on ? ' is-on' : '')} onMouseEnter=${() => setActive(st.customerId)} onMouseLeave=${() => setActive(null)} onClick=${() => setActive(on ? null : st.customerId)}>
            <span class="bo-stop-no ui-mono" style=${'--tone:' + TONES[ti % 4]}>${st.seq}</span>
            <div class="bo-stop-main">
              <div class="bo-stop-top"><strong>${addr(c)}</strong><span class="bo-stop-eta ui-mono">${hm(st.etaMin)}</span></div>
              <div class="ui-muted bo-small">${c.name} · ${c.plz} ${c.city}</div>
              <div class="bo-stop-items">${App.sel.itemsText(s, st.items, 4)}</div>
              <div class="bo-small ui-muted">${placementText(s, c)}</div>
              ${st.kinds.indexOf('abo') < 0 || d ? html`<div class="bo-stop-tags">
                ${st.kinds.indexOf('abo') < 0 ? html`<${Pill} tone="kraft">einmalig<//>` : null}
                ${d && d.status === 'delivered' ? html`<${Pill} tone="ok" icon="check">zugestellt ${hm(new Date(d.at))}<//>` : null}
                ${d && d.status === 'problem' ? html`<${Pill} tone="full" icon="alert">Problem${d.reason ? ': ' + d.reason : ''}<//>` : null}
              </div>` : null}
            </div>
          </li>`;
        })}
      </ol>
    </section>`;
  }

  /* ---------- Ansicht ---------- */
  function Touren() {
    const s = App.useStore();
    const regionId = s.ui.boRegion, region = App.sel.region(s, regionId);
    const dates = T.nextDates(7);
    if (dates.indexOf(s.ui.boDate) < 0) dates.unshift(s.ui.boDate);
    const date = s.ui.boDate, wd = T.weekday(date);
    const [ov, setOv] = useState({});
    const [active, setActive] = useState(null);
    const key = regionId + '|' + date;

    if (!region || region.planned) {
      return html`<div class="bo-touren"><h2 class="bo-h">Touren</h2><${Empty} icon="route" title="Gebiet in Planung" text=${(region ? region.name : 'Dieses Gebiet') + ' hat noch keine Zustellungen. Wählen Sie oben ein anderes Gebiet.'} /></div>`;
    }

    const cap = App.sel.cap(s, regionId, wd);
    const drivers = ov[key] != null ? ov[key] : cap.drivers;
    const plan = App.sel.tourPlan(s, regionId, date, drivers);
    const lateMin = plan.endMin - plan.deadlineMin;
    const oneoff = plan.tours.reduce((n, t) => n + t.stops.filter((st) => st.kinds.indexOf('abo') < 0).length, 0);
    const sentAt = s.toursSent[key];
    const changed = drivers !== cap.drivers;
    const startMin = plan.tours.length ? plan.tours[0].startMin : 0;
    const setDrivers = (n) => { setOv(Object.assign({}, ov, { [key]: n })); setActive(null); };

    const apply = () => {
      App.actions.setCapacity(regionId, wd, { drivers });
      setOv(Object.assign({}, ov, { [key]: undefined }));
      toast(T.WD_LONG[wd] + ': ' + drivers + (drivers === 1 ? ' Fahrer' : ' Fahrer') + ' in die Kapazität übernommen.', 'ok');
    };
    const send = () => { App.actions.sendTour(regionId, date); toast('Tour an die Fahrer-App gesendet.', 'ok'); };

    const eco = perDriver(s, regionId, date, drivers);
    const compare = [1, 2, 3].map((n) => ({ n, p: App.sel.tourPlan(s, regionId, date, n) }));

    return html`<div class="bo-touren">
      <div class="bo-head">
        <div><div class="ui-eyebrow">${region.name}</div><h2 class="bo-h">Touren · ${T.fmt.dayLong(date)}</h2></div>
      </div>

      <div class="bo-datestrip" role="group" aria-label="Datum wählen">
        ${dates.map((k) => {
          const p = App.sel.tourPlan(s, regionId, k);
          return html`<button type="button" key=${k} class=${'bo-date' + (k === date ? ' is-on' : '')} aria-pressed=${k === date ? 'true' : 'false'}
            onClick=${() => { App.actions.setUi({ boDate: k }); setActive(null); }}>
            <span class="bo-date-d">${T.fmt.day(k)}</span>
            <span class=${'bo-date-m ui-mono' + (p.late ? ' is-late' : '')}>${p.stops} · ${p.late ? 'zu spät' : 'pünktlich'}</span></button>`;
        })}
      </div>

      <div class=${'bo-verdict ' + (plan.late ? 'is-late' : 'is-ok')} role="status">
        <${Icon} name=${plan.late ? 'alert' : 'check'} size=${28} />
        <div>
          <div class="bo-verdict-t">${plan.late
            ? 'Tourende ' + hm(plan.endMin) + ' – ' + mm(lateMin) + ' nach der Deadline'
            : 'Tourende ' + hm(plan.endMin) + ' – ' + mm(-lateMin) + ' vor der Deadline'}</div>
          <div class="bo-verdict-s">Deadline ${hm(plan.deadlineMin)} · ${plan.late ? 'Die Zustellung wird nicht rechtzeitig fertig. Mehr Fahrer einplanen.' : 'Alle Sackerl hängen rechtzeitig an der Tür.'}</div>
        </div>
      </div>

      <div class="bo-facts">
        <div class="bo-fact"><span>Stopps</span><b>${plan.stops}</b><small>${oneoff ? 'davon ' + oneoff + ' einmalig' : 'alle Abos'}</small></div>
        <div class="bo-fact"><span>Strecke</span><b>${Math.round(plan.km * 10) / 10} km</b><small>Luftlinie × 1,3</small></div>
        <div class="bo-fact"><span>Start</span><b class="ui-mono">${hm(startMin)}</b><small>ab Bäckerei</small></div>
        <div class="bo-fact"><span>Deadline</span><b class="ui-mono">${hm(plan.deadlineMin)}</b><small>${T.isWeekend(date) ? 'Wochenende' : 'Werktag'}</small></div>
      </div>

      <div class="bo-whatif ui-card">
        <div class="bo-whatif-row">
          <div><div class="bo-whatif-t">Fahrer für diesen Tag</div><div class="ui-muted bo-small">Was-wäre-wenn: Die Tour wird sofort neu berechnet.</div></div>
          <${Stepper} value=${drivers} onChange=${setDrivers} min=${1} max=${4} label="Anzahl Fahrer" />
        </div>
        <ul class="bo-compare" aria-label="Vergleich nach Fahrerzahl">
          ${compare.map((c) => html`<li key=${c.n} class=${c.n === drivers ? 'is-on' : ''}><button type="button" onClick=${() => setDrivers(c.n)}>
            <span>${c.n} ${c.n === 1 ? 'Fahrer' : 'Fahrer'}</span><b class=${'ui-mono ' + (c.p.late ? 'is-late' : 'is-ok')}>${hm(c.p.endMin)}</b>
            <small>${c.p.late ? mm(c.p.endMin - c.p.deadlineMin) + ' zu spät' : 'pünktlich'}</small>
            ${(() => { const e = perDriver(s, regionId, date, c.n); const mx = e.length ? e[0] : null; return mx && mx.pay != null ? html`<small>je Fahrer ca. ${App.fmt.eur(e.reduce((n, x) => n + x.pay, 0) / e.length)} · ${Math.round(e.reduce((n, x) => n + x.pieces, 0) / e.length)} Stück</small>` : null; })()}</button></li>`)}
        </ul>
        <div class="bo-whatif-act">
          <${Btn} variant=${changed ? 'sun' : 'ghost'} size="sm" icon="check" disabled=${!changed} onClick=${apply}>In Kapazität übernehmen<//>
          <span class="ui-muted bo-small">${changed ? 'Gespeichert sind ' + cap.drivers + (cap.drivers === 1 ? ' Fahrer' : ' Fahrer') + '.' : 'Entspricht der gespeicherten Kapazität (' + cap.drivers + (cap.drivers === 1 ? ' Fahrer' : ' Fahrer') + ').'}
            ${cap.status !== 'open' ? ' Status des Tages: ' + App.config.labels.capStatus[cap.status] + '.' : ''}</span>
          ${cap.status !== 'open' ? html`<${Btn} variant="quiet" size="sm" iconAfter="chevron-right" onClick=${() => App.actions.setUi({ backofficeView: 'kapazitaet' })}>Zur Kapazität<//>` : null}
        </div>
      </div>

      <div class="bo-grid">
        <div class="bo-mapcol">
          <div class="bo-mapcard ui-card">
            <${MapView} s=${s} region=${region} plan=${plan} active=${active} setActive=${setActive} />
            <${Legend} plan=${plan} />
            <p class="bo-note ui-muted">Schematische Karte, Luftlinie × 1,3</p>
          </div>
        </div>
        <div class="bo-listcol">
          <div class="bo-send ui-card-flat">
            <div class="ui-grow">
              <strong>Tour an die Fahrer-App</strong>
              <div class="ui-muted bo-small">${sentAt ? 'gesendet um ' + hm(new Date(sentAt)) + ' Uhr' : 'Noch nicht gesendet.'}</div>
            </div>
            <${Btn} variant=${sentAt ? 'ghost' : 'sun'} size="sm" icon="send" onClick=${send}>${sentAt ? 'Erneut senden' : 'An Fahrer-App senden'}<//>
          </div>
          <div class="bo-lists">
            ${plan.tours.map((t, ti) => html`<${TourBlock} key=${ti} s=${s} t=${t} ti=${ti} eco=${eco[ti]} plan=${plan} active=${active} setActive=${setActive} date=${date} />`)}
            ${plan.stops === 0 ? html`<${Empty} icon="route" title="Keine Stopps" text="Für diesen Tag gibt es keine Lieferungen." />` : null}
          </div>
        </div>
      </div>
    </div>`;
  }

  App.views = App.views || {};
  App.views.backoffice = App.views.backoffice || {};
  App.views.backoffice.touren = Touren;
})(typeof window !== 'undefined' ? window : globalThis);
