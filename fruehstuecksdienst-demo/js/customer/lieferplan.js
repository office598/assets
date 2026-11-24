/* Kunden-App: Lieferplan – geführter Ablauf Sackerl → Adresse → Bezahlung → Fertig.
   Schritt 1 (Sackerl) ist das Herzstück: Wochenleiste, Sackerl-Karten, Aktionen, Zusammenfassung.
   Geteilte Bausteine (für konto.js): App.views.customer.lieferplan.shared */
(function (root) {
  const App = root.App = root.App || {};
  const L = App.lib;
  const { html, useState, useEffect, useRef } = L;
  const U = App.ui;
  const { Icon, Btn, Pill, Sheet, Segmented, Field, Toggle, WeekStrip, Ticket, Photo, Progress, BagBar, Countdown, Stepper, Tabs, ProductCard, Empty, cx, toast } = U;
  const T = App.time, C = App.config;
  const sel = () => App.sel, act = () => App.actions;
  const eur = n => App.fmt.eur(n);
  const WD = T.WD, WDL = T.WD_LONG;

  const sumQty = o => Object.keys(o || {}).reduce((a, k) => a + (o[k] > 0 ? o[k] : 0), 0);
  const dateShort = k => T.fmt.day(k).replace(/^\D+/, '');
  const artikel = n => n + (n === 1 ? ' Artikel' : ' Artikel');
  const reduceMotion = () => { try { return root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const scrollToId = id => setTimeout(() => {
    const el = document.getElementById(id);
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center' });
  }, 60);
  const scrollTop = () => { if (root.scrollTo) root.scrollTo(0, 0); };
  const state = () => App.store.getState();
  const feeStd = (mode, wd) => { const f = C.fees, we = wd != null && wd >= 5; return mode === 'flex' ? (we && f.flexWeekend != null ? f.flexWeekend : f.flex) : (we && f.aboWeekend != null ? f.aboWeekend : f.abo); };
  const feeRange = mode => { const a = feeStd(mode, 0), b = feeStd(mode, 5); return a === b ? eur(a) : eur(a) + ' werktags, ' + eur(b) + ' am Wochenende'; };

  /* ---------- Hilfen ---------- */
  function problemText(p) {
    const [k, v] = p.split(':');
    const m = {
      'no-region': 'Bitte geben Sie zuerst Ihre Postleitzahl ein.',
      'region-planned': 'In diesem Gebiet liefern wir noch nicht.',
      'no-days': 'Wählen Sie mindestens einen Liefertag.',
      'empty-day': 'Das Sackerl für ' + WDL[v] + ' ist noch leer.',
      'day-full': WDL[v] + ' ist ausgebucht. Setzen Sie sich auf die Warteliste.',
      'flex-no-date': 'Wählen Sie einen Liefertag.',
      'flex-empty': 'Das Sackerl ist noch leer.',
      'flex-min': 'Der Mindestbestellwert von ' + eur(C.fees.flexMinOrder) + ' ist noch nicht erreicht.',
      'flex-full': 'Dieser Tag ist ausgebucht. Wählen Sie einen anderen Tag.',
      'flex-cutoff': 'Der Bestellschluss für diesen Tag ist vorbei.',
      'address-incomplete': 'Bitte vervollständigen Sie Ihre Adresse.'
    };
    return m[k] || 'Bitte prüfen Sie Ihre Angaben.';
  }

  function bookDay(wd) {
    let s = state();
    const a = act();
    if (s.draft.mode !== 'abo') a.setDraft({ mode: 'abo' });
    if (!s.draft.abo[wd]) a.draftToggleDay(wd);
    s = state();
    if (!sumQty(s.draft.abo[wd])) {
      const src = Object.keys(s.draft.abo).map(Number).sort().find(w => w !== wd && sumQty(s.draft.abo[w]) > 0);
      const mine = s.subs.find(x => x.customerId === s.session.customerId && sumQty(x.items) > 0);
      if (src != null) a.draftCopyDay(src, wd);
      else if (mine) a.draftApplyBag({ wd }, mine.items);
    }
    if (state().draft.step !== 'plan') a.setDraft({ step: 'plan' });
  }

  function reservedFor(s, cid, regionId) {
    const now = T.now().getTime();
    return s.waitlist.filter(w => w.customerId === cid && w.status === 'notified' && w.weekday != null && w.reservedUntil &&
      new Date(w.reservedUntil).getTime() > now && (!regionId || w.regionId === regionId))
      .sort((a, b) => a.weekday - b.weekday);
  }

  /* ---------- Auswahlkarten Ablageort (auch im Konto) ---------- */
  const PLACE = {
    tuerschnalle: { icon: 'door', text: 'Das Sackerl hängt an der Türschnalle. Der Klassiker.' },
    'vor-der-tuer': { icon: 'home', text: 'Direkt vor der Wohnungstür, z. B. im Stiegenhaus.' },
    box: { icon: 'bag', text: 'In der Zeitungsbox oder im Briefkasten-Korb.' },
    hinweis: { icon: 'edit', text: 'Sie schreiben uns, wo es hin soll.' }
  };
  function PlacementCards({ value, onChange, idp = 'pl' }) {
    const lab = C.labels.placement;
    return html`<div class="k-place" role="radiogroup" aria-label="Ablageort">
      ${Object.keys(lab).map(k => html`<button type="button" key=${k} id=${idp + '-' + k} role="radio" aria-checked=${value === k ? 'true' : 'false'}
        class=${cx('k-place-card', value === k && 'is-on')} onClick=${() => onChange(k)}>
        <span class="k-place-ic"><${Icon} name=${(PLACE[k] || {}).icon || 'door'} size=${22} /></span>
        <span class="k-place-t"><strong>${lab[k]}</strong><small>${(PLACE[k] || {}).text || ''}</small></span>
        <span class="k-place-check" aria-hidden="true">${value === k ? html`<${Icon} name="check" size=${16} />` : null}</span>
      </button>`)}
    </div>`;
  }

  /* ---------- Sheet: Artikel hinzufügen ---------- */
  function badgeFor(s, p, wd) {
    const o = sel().offersForProduct ? sel().offersForProduct(s, p.id, wd) : [];
    if (o.length) return o[0].badge;
    if (p.isNew) return 'Neu';
    if (p.bestseller) return 'Bestseller';
    return null;
  }
  function ProductSheet({ open, onClose, s, items, wd, onQty, title = 'Artikel hinzufügen', mode }) {
    const cats = Object.keys(C.labels.cat);
    const [cat, setCat] = useState('gebaeck');
    const list = s.products.filter(p => p.active !== false && p.cat === cat && (!p.weekendOnly || wd == null || wd >= 5) && (!p.season || mode === 'flex'));
    const total = sumQty(items);
    const tabs = cats.filter(c => s.products.some(p => p.cat === c && p.active !== false)).map(c => ({ id: c, label: C.labels.cat[c] }));
    const price = sel().priceBag(s, items || {}, { wd });
    const sug = open && total && sel().suggestions ? sel().suggestions(s, items || {}, 4) : [];
    return html`<${Sheet} open=${open} onClose=${onClose} title=${title} wide
      footer=${html`<div class="k-sheetfoot"><span><strong>${artikel(total)}</strong> · ${eur(price.total)}</span><${Btn} variant="sun" onClick=${onClose}>Fertig<//></div>`}>
      ${sug.length ? html`<div class="k-sugg"><div class="ui-eyebrow">Dazu passt</div><div class="k-sugg-row">${sug.map(p => html`<button type="button" key=${p.id} class="k-sugg-i"
        onClick=${() => onQty(p.id, ((items && items[p.id]) || 0) + 1)} aria-label=${p.name + ' hinzufügen, ' + eur(p.price)}>
        <span class="k-sugg-ph"><${Photo} id=${p.id} alt="" ratio="1/1" /></span><span class="k-sugg-n">${p.name}<small>${eur(p.price)}</small></span>
        <span class="k-sugg-plus"><${Icon} name="plus" size=${18} /></span></button>`)}</div></div>` : null}
      <div class="k-pickertabs"><${Tabs} tabs=${tabs} value=${cat} onChange=${setCat} label="Kategorien" /></div>
      <div class="k-pgrid">
        ${list.map(p => html`<${ProductCard} key=${p.id} product=${p} qty=${(items && items[p.id]) || 0} onQty=${n => onQty(p.id, n)} badge=${badgeFor(s, p, wd)} />`)}
      </div>
    <//>`;
  }

  /* ---------- Sheet: Warteliste ---------- */
  function WaitlistSheet({ open, onClose, s, wd, regionId }) {
    const cid = s.session.customerId, cust = sel().customer(s, cid);
    const entry = open && s.waitlist.find(w => w.customerId === cid && w.regionId === regionId && w.weekday === wd && (w.status === 'waiting' || w.status === 'notified'));
    const [channel, setChannel] = useState('push');
    const [email, setEmail] = useState('');
    const [err, setErr] = useState('');
    const region = sel().region(s, regionId);
    useEffect(() => { setErr(''); if (cust && cust.email) setEmail(cust.email); }, [open, wd]);
    if (!open || wd == null) return null;
    const pos = entry ? sel().waitPosition(s, cid, regionId, wd) : null;
    const join = () => {
      if (channel === 'email' && !/^\S+@\S+\.\S+$/.test(email.trim())) { setErr('Bitte geben Sie eine gültige E-Mail-Adresse ein.'); return; }
      const r = act().joinWaitlist({ regionId, weekday: wd, channel, customerId: cid, contact: { plz: s.draft.plz || (cust && cust.plz) || '', email: email.trim(), name: cust && cust.registered ? cust.name : '' } });
      toast('Vorgemerkt: Platz ' + r.position + ' für ' + WDL[wd], 'ok');
    };
    const foot = entry
      ? html`<${Btn} variant="ghost" onClick=${() => { act().leaveWaitlist(entry.id); toast('Sie stehen nicht mehr auf der Warteliste.', 'info'); onClose(); }}>Von der Warteliste streichen<//><${Btn} variant="sun" onClick=${onClose}>Fertig<//>`
      : html`<${Btn} variant="ghost" onClick=${onClose}>Abbrechen<//><${Btn} variant="sun" icon="bell" onClick=${join}>Auf die Warteliste<//>`;
    return html`<${Sheet} open=${open} onClose=${onClose} title=${WDL[wd] + ' ist ausgebucht'} footer=${foot}>
      ${entry ? html`<div class="ui-stack" style="--gap:12px">
        <div class="k-lnote k-lnote-ok"><${Icon} name="check" size=${20} /><div><strong>Sie stehen auf Platz ${pos} für ${WDL[wd]}.</strong>
          <div>${entry.status === 'notified' ? 'Der Tag ist frei geworden. Buchen Sie ihn im Lieferplan.' : 'Wir melden uns per ' + (entry.channel === 'push' ? 'Push' : 'E-Mail') + ', sobald ein Platz frei wird.'}</div></div></div>
      </div>` : html`<div class="ui-stack" style="--gap:14px">
        <p class="ui-muted" style="margin:0">${region ? region.name : 'Ihr Gebiet'}: Wird ein Platz frei, reservieren wir ihn ${C.reserveHours} Stunden für Sie.</p>
        <div><div class="ui-label" id="wl-ch-l" style="margin-bottom:6px">Wie sollen wir Sie benachrichtigen?</div>
          <${Segmented} label="Benachrichtigungskanal" value=${channel} onChange=${setChannel} full
            options=${[{ value: 'push', label: 'Push-Nachricht', icon: 'bell' }, { value: 'email', label: 'E-Mail', icon: 'mail' }]} /></div>
        ${channel === 'email' ? html`<${Field} id="wl-email" label="E-Mail-Adresse" type="email" autocomplete="email" value=${email} error=${err}
          onInput=${e => { setEmail(e.target.value); setErr(''); }} placeholder="name@beispiel.at" />` : null}
      </div>`}
    <//>`;
  }

  /* ---------- PLZ ---------- */
  function PlzForm({ s, onDone, compact }) {
    const [v, setV] = useState(s.draft.plz || '');
    const [res, setRes] = useState(null);
    const submit = e => {
      e.preventDefault();
      const r = act().draftCheckPlz(v);
      setRes(r === null ? { bad: true } : r);
      if (r && r.region && onDone) onDone(r);
    };
    return html`<form class=${cx('k-lplz', compact && 'is-compact')} onSubmit=${submit} noValidate>
      <${Field} id=${compact ? 'plz-edit' : 'plz-in'} label="Ihre Postleitzahl" inputMode="numeric" maxLength="4" autocomplete="postal-code" placeholder="z. B. 5303"
        value=${v} onInput=${e => setV(e.target.value.replace(/\D/g, '').slice(0, 4))}
        error=${res && res.bad ? 'Bitte geben Sie eine vierstellige Postleitzahl ein.' : null} />
      <${Btn} type="submit" variant="sun" iconAfter="chevron-right">Liefertage prüfen<//>
      ${res && res.outside ? html`<div class="k-lnote k-lnote-warn"><${Icon} name="info" size=${20} /><div><strong>Für diese PLZ liefern wir noch nicht.</strong>
        <div>Auf der Startseite können Sie Ihre PLZ vormerken.</div></div></div>` : null}
      <div class="k-lplz-ex"><span class="ui-muted">Demo:</span>
        ${['5303', '5310', '5330'].map(p => html`<button type="button" class="ui-chip" key=${p} onClick=${() => { setV(p); const r = act().draftCheckPlz(p); setRes(r); if (r && r.region && onDone) onDone(r); }}>${p}</button>`)}</div>
    </form>`;
  }

  /* ---------- Schrittleiste ---------- */
  function Steps({ steps, current }) {
    const cur = steps.findIndex(x => x.id === current);
    return html`<ol class="k-lsteps" aria-label="Bestellschritte">${steps.map((t, i) => html`<li key=${t.id} class=${cx(i < cur && 'is-done', i === cur && 'is-now')} aria-current=${i === cur ? 'step' : undefined}>
      <span class="k-step-n">${i < cur ? html`<${Icon} name="check" size=${14} />` : i + 1}</span><span class="k-step-t">${t.label}</span></li>`)}</ol>`;
  }

  /* ---------- Sackerl-Karte ---------- */
  function addHintToBag(s, target, hint, openPicker) {
    const o = (s.offers || []).find(x => x.id === hint.offerId);
    if (!o) return;
    const items = target.flex ? s.draft.flex : (s.draft.abo[target.wd] || {});
    const same = o.buy.kind === 'product' && o.buy.ref === o.get.productId;
    let id = null;
    if (same || /dazulegen/.test(hint.text)) id = hint.giftProductId;
    else if (o.buy.kind === 'product') id = o.buy.ref;
    if (!id) { openPicker(); return; }
    act().draftSetQty(target, id, (items[id] || 0) + Math.max(1, hint.missing));
  }

  function quickPicks(s, items, wd) {
    const ok = p => p.active !== false && !p.season && !(items[p.id] > 0) && (!p.weekendOnly || (wd != null && wd >= 5)) && p.cat !== 'boxen';
    const pool = s.products.filter(p => ok(p) && (p.focus || p.bestseller));
    pool.sort((x, y) => (y.bestseller ? 1 : 0) - (x.bestseller ? 1 : 0));
    return pool.slice(0, 4);
  }

  function BagCard({ s, target, del, dels, tried, onAdd, onCopy, onRemove, status, days }) {
    const flex = !!target.flex, wd = flex ? (s.draft.flexDate ? T.weekday(s.draft.flexDate) : null) : target.wd;
    const items = flex ? s.draft.flex : (s.draft.abo[target.wd] || {});
    const bag = sel().priceBag(s, items, { wd });
    const count = sumQty(items);
    const [gone, setGone] = useState({});
    const bagKey = flex ? 'flex' : 'd' + target.wd;
    const setQty = (id, n) => act().draftSetQty(target, id, n);
    const d = del || { total: bag.total, fee: 0, discounts: bag.discounts, hints: bag.hints, freeDeliveryMissing: 0 };
    const from = C.fees.freeDeliveryFrom;
    const stdFee = feeStd(flex ? 'flex' : 'abo', wd != null ? wd : (flex ? null : target.wd));
    const feeFree = d.fee === 0 && count > 0;
    const byThreshold = from && d.total >= from - 1e-9;
    const minMissing = flex ? Math.max(0, Math.round((C.fees.flexMinOrder - d.total) * 100) / 100) : 0;
    const shared = !flex && days && days.length > 1;
    const title = flex ? 'Ihr Sackerl' + (s.draft.flexDate ? ' für ' + WDL[T.weekday(s.draft.flexDate)] : '') : shared ? 'Ihr Sackerl für ' + days.map(w => WD[w]).join(' · ') : WDL[target.wd];
    const dateK = flex ? s.draft.flexDate : T.nextDateForWeekday(target.wd);
    const empty = tried && !count;

    // genau ein Vorschlag: Tausch → Brot der Woche (Wochenende) → Mengenaktion → Dazu passt
    let tip = null;
    if (count) {
      const key = (k) => bagKey + k;
      const trade = sel().tradeUps ? sel().tradeUps(s, items).find(x => !gone[key(x.fromId + x.toId)]) : null;
      const ws = s.weeklySpecial, wsP = ws && ws.productId ? sel().product(s, ws.productId) : null;
      const wsOk = wsP && wsP.active !== false && !(items[wsP.id] > 0) && (!wsP.weekendOnly || (wd != null && wd >= 5));
      const hint = d.hints.find(h => !gone[key('h' + h.offerId)]);
      const sg = sel().suggestions ? sel().suggestions(s, items, 1)[0] : null;
      if (trade) tip = { k: key(trade.fromId + trade.toId), icon: 'star', photo: trade.toId, text: trade.text, cta: 'Tauschen', run: () => (shared ? days : [target.wd]).forEach(w => act().draftSwap(flex ? target : { wd: w }, trade.fromId, trade.toId)) };
      else if (wsOk && wd != null && wd >= 5 && !gone[key('ws')]) tip = { k: key('ws'), photo: wsP.id, text: (ws.title || 'Brot der Woche') + ': ' + wsP.name + ' · ' + (ws.pct > 0 ? eur(Math.round(wsP.price * (100 - ws.pct)) / 100) + ' statt ' + eur(wsP.price) : eur(wsP.price)), cta: 'Dazulegen', run: () => setQty(wsP.id, 1) };
      else if (hint) tip = { k: key('h' + hint.offerId), icon: 'gift', text: hint.text, cta: 'Hinzufügen', run: () => addHintToBag(s, target, hint, onAdd) };
      else if (sg && !gone[key('sg')]) tip = { k: key('sg'), photo: sg.id, text: 'Dazu passt: ' + sg.name + ' · ' + eur(sg.price), cta: 'Hinzufügen', run: () => setQty(sg.id, (items[sg.id] || 0) + 1) };
    }
    const feeGroups = [];
    if (shared && dels) dels.forEach(x => { let g = feeGroups.find(y => y.fee === x.fee); if (!g) { g = { fee: x.fee, wds: [] }; feeGroups.push(g); } g.wds.push(x.wd); });
    feeGroups.forEach(g => { g.names = g.wds.map(w => WD[w]).join(', ') + ':'; });
    const picks = !count ? quickPicks(s, items, wd) : [];
    if (shared) del = del || null;

    return html`<section class=${cx('k-sack', empty && 'has-error')} id=${'k-sack-' + (flex ? 'flex' : target.wd)} aria-label=${title}>
      <header class="k-sack-head">
        <div class="ui-grow"><h3>${title}</h3>
          <div class="k-sack-sub">${shared ? html`<${DayChips} wds=${days} /> ` : null}${!shared && dateK ? T.fmt.dayLong(dateK).replace(/^[^,]+,\s*/, '') + ' · bis ' + T.fmt.hm(T.deadlineMin(dateK)) + ' Uhr' : !shared ? 'Tag wählen' : ''}
            ${status === 'reserved' ? html` <${Pill} tone="info">für Sie reserviert<//>` : null}</div></div>
        ${onRemove && !shared ? html`<${Btn} variant="quiet" size="sm" icon="x" aria-label=${WDL[target.wd] + ' entfernen'} onClick=${onRemove}>Entfernen<//>` : null}
      </header>

      ${count ? html`<ul class="k-lines">${bag.lines.map(l => html`<li class="k-line" key=${l.product.id}>
        <div class="k-line-ph"><${Photo} id=${l.product.id} alt=${l.product.name} ratio="1/1" /></div>
        <div class="k-line-main"><div class="k-line-name">${l.product.name}</div>
          <div class="k-line-sub">${eur(l.product.price)}${l.product.unit ? ' · ' + l.product.unit : ''}</div>
          <${Stepper} size="sm" value=${l.qty} onChange=${n => setQty(l.product.id, n)} label=${l.product.name} /></div>
        <div class="k-line-sum">${eur(l.sum)}</div>
      </li>`)}
        ${d.discounts.map(x => { const p = sel().product(s, x.productId); return html`<li class="k-line k-line-disc" key=${x.offerId}>
          <div class="k-line-ph"><${Icon} name="gift" size=${22} /></div>
          <div class="k-line-main"><div class="k-line-name">${x.title}</div><div class="k-line-sub">${p ? p.name : ''}</div></div>
          <div class="k-line-sum">− ${eur(x.amount)}</div></li>`; })}
      </ul>` : html`<div class="k-sack-empty">
        <p>${empty ? 'Dieses Sackerl ist noch leer.' : 'Was darf in Ihr Sackerl?'}</p>
        <${Btn} variant="sun" size="lg" full icon="plus" onClick=${onAdd}>Artikel hinzufügen<//>
        ${picks.length ? html`<div class="k-picks" role="group" aria-label="Schnell hinzufügen">${picks.map(p => html`<button type="button" key=${p.id} class="k-pick" onClick=${() => setQty(p.id, 1)} aria-label=${p.name + ' hinzufügen, ' + eur(p.price)}>
          <span class="k-pick-ph"><${Photo} id=${p.id} alt="" ratio="1/1" /></span><span class="k-pick-n">${p.name}</span><span class="k-pick-p">${eur(p.price)}</span></button>`)}</div>` : null}
      </div>`}

      ${tip ? html`<div class="k-tip">${tip.photo ? html`<span class="k-tip-ph"><${Photo} id=${tip.photo} alt="" ratio="1/1" /></span>` : html`<span class="k-tip-ic"><${Icon} name=${tip.icon} size=${22} /></span>`}
        <span class="k-tip-t">${tip.text}</span><${Btn} size="sm" variant="ghost" onClick=${tip.run}>${tip.cta}<//>
        <button type="button" class="k-x" aria-label="Hinweis ausblenden" onClick=${() => setGone(Object.assign({}, gone, { [tip.k]: true }))}><${Icon} name="x" size=${16} /></button></div>` : null}

      ${count ? html`<div class="k-bag-actions">
        <${Btn} variant="ghost" icon="plus" onClick=${onAdd}>Artikel hinzufügen<//>
        ${onCopy ? html`<${Btn} variant="quiet" icon="refresh" onClick=${onCopy}>Auf andere Tage übernehmen<//>` : null}
      </div>` : null}

      ${count ? html`<div class="k-bag-foot">
        ${flex && minMissing > 0 ? html`<div class=${cx('k-hint', tried && 'is-err')}><${Icon} name="info" size=${20} /><span>Mindestbestellwert ${eur(C.fees.flexMinOrder)}: noch ${eur(minMissing)}.</span></div>` : null}
        ${!feeFree && d.freeDeliveryMissing > 0 && from ? html`<${Progress} value=${d.total} max=${from} label=${'Noch ' + eur(d.freeDeliveryMissing) + ' bis zur Gratis-Zustellung'} />` : null}
        ${byThreshold ? html`<${Progress} value=${d.total} max=${from} label=${'Gratis-Zustellung ab ' + eur(from) + ' erreicht'} />` : null}
        <dl class="k-sum">
          <div><dt>Zustellung</dt><dd>${shared && dels && dels.length ? feeGroups.map((g, i) => html`<span key=${i} class="k-feegrp">${g.names} ${g.fee === 0 ? 'gratis (Aktion)' : eur(g.fee)}</span>`)
            : feeFree ? html`<s>${eur(stdFee)}</s> <strong class="k-free">gratis</strong>` : eur(d.fee)}</dd></div>
          <div class="is-total"><dt>${shared ? 'Sackerl je Lieferung' : flex ? 'Summe' : 'Je Lieferung'}</dt><dd>${eur(shared ? d.total : d.total + d.fee)}</dd></div>
        </dl>
      </div>` : html`<div class="k-lfee"><${Icon} name="truck" size=${16} /><span>Zustellung ${eur(stdFee)}${flex ? ' · ab ' + eur(C.fees.flexMinOrder) + ' Bestellwert' : ''}</span></div>`}
    </section>`;
  }

  /* ---------- Wochen- und Datumsleiste ---------- */
  function WeekPicker({ s, onPick }) {
    const d = s.draft, cid = s.session.customerId, rid = d.regionId, weak = sel().weakDays(s, rid);
    const days = [0, 1, 2, 3, 4, 5, 6].map(wd => {
      const eff = sel().dayStatusFor(s, rid, wd, cid), cap = sel().cap(s, rid, wd), k = T.nextDateForWeekday(wd);
      const e = { wd, effective: eff, dateLabel: dateShort(k), selected: d.abo[wd] != null };
      if (eff === 'few') e.sub = 'nur noch ' + cap.freeAbo + (cap.freeAbo === 1 ? ' Platz' : ' Plätze');
      if (eff === 'reserved') {
        const w = reservedFor(s, cid, rid).find(x => x.weekday === wd);
        e.sub = 'bis ' + (w ? T.fmt.rel(w.reservedUntil) : '');
        e.promo = 'für Sie reserviert';
      }
      if ((eff === 'free' || eff === 'few') && weak.includes(wd) && sel().feeFor(s, { mode: 'abo', wd, regionId: rid, customerId: cid }) === 0) e.promo = 'Zustellung gratis';
      e.disabled = eff === 'closed' || eff === 'planned';
      return e;
    });
    return html`<${WeekStrip} days=${days} onPick=${onPick} label="Liefertage wählen" />`;
  }

  function FlexPicker({ s, onFull }) {
    const d = s.draft, cid = s.session.customerId, rid = d.regionId;
    const dates = T.nextDates(14);
    const lab = { free: 'frei', few: 'wenige Plätze', full: 'ausgebucht', cutoff: 'Bestellschluss vorbei', closed: 'gesperrt', planned: 'in Planung' };
    return html`<div class="ui-week" role="group" aria-label="Liefertag wählen">${dates.map(k => {
      const fi = sel().flexInfo(s, rid, k, cid), wd = T.weekday(k), st = fi.state;
      const eff = st === 'cutoff' ? 'closed' : st;
      const dis = st === 'cutoff' || st === 'closed' || st === 'planned';
      const sub = st === 'few' ? 'nur noch ' + fi.free + (fi.free === 1 ? ' Platz' : ' Plätze') : fi.alreadyStop ? 'Sie liefern schon' : '';
      return html`<button type="button" key=${k} class=${cx('ui-day', 'ui-day-' + eff, d.flexDate === k && 'is-selected')} disabled=${dis}
        aria-pressed=${d.flexDate === k ? 'true' : 'false'} aria-label=${[WDL[wd], dateShort(k), lab[st], sub].filter(Boolean).join(', ')}
        onClick=${() => (st === 'full' ? onFull(k) : act().draftSetFlexDate(k))}>
        <span class="ui-day-wd">${WD[wd]}</span><span class="ui-day-date">${dateShort(k)}</span>
        <span class="ui-day-status"><span class="ui-dot"></span><span>${lab[st]}</span></span>
        ${sub ? html`<span class="ui-day-sub">${sub}</span>` : null}
        <span class="ui-day-time">bis ${T.fmt.hm(T.deadlineMin(k))}</span></button>`;
    })}</div>`;
  }

  /* ---------- Zusammenfassung „Ihre Woche“ ---------- */
  const DayChips = ({ wds }) => html`<span class="k-dchips">${wds.map(w => html`<span class="k-dchip" key=${w}>${WD[w]}</span>`)}</span>`;

  function WeekSummary({ s, sum, abo, tried }) {
    const live = sum.deliveries.filter(x => sumQty(x.items) > 0);
    const groups = abo && Array.isArray(sum.groups) ? sum.groups
      : live.map(x => ({ wds: x.wd != null ? [x.wd] : [], dateKey: x.dateKey, items: x.items, total: x.total, fee: x.fee }));
    const fees = live.reduce((a, x) => a + x.fee, 0);
    const empties = sum.planProblems.filter(p => p.indexOf('empty-day:') === 0).map(p => Number(p.split(':')[1]));
    const others = sum.planProblems.filter(p => p.indexOf('empty-day:') !== 0);
    const sv = sum.saving && sum.saving.perWeek > 0 ? sum.saving : null;
    return html`<section class="k-week" aria-label=${abo ? 'Ihre Woche' : 'Ihre Lieferung'}>
      <h3>${abo ? 'Ihre Woche' : 'Ihre Lieferung'}</h3>
      ${!live.length ? html`<p class="k-week-empty">Sobald Sie Artikel gewählt haben, sehen Sie hier Ihre Bestellung.</p>` : html`
        <ul class="k-week-rows">${groups.map((g, i) => html`<li key=${i}>
          <div class="k-week-who">${g.wds && g.wds.length ? html`<${DayChips} wds=${g.wds} />` : html`<span class="k-dchip">${g.dateKey ? T.fmt.day(g.dateKey) : ''}</span>`}
            <span class="k-week-txt">${sel().itemsText(s, g.items, 3)}</span></div>
          <div class="k-week-price">${eur(g.total)}<small>${abo ? 'je Lieferung' : 'Waren'}</small></div></li>`)}</ul>
        <div class="k-week-fee"><span>Zustellung</span><strong>${fees > 0 ? eur(fees) + (abo && live.length > 1 ? ' pro Woche' : '') : 'gratis (Aktion)'}</strong></div>
        <div class="k-week-total"><div><span class="k-week-lab">${abo ? 'Pro Woche' : 'Gesamt'}</span>
          <span class="k-week-n">${abo ? live.length + (live.length === 1 ? ' Lieferung' : ' Lieferungen') : 'einmalig'}</span></div>
          <strong>${eur(sum.total)}</strong></div>
        ${abo && sv ? html`<div class="k-week-save"><${Icon} name="leaf" size=${16} /> ${typeof sv.text === 'string' && sv.text ? sv.text : 'Abo-Vorteil: ' + eur(sv.perWeek) + ' pro Woche'}</div>` : null}
        ${abo && sum.promo && sum.promo.wds && sum.promo.wds.length ? html`<div class="k-week-promo"><${Icon} name="gift" size=${16} /> Aktion: die ersten ${sum.promo.weeks} Wochen keine Zustellgebühr am ${sum.promo.wds.map(w => WD[w]).join(', ')}</div>` : null}
        ${sum.firstDelivery ? html`<ul class="k-week-when">
          <li><${Icon} name="truck" size=${18} /><span>Erste Lieferung: <strong>${T.fmt.dayLong(sum.firstDelivery)}</strong>, bis ${T.fmt.hm(T.deadlineMin(sum.firstDelivery))} Uhr</span></li>
          <li><${Icon} name="clock" size=${18} /><span>Änderbar bis ${T.fmt.rel(sum.cutoff)} (<${Countdown} to=${sum.cutoff} />)</span></li></ul>` : null}`}
      ${empties.length ? html`<ul class="k-week-warn">${empties.map(w => html`<li key=${w}><${Icon} name="info" size=${16} /><span>${WDL[w]} ist noch leer. Artikel hinzufügen oder
        <button type="button" class="k-link" onClick=${() => act().draftToggleDay(w)}>abwählen</button>.</span></li>`)}</ul>` : null}
      ${tried && others.length ? html`<ul class="k-errs" role="alert">${others.map(p => html`<li key=${p}><${Icon} name="alert" size=${16} /> ${problemText(p)}</li>`)}</ul>` : null}
      <${Reassure} />
    </section>`;
  }

  function Reassure() {
    return html`<p class="k-reassure"><${Icon} name="lock" size=${16} /> Keine Bindung · jederzeit pausieren · bis 16:30 am Vortag änderbar</p>`;
  }

  /* ---------- Sheet: Sackerl auf andere Tage übernehmen ---------- */
  function CopySheet({ open, onClose, s, from }) {
    const [pick, setPick] = useState({});
    useEffect(() => { setPick({}); }, [open, from]);
    if (!open || from == null) return null;
    const cid = s.session.customerId, rid = s.draft.regionId;
    const days = [0, 1, 2, 3, 4, 5, 6].filter(w => w !== from).map(w => {
      const eff = sel().dayStatusFor(s, rid, w, cid);
      return { wd: w, eff, off: eff === 'full' || eff === 'closed' || eff === 'planned' || eff === 'booked' };
    });
    const chosen = days.filter(x => pick[x.wd] && !x.off).map(x => x.wd);
    const go = () => {
      const r = act().draftCopyToDays(from, chosen) || { copied: chosen, skipped: [] };
      const names = a => a.map(w => WD[w]).join(', ');
      toast('Übernommen für ' + (r.copied.length ? names(r.copied) : 'keinen Tag') + (r.skipped.length ? ' · übersprungen: ' + names(r.skipped) : ''), r.skipped.length ? 'warn' : 'ok');
      onClose();
    };
    return html`<${Sheet} open=${open} onClose=${onClose} title=${'Sackerl von ' + WDL[from] + ' übernehmen'}
      footer=${html`<${Btn} variant="ghost" onClick=${onClose}>Abbrechen<//><${Btn} variant="sun" disabled=${!chosen.length} onClick=${go}>Auf ${chosen.length || ''} ${chosen.length === 1 ? 'Tag' : 'Tage'} übernehmen<//>`}>
      <div class="k-copylist">${days.map(x => html`<${Toggle} key=${x.wd} id=${'copy-' + x.wd} label=${WDL[x.wd]} hint=${C.labels.effective[x.eff] + (x.eff === 'booked' ? ' (Wochenplan)' : '')}
        checked=${!!pick[x.wd] && !x.off} disabled=${x.off} onChange=${v => setPick(Object.assign({}, pick, { [x.wd]: v }))} />`)}</div>
    <//>`;
  }

  /* ---------- Schritt 1: Sackerl ---------- */
  function PlanStep({ s, registered }) {
    const d = s.draft, cid = s.session.customerId, rid = d.regionId, region = sel().region(s, rid);
    const [tried, setTried] = useState(false);
    const [picker, setPicker] = useState(null);       // { wd } | { flex:true }
    const [wl, setWl] = useState(null);
    const [fullPick, setFullPick] = useState(null);
    const [editPlz, setEditPlz] = useState(false);
    const [copyFrom, setCopyFrom] = useState(null);
    const [askSame, setAskSame] = useState(false);
    const abo = d.mode === 'abo';
    const sum = sel().draftSummary(s);
    const stats = sel().regionStats ? sel().regionStats(s, rid) : null;
    const reserved = reservedFor(s, cid, rid);
    const wds = Object.keys(d.abo).map(Number).sort((a, b) => a - b);
    const nItems = abo ? wds.reduce((a, w) => a + sumQty(d.abo[w]), 0) : sumQty(d.flex);
    const same = d.sameForAll !== false;
    const firstFilled = wds.find(w => sumQty(d.abo[w]) > 0);
    const differ = new Set(wds.filter(w => sumQty(d.abo[w]) > 0).map(w => JSON.stringify(Object.keys(d.abo[w]).sort().map(k => [k, d.abo[w][k]])))).size > 1;
    const makeSame = () => { act().draftSetSameForAll(true); setAskSame(false); };

    const pick = day => {
      const wd = day.wd;
      if (day.effective === 'full') { setWl(wd); return; }
      if (day.effective === 'booked') { toast(WDL[wd] + ' ist schon in Ihrem Wochenplan. Änderungen finden Sie im Konto.', 'info'); return; }
      const had = d.abo[wd] != null;
      act().draftToggleDay(wd);
      if (!had) scrollToId('k-sack-' + wd);
    };
    const next = () => {
      setTried(true);
      if (!sum.planValid) {
        toast(problemText(sum.planProblems[0]), 'warn');
        const p = sum.planProblems[0].split(':');
        if (p[0] === 'empty-day') scrollToId('k-sack-' + p[1]); else scrollToId('k-summary');
        return;
      }
      if (registered) {
        const r = act().placeOrder();
        if (!r.ok) { toast(problemText(r.problems[0]), 'warn'); return; }
      } else act().setDraft({ step: 'adresse' });
      scrollTop();
    };
    const pickerItems = picker ? (picker.flex ? d.flex : d.abo[picker.wd] || {}) : {};
    const pickerWd = picker ? (picker.flex ? (d.flexDate ? T.weekday(d.flexDate) : null) : picker.wd) : null;

    if (region && region.planned) {
      return html`<${Empty} icon="map" title=${region.name + ': Gebiet in Planung'} text="Hier liefern wir noch nicht. Auf der Startseite können Sie sich vormerken lassen."
        action=${html`<${Btn} variant="sun" onClick=${() => act().setUi({ customerView: 'start' })}>Zur Startseite<//>`} />`;
    }
    const unfitFlex = !abo && !d.flexDate;
    return html`<div class="k-planwrap"><div class="k-plan">
      <div class="k-plan-main">
        <div class="k-region">
          <div class="k-region-t"><${Icon} name="pin" size=${18} /><span><strong>${region ? region.name : ''}</strong> · ${d.plz}</span>
            <button type="button" class="k-link" onClick=${() => setEditPlz(!editPlz)}>${editPlz ? 'schließen' : 'ändern'}</button></div>
          ${stats && stats.households > 5 ? html`<div class="k-region-s">${stats.households} Haushalte in ${region.name} frühstücken schon mit uns.</div>` : null}
          ${editPlz ? html`<${PlzForm} s=${s} compact onDone=${() => setEditPlz(false)} />` : null}
        </div>

        <div class="k-lmode">
          <${Segmented} label="Lieferart" full value=${d.mode} onChange=${m => act().setDraft({ mode: m })}
            options=${[{ value: 'abo', label: html`Regelmäßig <span class="k-reco">Empfohlen</span>` }, { value: 'flex', label: 'Einmalig' }]} />
          <p class="k-lmode-t">${abo
            ? html`Fester Platz auf der Tour, Zustellung ab <strong>${eur(feeStd('abo', 0))}</strong> statt ab ${eur(feeStd('flex', 0))}.`
            : html`Solange Platz ist: Zustellung ab ${eur(feeStd('flex', 0))}, Bestellwert ab ${eur(C.fees.flexMinOrder)}.`}</p>
        </div>

        ${reserved.map(w => {
          const have = d.abo[w.weekday] != null && sumQty(d.abo[w.weekday]) > 0;
          return html`<div class="k-reserved" key=${w.id} id=${'k-res-' + w.weekday}>
            <div class="k-reserved-ic"><${Icon} name="bell" size=${24} /></div>
            <div class="ui-grow"><strong>${WDL[w.weekday]} ist frei und für Sie reserviert.</strong>
              <div>Reserviert bis ${T.fmt.rel(w.reservedUntil)} · <${Countdown} to=${w.reservedUntil} /></div></div>
            ${have ? html`<${Btn} variant="primary" onClick=${() => scrollToId('k-summary')}>Weiter zum Bestellen<//>`
              : html`<${Btn} variant="sun" icon="check" onClick=${() => { bookDay(w.weekday); scrollToId('k-sack-' + w.weekday); }}>${WDL[w.weekday]} buchen<//>`}
          </div>`;
        })}

        <h2 class="k-h2">${abo ? 'Liefertage wählen' : 'Liefertag wählen'}</h2>
        ${abo ? html`<${WeekPicker} s=${s} onPick=${pick} />` : html`<${FlexPicker} s=${s} onFull=${setFullPick} />`}

        ${!abo && fullPick ? (() => {
          const nk = T.nextDates(14, fullPick).find(k => { const f = sel().flexInfo(s, rid, k, cid).state; return f === 'free' || f === 'few'; });
          return html`<div class="k-lnote k-lnote-warn"><${Icon} name="info" size=${20} /><div><strong>${WDL[T.weekday(fullPick)]}, ${dateShort(fullPick)} ist für Einmallieferungen ausgebucht.</strong>
            ${nk ? html`<div>Nächster freier Tag: ${T.fmt.dayLong(nk)}. <button type="button" class="k-link" onClick=${() => { act().draftSetFlexDate(nk); setFullPick(null); }}>Diesen Tag wählen</button></div>` : null}</div></div>`;
        })() : null}

        ${abo ? html`${!wds.length ? html`<div class="k-sack-empty k-sack-first"><${Icon} name="door" size=${28} /><p><strong>Noch kein Liefertag gewählt.</strong><br />Tippen Sie oben auf die Tage, an denen Ihr Sackerl an der Tür hängen soll.</p></div>` : null}
          ${abo && wds.length > 1 && !same ? html`<div class="k-samebar">${askSame
            ? html`<div class="k-lnote k-lnote-warn"><${Icon} name="info" size=${20} /><div><strong>Die Sackerl unterscheiden sich.</strong> Das Sackerl von ${WDL[firstFilled != null ? firstFilled : wds[0]]} gilt dann für alle gewählten Tage.
              <div class="k-samebar-b"><${Btn} variant="sun" onClick=${makeSame}>Für alle gleich<//><${Btn} variant="ghost" onClick=${() => setAskSame(false)}>Abbrechen<//></div></div></div>`
            : html`<button type="button" class="k-link k-link-lg" onClick=${() => (differ ? setAskSame(true) : makeSame())}>Für alle Tage gleich</button>`}</div>` : null}
          ${same && wds.length ? html`<${BagCard} key="shared" s=${s} target=${{ wd: wds[0] }} days=${wds} tried=${tried} del=${sum.deliveries.find(x => x.wd === wds[0])} dels=${sum.deliveries.filter(x => wds.includes(x.wd) && sumQty(x.items) > 0)} status=${wds.length === 1 ? sel().dayStatusFor(s, rid, wds[0], cid) : null}
              onAdd=${() => setPicker({ wd: wds[0] })} onCopy=${wds.length === 1 ? () => setCopyFrom(wds[0]) : null} onRemove=${() => act().draftToggleDay(wds[0])} />
            ${wds.length > 1 ? html`<button type="button" class="k-link k-link-lg" onClick=${() => act().draftSetSameForAll(false)}>Jeden Tag anders zusammenstellen</button>` : null}`
            : wds.map(wd => html`<${BagCard} key=${wd} s=${s} target=${{ wd }} days=${[wd]} tried=${tried} del=${sum.deliveries.find(x => x.wd === wd)} status=${sel().dayStatusFor(s, rid, wd, cid)}
              onAdd=${() => setPicker({ wd })} onCopy=${() => setCopyFrom(wd)} onRemove=${() => act().draftToggleDay(wd)} />`)}`
          : html`${unfitFlex ? html`<div class="k-sack-empty k-sack-first"><${Icon} name="calendar" size=${28} /><p><strong>Wählen Sie einen Liefertag.</strong><br />Danach packen Sie Ihr Sackerl.</p></div>`
            : html`<${BagCard} s=${s} target=${{ flex: true }} tried=${tried} del=${sum.deliveries[0]} onAdd=${() => setPicker({ flex: true })} />`}
            <div class="k-lnote k-lnote-info"><${Icon} name="leaf" size=${20} /><div>Regelmäßig ist günstiger: Zustellung ab ${eur(feeStd('abo', 0))}.
              <button type="button" class="k-link" onClick=${() => act().setDraft({ mode: 'abo' })}>Regelmäßig ansehen</button></div></div>`}
      </div>

      <aside class="k-plan-side" id="k-summary" aria-label="Zusammenfassung"><${WeekSummary} s=${s} sum=${sum} abo=${abo} tried=${tried} /></aside>
    </div>
    ${sum.deliveries.length && nItems > 0 ? html`<${BagBar} count=${nItems} total=${abo ? eur(sum.perWeek) : eur(sum.total)}
      sub=${sum.cutoff ? html`<span class="k-bb-l">${abo ? sum.deliveries.length + (sum.deliveries.length === 1 ? ' Lieferung' : ' Lieferungen') + ' pro Woche' : 'Einmalig'}</span><span class="k-bb-l">Bestellschluss <${Countdown} to=${sum.cutoff} /></span>` : null}
      cta=${registered ? 'Bestellen' : 'Weiter'} onClick=${next} />` : null}
      <${ProductSheet} open=${!!picker} onClose=${() => setPicker(null)} s=${s} items=${pickerItems} wd=${pickerWd} mode=${d.mode}
        title=${picker && !picker.flex ? 'Artikel für ' + WDL[picker.wd] : 'Artikel hinzufügen'}
        onQty=${(id, n) => act().draftSetQty(picker, id, n)} />
      <${WaitlistSheet} open=${wl != null} onClose=${() => setWl(null)} s=${s} wd=${wl} regionId=${rid} />
      <${CopySheet} open=${copyFrom != null} onClose=${() => setCopyFrom(null)} s=${s} from=${copyFrom} />
    </div>`;
  }

  /* ---------- Schritt 2: Adresse ---------- */
  const EMAIL = /^\S+@\S+\.\S+$/;
  function addressErrors(s) {
    const a = s.draft.address, e = {};
    if (!a.name.trim()) e.name = 'Bitte geben Sie Ihren Namen ein.';
    if (!a.street.trim()) e.street = 'Bitte geben Sie die Straße ein.';
    if (!a.houseNo.trim()) e.houseNo = 'Hausnummer fehlt.';
    if (!/^\d{4}$/.test(a.plz.trim())) e.plz = 'Vierstellige PLZ eingeben.';
    else { const r = sel().regionForPlz(s, a.plz.trim()); if (!r || !r.region || r.region.id !== s.draft.regionId) e.plz = 'Diese PLZ liegt nicht in Ihrem Liefergebiet.'; }
    if (!a.city.trim()) e.city = 'Bitte geben Sie den Ort ein.';
    if (!EMAIL.test(a.email.trim())) e.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
    if (s.draft.placement === 'hinweis' && !s.draft.note.trim()) e.note = 'Bitte schreiben Sie uns, wo das Sackerl hin soll.';
    if (!s.draft.notify.push && !s.draft.notify.email) e.notify = 'Wählen Sie mindestens einen Benachrichtigungsweg.';
    return e;
  }
  function AddressStep({ s }) {
    const d = s.draft, a = d.address;
    const [tried, setTried] = useState(false);
    const [touched, setTouched] = useState({});
    const errs = addressErrors(s);
    const sum = sel().draftSummary(s);
    const set = (k, v) => act().setDraft({ address: Object.assign({}, a, { [k]: v }) });
    const show = k => (tried || touched[k]) && errs[k];
    const fld = (k, label, extra) => html`<${Field} id=${'adr-' + k} label=${label} value=${a[k]} error=${show(k)}
      onInput=${e => set(k, e.target.value)} onBlur=${() => setTouched(Object.assign({}, touched, { [k]: true }))} ...${extra || {}} />`;
    const submit = e => {
      e.preventDefault(); setTried(true);
      const keys = Object.keys(errs);
      if (keys.length) {
        toast('Bitte prüfen Sie die markierten Felder.', 'warn');
        const first = keys[0] === 'notify' ? 'adr-notify-push' : keys[0] === 'note' ? 'adr-note' : 'adr-' + keys[0];
        const el = document.getElementById(first); if (el && el.focus) el.focus();
        return;
      }
      act().setDraft({ step: 'zahlung' }); scrollTop();
    };
    return html`<form class="k-plan k-form" onSubmit=${submit} noValidate>
      <div class="k-plan-main ui-stack" style="--gap:22px">
        <h2 class="k-h2">Wohin soll das Sackerl?</h2>
        <div class="k-fgrid">
          ${fld('name', 'Vor- und Nachname', { autocomplete: 'name', class: 'k-span2' })}
          ${fld('street', 'Straße', { autocomplete: 'address-line1', class: 'k-span2-3' })}
          ${fld('houseNo', 'Hausnummer', { autocomplete: 'off' })}
          ${fld('plz', 'PLZ', { inputMode: 'numeric', maxLength: 4, autocomplete: 'postal-code' })}
          ${fld('city', 'Ort', { autocomplete: 'address-level2', class: 'k-span2' })}
          ${fld('email', 'E-Mail', { type: 'email', autocomplete: 'email', class: 'k-span2', hint: 'Für die Bestätigung und Rechnungen.' })}
          ${fld('phone', 'Telefon (optional)', { type: 'tel', autocomplete: 'tel', class: 'k-span2', hint: 'Nur für Rückfragen der Fahrerin oder des Fahrers.' })}
        </div>
        <div><h3 class="k-h3">Wo darf das Sackerl hängen?</h3>
          <${PlacementCards} idp="adr-pl" value=${d.placement} onChange=${v => act().setDraft({ placement: v })} /></div>
        <${Field} id="adr-note" as="textarea" rows="3" label=${d.placement === 'hinweis' ? 'Ihr Hinweis' : 'Hinweis für die Zustellung (optional)'} value=${d.note}
          placeholder="z. B. Hinterhof, grünes Tor, Klingel defekt" error=${show('note')} onInput=${e => act().setDraft({ note: e.target.value })}
          onBlur=${() => setTouched(Object.assign({}, touched, { note: true }))} />
        <div><h3 class="k-h3">Benachrichtigungen</h3>
          <div class="k-toggles">
            <${Toggle} id="adr-notify-push" label="Push-Nachricht" hint="„Ihr Frühstück ist da“ und Wartelisten-Meldungen" checked=${d.notify.push} onChange=${v => act().setDraft({ notify: Object.assign({}, d.notify, { push: v }) })} />
            <${Toggle} id="adr-notify-email" label="E-Mail" hint="Bestätigungen und Rechnungen" checked=${d.notify.email} onChange=${v => act().setDraft({ notify: Object.assign({}, d.notify, { email: v }) })} />
          </div>
          ${errs.notify ? html`<div class="ui-error-text" role="alert"><${Icon} name="alert" size=${16} /><span>${errs.notify}</span></div>` : null}</div>
        <div class="k-nav-row"><${Btn} variant="ghost" icon="chevron-left" onClick=${() => { act().setDraft({ step: 'plan' }); scrollTop(); }}>Zurück zum Sackerl<//>
          <${Btn} type="submit" variant="sun" size="lg" iconAfter="chevron-right">Weiter zur Bezahlung<//></div>
      </div>
      <aside class="k-plan-side"><${WeekSummary} s=${s} sum=${sum} abo=${d.mode === 'abo'} /></aside>
    </form>`;
  }

  /* ---------- Schritt 3: Bezahlung ---------- */
  function PaymentStep({ s }) {
    const d = s.draft, sum = sel().draftSummary(s);
    const [f, setF] = useState({ holder: '', iban: '', card: '', exp: '', cvc: '', mandate: false });
    const [tried, setTried] = useState(false);
    const upd = (k, v) => setF(Object.assign({}, f, { [k]: v }));
    const sepa = d.payment === 'sepa';
    const e = {};
    if (sepa) {
      if (!f.holder.trim()) e.holder = 'Bitte geben Sie den Kontoinhaber ein.';
      if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(f.iban.replace(/\s/g, '').toUpperCase())) e.iban = 'Bitte geben Sie eine gültige IBAN ein, z. B. AT61 1904 3002 3457 3201.';
      if (!f.mandate) e.mandate = 'Bitte bestätigen Sie das Lastschriftmandat.';
    } else {
      if (!f.holder.trim()) e.holder = 'Bitte geben Sie den Namen auf der Karte ein.';
      if (!/^\d{16}$/.test(f.card.replace(/\s/g, ''))) e.card = 'Die Kartennummer hat 16 Ziffern.';
      if (!/^(0[1-9]|1[0-2])\s?\/\s?\d{2}$/.test(f.exp.trim())) e.exp = 'Format MM/JJ.';
      if (!/^\d{3}$/.test(f.cvc.trim())) e.cvc = '3 Ziffern.';
    }
    const demo = () => setF(sepa ? Object.assign({}, f, { holder: d.address.name || 'Maria Beispiel', iban: 'AT61 1904 3002 3457 3201', mandate: true })
      : Object.assign({}, f, { holder: d.address.name || 'Maria Beispiel', card: '4111 1111 1111 1111', exp: '12/29', cvc: '123' }));
    const submit = ev => {
      ev.preventDefault(); setTried(true);
      if (Object.keys(e).length) { toast('Bitte prüfen Sie die markierten Felder.', 'warn'); return; }
      const r = act().placeOrder();
      if (!r.ok) { toast(problemText(r.problems[0]), 'warn'); if (r.problems.some(p => !/address/.test(p))) act().setDraft({ step: 'plan' }); else act().setDraft({ step: 'adresse' }); scrollTop(); }
      else scrollTop();
    };
    const fe = k => tried && e[k];
    return html`<form class="k-plan k-form" onSubmit=${submit} noValidate>
      <div class="k-plan-main ui-stack" style="--gap:22px">
        <h2 class="k-h2">Wie möchten Sie bezahlen?</h2>
        <div class="k-pay" role="radiogroup" aria-label="Zahlungsart">
          ${[['sepa', 'SEPA-Lastschrift', 'Monatlich, bequem vom Konto. Empfohlen.', 'euro'], ['karte', 'Kreditkarte', 'Monatliche Abrechnung per Karte.', 'lock']].map(([v, t, x, ic]) => html`
            <button type="button" key=${v} role="radio" aria-checked=${d.payment === v ? 'true' : 'false'} class=${cx('k-place-card', d.payment === v && 'is-on')} onClick=${() => { act().setDraft({ payment: v }); setTried(false); }}>
              <span class="k-place-ic"><${Icon} name=${ic} size=${22} /></span><span class="k-place-t"><strong>${t}</strong><small>${x}</small></span>
              <span class="k-place-check" aria-hidden="true">${d.payment === v ? html`<${Icon} name="check" size=${16} />` : null}</span></button>`)}
        </div>
        <div class="k-lnote k-lnote-info"><${Icon} name="info" size=${20} /><div><strong>Demo:</strong> Es wird nichts abgebucht. Sie können eigene Testwerte eintragen oder <button type="button" class="k-link" onClick=${demo}>Demo-Daten einfügen</button>.</div></div>
        <div class="k-fgrid">
          <${Field} id="pay-holder" label=${sepa ? 'Kontoinhaber' : 'Name auf der Karte'} class="k-span2" value=${f.holder} error=${fe('holder')} autocomplete="cc-name" onInput=${ev => upd('holder', ev.target.value)} />
          ${sepa ? html`<${Field} id="pay-iban" label="IBAN" class="k-span2" value=${f.iban} error=${fe('iban')} placeholder="AT00 0000 0000 0000 0000" autocomplete="off" onInput=${ev => upd('iban', ev.target.value)} />`
            : html`<${Field} id="pay-card" label="Kartennummer" class="k-span2" inputMode="numeric" value=${f.card} error=${fe('card')} autocomplete="cc-number" placeholder="0000 0000 0000 0000" onInput=${ev => upd('card', ev.target.value)} />
              <${Field} id="pay-exp" label="Gültig bis" value=${f.exp} error=${fe('exp')} placeholder="MM/JJ" autocomplete="cc-exp" onInput=${ev => upd('exp', ev.target.value)} />
              <${Field} id="pay-cvc" label="Prüfziffer" inputMode="numeric" maxLength="3" value=${f.cvc} error=${fe('cvc')} autocomplete="cc-csc" onInput=${ev => upd('cvc', ev.target.value)} />`}
        </div>
        ${sepa ? html`<div><${Toggle} id="pay-mandate" label="SEPA-Lastschriftmandat erteilen" hint="Wir buchen monatlich im Nachhinein ab. Widerruf jederzeit möglich." checked=${f.mandate} onChange=${v => upd('mandate', v)} />
          ${fe('mandate') ? html`<div class="ui-error-text" role="alert"><${Icon} name="alert" size=${16} /><span>${e.mandate}</span></div>` : null}</div>` : null}
        <div class="k-nav-row"><${Btn} variant="ghost" icon="chevron-left" onClick=${() => { act().setDraft({ step: 'adresse' }); scrollTop(); }}>Zurück zur Adresse<//>
          <${Btn} type="submit" variant="sun" size="lg" iconAfter="check">Verbindlich bestellen<//></div>
        <${Reassure} />
      </div>
      <aside class="k-plan-side"><${WeekSummary} s=${s} sum=${sum} abo=${d.mode === 'abo'} /></aside>
    </form>`;
  }

  /* ---------- Schritt 4: Fertig ---------- */
  function DoneStep({ s }) {
    const o = s.draft.lastOrder;
    if (!o) return html`<${Empty} icon="bag" title="Noch keine Bestellung" text="Stellen Sie Ihr Sackerl zusammen." action=${html`<${Btn} variant="sun" onClick=${() => act().setDraft({ step: 'plan' })}>Zum Lieferplan<//>`} />`;
    const abo = o.mode === 'abo';
    const rows = o.deliveries.map(x => ({ label: (abo ? WDL[x.wd] : T.fmt.day(x.dateKey)) + ' · ' + sel().itemsText(s, x.items, 2), value: eur(x.total + x.fee) }));
    rows.push({ label: abo ? 'Summe pro Woche' : 'Gesamtsumme', value: eur(o.total), strong: true });
    return html`<div class="k-done">
      <div class="k-done-head"><div class="k-done-ic"><${Icon} name="check" size=${32} /></div>
        <h2>Danke, Ihre Bestellung ist eingegangen.</h2>
        <p class="ui-lead">Ihre erste Lieferung: <strong>${T.fmt.dayLong(o.firstDelivery)}</strong>, bis spätestens ${T.fmt.hm(T.deadlineMin(o.firstDelivery))} Uhr an Ihrer Tür.</p></div>
      <${Ticket} title=${'Bestellung ' + o.orderNo} stamp="bestätigt" rows=${rows}
        footer=${html`<div class="k-first"><span>Erste Lieferung</span><strong>${T.fmt.dayLong(o.firstDelivery)}</strong><span>Änderbar bis</span><strong>${T.fmt.rel(o.cutoff)}</strong></div>`} />
      <div class="k-lnote k-lnote-info"><${Icon} name="truck" size=${20} /><div><strong>So geht es weiter:</strong> Ihre Bestellung ist jetzt im Backoffice sichtbar und in der Tour der Fahrer-App eingeplant.
        <div class="k-done-links"><button type="button" class="k-link" onClick=${() => act().go('backoffice')}>Im Backoffice ansehen</button> · <button type="button" class="k-link" onClick=${() => act().go('fahrer')}>In der Fahrer-App ansehen</button></div></div></div>
      <div class="k-nav-row"><${Btn} variant="sun" size="lg" iconAfter="chevron-right" onClick=${() => { act().setUi({ customerView: 'konto' }); scrollTop(); }}>Zum Konto<//>
        <${Btn} variant="ghost" onClick=${() => { act().setDraft({ step: 'plan', lastOrder: null }); scrollTop(); }}>Weiteres Sackerl zusammenstellen<//></div>
    </div>`;
  }

  /* ---------- Hauptansicht ---------- */
  function Lieferplan() {
    const s = App.useStore();
    const d = s.draft, cid = s.session.customerId, cust = sel().customer(s, cid);
    const registered = !!(cust && cust.registered);
    const hasItems = Object.keys(d.abo).length > 0 || sumQty(d.flex) > 0;
    const stale = d.step === 'fertig' && hasItems;
    const step = stale ? 'plan' : d.step;
    // Region aus Konto bzw. Wartelisten-Eintrag übernehmen
    useEffect(() => {
      if (stale) act().setDraft({ step: 'plan' });
      if (d.regionId) return;
      if (registered && cust.plz) act().draftCheckPlz(cust.plz);
      else {
        const w = s.waitlist.find(x => x.customerId === cid && x.status === 'notified' && x.contact && x.contact.plz);
        if (w) act().draftCheckPlz(w.contact.plz);
      }
    }, [d.regionId, cid, stale]);
    const lastStep = useRef(step);
    useEffect(() => { if (lastStep.current !== step) { lastStep.current = step; scrollTop(); } }, [step]);

    const steps = registered ? [{ id: 'plan', label: 'Sackerl' }, { id: 'fertig', label: 'Fertig' }]
      : [{ id: 'plan', label: 'Sackerl' }, { id: 'adresse', label: 'Adresse' }, { id: 'zahlung', label: 'Bezahlung' }, { id: 'fertig', label: 'Fertig' }];
    const region = d.regionId ? sel().region(s, d.regionId) : null;
    let body;
    if (step === 'fertig') body = html`<${DoneStep} s=${s} />`;
    else if (!region) body = html`<div class="k-gate"><h2>Wohin dürfen wir liefern?</h2><p class="ui-lead">Mit Ihrer Postleitzahl sehen Sie, an welchen Tagen Plätze frei sind.</p><${PlzForm} s=${s} /></div>`;
    else if (step === 'adresse' && !registered) body = html`<${AddressStep} s=${s} />`;
    else if (step === 'zahlung' && !registered) body = html`<${PaymentStep} s=${s} />`;
    else body = html`<${PlanStep} s=${s} registered=${registered} />`;

    return html`<div class="k-lieferplan">
      <header class="k-lp-head"><h1>Ihr Lieferplan</h1>${region && step !== 'fertig' ? html`<${Steps} steps=${steps} current=${step} />` : null}</header>
      ${body}
    </div>`;
  }

  Lieferplan.shared = { ProductSheet, WaitlistSheet, PlacementCards, bookDay, reservedFor, sumQty, dateShort, scrollTop };
  App.views = App.views || {};
  App.views.customer = App.views.customer || {};
  App.views.customer.lieferplan = Lieferplan;
})(typeof window !== 'undefined' ? window : globalThis);
