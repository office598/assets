/* Kunden-App › Sortiment (V1). Registriert App.views.customer.sortiment.
   Foto-Raster mit Kategorie-Tabs, Ziel-Leiste („Sie füllen: Sackerl für Di & Sa“), Ziel-Sheet und Sackerl-Leiste. */
(function (root) {
  const App = root.App = root.App || {};
  const { html, useState, useEffect, useRef } = App.lib;
  const { Btn, Icon, Pill, Photo, Stepper, Sheet, Field, Segmented, WeekStrip, Tabs, ProductCard, Progress, BagBar, Countdown, Empty, cx } = App.ui;
  const T = App.time, C = App.config;
  App.views = App.views || {};
  App.views.customer = App.views.customer || {};
  App.nav = App.nav || {};

  const eur = (n) => App.fmt.eur(n);
  const sel = () => App.sel;
  const goView = (v) => { App.actions.setUi({ customerView: v }); if (root.scrollTo) root.scrollTo(0, 0); };
  const dayShort = (k) => T.fmt.day(k).replace(/^\S+\s/, '');
  const sum = (o) => Object.keys(o || {}).reduce((a, k) => a + (o[k] > 0 ? o[k] : 0), 0);

  const feeLine = () => {
    const f = C.fees, aw = f.aboWeekend != null ? f.aboWeekend : f.abo, fw = f.flexWeekend != null ? f.flexWeekend : f.flex;
    const pair = (a, b) => (a === b ? eur(a) : eur(a) + ' werktags, ' + eur(b) + ' am Wochenende');
    return 'Zustellung je Lieferung: Abo ' + pair(f.abo, aw) + ' · einmalig ' + pair(f.flex, fw) + ' (ab ' + eur(f.flexMinOrder) + ' Bestellwert).';
  };
  function tagsOf(p) {
    const out = [];
    if (p.bestseller) out.push('Bestseller');
    if (p.isNew) out.push('Neu');
    (p.tags || []).forEach(x => { const m = { bio: 'Bio', vegan: 'vegan', vegetarisch: 'vegetarisch', regional: 'regional' }[x] || x; if (out.indexOf(m) < 0) out.push(m); });
    if (p.weekendOnly) out.push('nur am Wochenende');
    if (p.chilled) out.push('gekühlt');
    if (p.partner === 'Hofladen') out.push('vom Hofladen');
    if (p.season) out.push('Saison');
    return out;
  }

  /* ---------- Produkt-Detail ---------- */
  function DetailSheet({ s, product: p, qty, onQty, onClose }) {
    if (!p) return null;
    const legend = (C.labels && C.labels.allergens) || {};
    const al = p.allergens;
    const badge = (sel().offersForProduct(s, p.id, null)[0] || {}).badge;
    return html`<${Sheet} open=${true} onClose=${onClose} title=${p.name}
      footer=${[html`<${Stepper} key="s" value=${qty} onChange=${onQty} label=${p.name} />`, html`<${Btn} key="b" variant="sun" onClick=${onClose}>Fertig<//>`]}>
      <div class="k-detail">
        <div class="k-detail-photo"><${Photo} id=${p.id} alt=${p.name} ratio="1/1" /></div>
        <div class="ui-stack" style="--gap:12px">
          <div class="k-detail-price"><strong class="ui-num">${eur(p.price)}</strong>${p.unit ? html`<span class="ui-muted"> · ${p.unit}</span>` : null}</div>
          ${p.desc ? html`<p>${p.desc}</p>` : null}
          <div class="ui-row" style="--gap:6px">${badge ? html`<${Pill} tone="sun">${badge}<//>` : null}${tagsOf(p).map(x => html`<${Pill} key=${x} tone="kraft">${x}<//>`)}</div>
          ${Array.isArray(al) ? html`<div class="k-allergens"><h4>Allergene</h4>
            ${al.length ? html`<p class="k-al-codes">${al.map(c => html`<span class="k-al-code" key=${c}>${c}</span>`)}</p>
              <ul class="k-al-legend">${al.map(c => html`<li key=${c}><strong>${c}</strong> ${legend[c] || ''}</li>`)}</ul>`
              : html`<p class="ui-muted">Keine kennzeichnungspflichtigen Allergene.</p>`}</div>` : null}
        </div>
      </div>
    <//>`;
  }

  /* Aktives Ziel: explizit gesetzt oder aus dem Entwurf abgeleitet. */
  function effTarget(d) {
    if (d.target && (d.target.type === 'flex' || (d.target.weekdays || []).length)) return d.target;
    const wds = Object.keys(d.abo || {}).map(Number).sort((a, b) => a - b);
    if (d.mode === 'flex' && d.flexDate) return { type: 'flex' };
    if (wds.length) return { type: 'abo', weekdays: wds };
    return null;
  }
  const targetItems = (d, t) => (!t ? {} : t.type === 'flex' ? (d.flex || {}) : (d.abo[t.weekdays[0]] || {}));
  const targetWd = (d, t) => (!t ? null : t.type === 'flex' ? (d.flexDate ? T.weekday(d.flexDate) : null) : t.weekdays[0]);
  function targetLabel(d, t) {
    if (!t) return '';
    if (t.type === 'flex') return d.flexDate ? 'Einmallieferung am ' + T.fmt.day(d.flexDate) : 'Einmallieferung';
    return 'Sackerl für ' + t.weekdays.map(w => T.WD[w]).join(' & ');
  }

  /* Für die Startseite: legt ein Stück ins aktive Ziel; false, wenn noch kein Ziel gewählt ist. */
  App.nav.addToTarget = function (pid, n) {
    const d = App.store.getState().draft, t = effTarget(d);
    if (!t) return false;
    const have = targetItems(d, t)[pid] || 0;
    const patch = {};
    if (d.mode !== (t.type === 'flex' ? 'flex' : 'abo')) patch.mode = t.type === 'flex' ? 'flex' : 'abo';
    if (!d.target || JSON.stringify(d.target) !== JSON.stringify(t)) patch.target = t;
    if (Object.keys(patch).length) App.actions.setDraft(patch);
    if (t.type === 'flex') App.actions.draftSetQty({ flex: true }, pid, have + n);
    else t.weekdays.forEach(wd => App.actions.draftSetQty({ wd }, pid, have + n));
    return true;
  };

  /* ---------- Ziel-Sheet ---------- */
  function TargetSheet({ s, open, onClose, onConfirm, current }) {
    const d = s.draft;
    const [mode, setMode] = useState(current ? current.type : (d.mode === 'flex' ? 'flex' : 'abo'));
    const [wds, setWds] = useState(current && current.type === 'abo' ? current.weekdays.slice() : []);
    const [date, setDate] = useState(d.flexDate || null);
    const [plz, setPlz] = useState(d.plz || '');
    const [plzErr, setPlzErr] = useState('');
    const cid = s.session.customerId;
    const region = d.regionId ? sel().region(s, d.regionId) : null;
    const ready = region && !region.planned;

    const checkPlz = (e) => {
      e.preventDefault();
      if (!/^\d{4}$/.test(plz.trim())) { setPlzErr('Bitte geben Sie eine vierstellige Postleitzahl ein.'); return; }
      setPlzErr('');
      const r = App.actions.draftCheckPlz(plz.trim());
      if (r && (r.outside || r.region.planned)) setPlzErr('Dort liefern wir noch nicht. Auf der Startseite können Sie sich vormerken lassen.');
    };

    let body;
    if (!ready) {
      body = html`<form class="ui-stack" onSubmit=${checkPlz} noValidate>
        <p>Zuerst brauchen wir Ihre Postleitzahl, damit wir die freien Liefertage zeigen können.</p>
        <${Field} id="k-tgt-plz" label="Postleitzahl" inputmode="numeric" maxlength="4" autocomplete="postal-code" placeholder="z. B. 5303" value=${plz} error=${plzErr}
          onInput=${(e) => setPlz(e.target.value.replace(/\D/g, '').slice(0, 4))} />
        <${Btn} type="submit" variant="sun">Prüfen<//>
        ${region && region.planned ? html`<${Btn} variant="ghost" onClick=${() => { onClose(); goView('start'); }}>Zur Startseite<//>` : null}
      </form>`;
    } else if (mode === 'abo') {
      const weak = sel().weakDays(s, region.id);
      const days = [0, 1, 2, 3, 4, 5, 6].map(wd => {
        const eff = sel().dayStatusFor(s, region.id, wd, cid), cap = sel().cap(s, region.id, wd);
        const blocked = eff === 'full' || eff === 'closed' || eff === 'booked';
        return { wd, dateLabel: dayShort(T.nextDateForWeekday(wd)), effective: eff, selected: wds.includes(wd), disabled: blocked && eff !== 'booked',
          sub: eff === 'few' ? 'noch ' + Math.max(cap.freeAbo, 0) + ' Plätze' : eff === 'full' ? 'Warteliste auf Start' : undefined,
          promo: eff === 'free' && weak.includes(wd) ? 'Gratis-Zustellung' : undefined };
      });
      body = html`<div class="ui-stack">
        <p class="ui-muted">Wählen Sie einen oder mehrere Tage. Der Inhalt gilt dann für jede dieser Lieferungen.</p>
        <${WeekStrip} days=${days} label="Liefertage" onPick=${(day) => { if (!day.disabled) setWds(wds.includes(day.wd) ? wds.filter(x => x !== day.wd) : wds.concat([day.wd]).sort((a, b) => a - b)); }} />
      </div>`;
    } else {
      const dates = T.nextDates(14);
      body = html`<div class="ui-stack">
        <p class="ui-muted">${feeLine()}</p>
        <div class="k-tgt-dates" role="group" aria-label="Liefertag wählen">
          ${dates.map(k => {
            const fi = sel().flexInfo(s, region.id, k, cid);
            const ok = fi.state === 'free' || fi.state === 'few';
            const txt = fi.state === 'free' ? 'frei' : fi.state === 'few' ? 'wenige Plätze' : fi.state === 'cutoff' ? 'Bestellschluss vorbei' : fi.state === 'full' ? 'ausgebucht' : 'nicht möglich';
            return html`<button type="button" class="k-tgt-date" key=${k} disabled=${!ok} aria-pressed=${date === k ? 'true' : 'false'} onClick=${() => setDate(k)}>
              <strong>${T.fmt.day(k)}</strong><span class=${fi.state === 'free' ? 'k-tgt-ok' : fi.state === 'few' ? 'k-tgt-warn' : 'k-tgt-full'}>${txt}</span></button>`;
          })}
        </div>
      </div>`;
    }

    const can = ready && (mode === 'abo' ? wds.length > 0 : !!date);
    const confirm = () => onConfirm(mode === 'abo' ? { type: 'abo', weekdays: wds } : { type: 'flex' }, date);
    return html`<${Sheet} open=${open} onClose=${onClose} title="Für welche Lieferung packen Sie?"
      footer=${ready ? [html`<${Btn} key="c" variant="ghost" onClick=${onClose}>Abbrechen<//>`, html`<${Btn} key="o" variant="sun" disabled=${!can} onClick=${confirm}>Übernehmen<//>`] : null}>
      <div class="ui-stack">
        ${ready ? html`<${Segmented} full label="Art der Lieferung" value=${mode} onChange=${setMode} options=${[{ value: 'abo', label: 'Regelmäßig', icon: 'calendar' }, { value: 'flex', label: 'Einmalig', icon: 'bag' }]} />` : null}
        ${body}
      </div>
    <//>`;
  }

  /* ---------- Sortiment ---------- */
  function Sortiment() {
    const s = App.useStore();
    const d = s.draft;
    const target = effTarget(d);
    const season = C.season, seasonOpen = !!(season && T.isOpenFor(season.dateKey));

    const initial = App.nav.sortimentCat || 'empfohlen';
    const [tab, setTab] = useState(initial);
    const [sheet, setSheet] = useState(false);
    const [pending, setPending] = useState(null);
    const [bump, setBump] = useState(null);
    const [bagBump, setBagBump] = useState(0);
    const [query, setQuery] = useState('');
    const [detail, setDetail] = useState(null);
    const gridRef = useRef(null);
    const timer = useRef(null);
    useEffect(() => {
      App.nav.sortimentCat = null;
      if (App.nav.pendingAdd) { const pa = App.nav.pendingAdd; App.nav.pendingAdd = null; if (!effTarget(App.store.getState().draft)) { setPending(pa); setSheet(true); } else App.nav.addToTarget(pa.pid, pa.n); }
      return () => clearTimeout(timer.current); }, []);

    const items = targetItems(d, target);
    const wdOffer = target && target.type === 'abo' && target.weekdays.length === 1 ? target.weekdays[0] : (target && target.type === 'flex' ? targetWd(d, target) : null);
    const products = s.products.filter(p => p.active !== false && !(p.season && !seasonOpen));
    const offerBadge = (p) => { const o = sel().offersForProduct(s, p.id, wdOffer)[0]; return o ? o.badge : undefined; };
    const hasOffers = products.some(p => sel().offersForProduct(s, p.id, null).length);

    const focusList = products.filter(p => p.focus);
    const tabs = (focusList.length ? [{ id: 'empfohlen', label: 'Empfohlen' }] : []).concat([{ id: 'alle', label: 'Alle' }])
      .concat(hasOffers ? [{ id: 'aktionen', label: 'Aktionen' }] : [])
      .concat(Object.keys(C.labels.cat).filter(c => products.some(p => p.cat === c)).map(c => ({ id: c, label: C.labels.cat[c] })));
    const activeTab = tabs.some(t => t.id === tab) ? tab : tabs[0].id;
    const changeTab = (id) => {
      setTab(id);
      const el = gridRef.current;
      if (el && el.getBoundingClientRect().top < 120 && el.scrollIntoView) el.scrollIntoView({ block: 'start' });
    };

    const writeQty = (t, pid, n) => {
      const patch = {};
      if (d.mode !== (t.type === 'flex' ? 'flex' : 'abo')) patch.mode = t.type === 'flex' ? 'flex' : 'abo';
      if (!d.target || JSON.stringify(d.target) !== JSON.stringify(t)) patch.target = t;
      if (Object.keys(patch).length) App.actions.setDraft(patch);
      if (t.type === 'flex') App.actions.draftSetQty({ flex: true }, pid, n);
      else t.weekdays.forEach(wd => App.actions.draftSetQty({ wd }, pid, n));
    };
    const setQty = (p, n) => {
      if (!target) { setPending({ pid: p.id, n }); setSheet(true); return; }
      const before = items[p.id] || 0;
      writeQty(target, p.id, n);
      if (n > before) {
        setBump(p.id); setBagBump(x => x + 1);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => { setBump(null); setBagBump(0); }, 480);
      }
    };
    const confirmTarget = (t, date) => {
      if (t.type === 'abo') {
        App.actions.setDraft({ mode: 'abo', target: t });
        t.weekdays.forEach(wd => { if (!s.draft.abo[wd]) App.actions.draftToggleDay(wd); });
      } else {
        App.actions.setDraft({ mode: 'flex', target: { type: 'flex' } });
        App.actions.draftSetFlexDate(date);
      }
      if (pending) writeQty(t, pending.pid, pending.n);
      setPending(null); setSheet(false);
    };

    const cardFor = (p) => html`<div key=${p.id} class=${cx('k-bumpwrap', bump === p.id && 'is-bumped')}>
      <button type="button" class="k-detailbtn" aria-label=${'Details zu ' + p.name} onClick=${() => setDetail(p.id)}></button>
      ${p.focus ? html`<span class="k-focus-tag"><span>Empfehlung des Bäckers</span></span>` : null}
      <${ProductCard} product=${p} qty=${items[p.id] || 0} badge=${offerBadge(p)} onQty=${(n) => setQty(p, n)} /></div>`;

    const q = query.trim().toLowerCase();
    let content;
    if (q) {
      const list = products.filter(p => p.name.toLowerCase().includes(q));
      content = list.length ? html`<section class="k-sort-sec"><div class="k-grid">${list.map(cardFor)}</div></section>`
        : html`<div class="k-empty-grid"><${Empty} icon="search" title=${'Nichts gefunden für „' + query.trim() + '“'} text="Probieren Sie einen kürzeren Suchbegriff, zum Beispiel „Semmel“ oder „Brot“." /></div>`;
    } else if (activeTab === 'empfohlen') {
      content = html`<section class="k-sort-sec"><p class="k-focus-lead">Das backt unser Partnerbäcker am liebsten. Echte Handarbeit, die man schmeckt.</p><div class="k-grid">${focusList.map(cardFor)}</div></section>`;
    } else if (activeTab === 'alle') {
      content = Object.keys(C.labels.cat).map(c => {
        const list = products.filter(p => p.cat === c);
        if (!list.length) return null;
        return html`<section class="k-sort-sec" key=${c} aria-labelledby=${'k-cat-' + c}>
          <h2 id=${'k-cat-' + c}>${C.labels.cat[c]}<small>${list.length}</small></h2>
          <div class="k-grid">${list.map(cardFor)}</div></section>`;
      });
    } else {
      const list = activeTab === 'aktionen' ? products.filter(p => sel().offersForProduct(s, p.id, null).length) : products.filter(p => p.cat === activeTab);
      content = list.length ? html`<section class="k-sort-sec"><div class="k-grid">${list.map(cardFor)}</div></section>`
        : html`<div class="k-empty-grid"><${Empty} icon="bread" title="Hier ist gerade nichts" text="In dieser Auswahl gibt es aktuell keine Artikel." /></div>`;
    }

    /* Sackerl-Zusammenfassung */
    const count = sum(items);
    let total = 0, nextCut = null;
    if (target && count) {
      total = sel().priceBag(s, items, { wd: targetWd(d, target) }).total;
      if (target.type === 'flex') nextCut = d.flexDate ? T.cutoffFor(d.flexDate) : null;
      else nextCut = target.weekdays.map(w => T.cutoffFor(T.nextDateForWeekday(w))).sort((a, b) => a - b)[0];
    }
    const free = C.fees.freeDeliveryFrom;
    const showFree = !!(free && target && count);

    return html`<div class="k-sort">
      <header class="k-sort-head">
        <div class="ui-eyebrow">Sortiment</div>
        <h1>Was darf es sein?</h1>
        <p class="ui-lead">Frisch gebacken, echt lecker. Legen Sie alles, was Sie mögen, in Ihr Sackerl.</p>
      </header>

      <div class="k-search"><${Field} id="k-search" label="Sortiment durchsuchen" type="search" placeholder="Zum Beispiel Kaisersemmel, Butter, Brot" autocomplete="off" value=${query} onInput=${(e) => setQuery(e.target.value)} /></div>
      <div class=${cx('k-target', !target && 'is-empty')}>
        <${Icon} name="bag" size=${22} />
        <div class="k-target-text">
          ${target ? html`<span>Sie füllen:</span><strong>${targetLabel(d, target)}</strong>`
            : html`<strong>Noch kein Liefertag gewählt</strong>`}
        </div>
        <${Btn} variant=${target ? 'ghost' : 'sun'} size="sm" onClick=${() => setSheet(true)}>${target ? 'ändern' : 'Tag wählen'}<//>
      </div>
      <p class="k-feeline">${feeLine()}</p>
      ${showFree ? html`<div class="k-freeprog"><${Progress} value=${total} max=${free}
        label=${total >= free ? 'Zustellung gratis ab ' + eur(free) + ' – erreicht' : 'Noch ' + eur(Math.round((free - total) * 100) / 100) + ' bis zur Gratis-Zustellung'} /></div>` : null}

      <div class="k-cattabs"><${Tabs} tabs=${tabs} value=${activeTab} onChange=${changeTab} label="Kategorien" /></div>
      <div ref=${gridRef} class="k-grid-anchor">${content}</div>

      <${DetailSheet} s=${s} product=${detail ? sel().product(s, detail) : null} qty=${detail ? (items[detail] || 0) : 0} onQty=${(n) => { const p = sel().product(s, detail); if (!target) { setDetail(null); setPending({ pid: p.id, n }); setSheet(true); } else setQty(p, n); }} onClose=${() => setDetail(null)} />
      <${TargetSheet} key=${sheet ? 'open' : 'closed'} s=${s} open=${sheet} current=${target} onClose=${() => { setSheet(false); setPending(null); }} onConfirm=${confirmTarget} />
      ${target && count ? html`<div class=${cx('k-bagwrap', bagBump > 0 && 'is-bumped')}>
        <${BagBar} count=${count} total=${total} cta="Zum Lieferplan" onClick=${() => goView('lieferplan')}
          sub=${html`<span>${target.type === 'abo' ? 'je Lieferung' : 'einmalig'}${nextCut ? html` · Bestellschluss <${Countdown} to=${nextCut} />` : null}</span>`} />
      </div>` : null}
    </div>`;
  }
  App.views.customer.sortiment = Sortiment;
})(typeof window !== 'undefined' ? window : globalThis);
