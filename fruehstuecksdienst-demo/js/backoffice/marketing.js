/* Backoffice › Marketing (V3): Kampagnen, Mengenaktionen, Gutscheine, Empfehlungen, Saison-Aktion. */
(function (root) {
  const App = root.App = root.App || {};
  const { html, useState } = App.lib;
  const { Btn, Pill, Field, Segmented, Sheet, ConfirmSheet, Toggle, Chip, PushBanner, Icon, toast } = App.ui;
  const T = App.time, F = App.fmt;
  const B = () => App.boA;

  const SEGMENTS = [
    { value: 'all', label: 'Alle Kunden' }, { value: 'monday-only', label: 'Nur Montag-Kunden' }, { value: 'weekend-only', label: 'Nur Wochenend-Kunden' },
    { value: 'no-midweek', label: 'Kunden ohne Liefertag Di–Fr' }, { value: 'waitlist', label: 'Warteliste' }
  ];
  const segLabel = v => (SEGMENTS.find(x => x.value === v) || { label: v }).label;
  const CHANNELS = [{ value: 'push', label: 'Push', icon: 'phone' }, { value: 'email', label: 'E-Mail', icon: 'mail' }];

  /* ---------- Kampagnen ---------- */
  function Ideas({ s, region, onUse }) {
    const ideas = App.sel.campaignIdeas(s, region.id);
    if (!ideas.length) return html`<p class="ui-muted">Aktuell gibt es keinen Vorschlag. Die Auslastung ist ausgewogen.</p>`;
    return html`<div class="bo-ideas">${ideas.map(i => html`<article key=${i.id} class="bo-idea">
      <h3>${i.title}</h3><p class="ui-muted">${i.reason}</p>
      <div class="ui-row"><${Pill} tone="neutral" icon=${i.channel === 'push' ? 'phone' : 'mail'}>${i.channel === 'push' ? 'Push' : 'E-Mail'}<//>
        <${Pill} tone="info" icon="users">${i.recipients} Empfänger<//><span class="ui-grow"></span>
        <${Btn} size="sm" variant="sun" icon="edit" onClick=${() => onUse(i)}>Übernehmen<//></div></article>`)}</div>`;
  }

  function EmailPreview({ title, body }) {
    return html`<div class="bo-mail" aria-label="Vorschau E-Mail">
      <div class="bo-mail-head"><span class="ui-muted">Von</span> ${App.config.brand.name} <span class="ui-mono ui-muted">&lt;hallo@${App.config.brand.domain}&gt;</span>
        <div><span class="ui-muted">Betreff</span> <strong>${title || '(ohne Betreff)'}</strong></div></div>
      <div class="bo-mail-body">${(body || '(ohne Text)').split('\n').map((l, i) => html`<p key=${i}>${l}</p>`)}<p class="ui-muted">Ihr ${App.config.brand.name}-Team</p></div></div>`;
  }

  function Composer({ s, draft, setDraft }) {
    const n = App.sel.segmentCustomers(s, draft.segment).length;
    const ok = draft.title.trim() && draft.body.trim() && n > 0;
    const send = () => {
      const r = App.actions.sendCampaign({ title: draft.title.trim(), body: draft.body.trim(), channel: draft.channel, segment: draft.segment });
      toast('Kampagne gesendet · ' + r.recipients + ' Empfänger', 'ok');
      setDraft({ title: '', body: '', channel: draft.channel, segment: draft.segment });
    };
    const set = p => setDraft(Object.assign({}, draft, p));
    return html`<div class="bo-composer" id="mk-composer">
      <div class="ui-stack">
        <${Field} id="mk-title" label="Titel" value=${draft.title} onInput=${e => set({ title: e.target.value })} placeholder="Zum Beispiel: Frisches Gebäck auch unter der Woche" />
        <${Field} id="mk-body" label="Text" as="textarea" rows="4" value=${draft.body} onInput=${e => set({ body: e.target.value })} />
        <div class="ui-field"><span class="ui-label">Kanal</span><${Segmented} label="Kanal" options=${CHANNELS} value=${draft.channel} onChange=${v => set({ channel: v })} /></div>
        <${Field} id="mk-seg" label="Empfänger" as="select" value=${draft.segment} onChange=${e => set({ segment: e.target.value })} options=${SEGMENTS}
          hint=${n + ' Empfänger in allen Gebieten. Im Demo-Postfach erhalten nur die zwei Demo-Konten die Nachricht.'} />
      </div>
      <div class="bo-prev"><div class="ui-eyebrow">Vorschau</div>
        ${draft.channel === 'push' ? html`<div class="bo-pushprev"><${PushBanner} notification=${{ title: draft.title || '(ohne Titel)', body: draft.body || '(ohne Text)' }} /></div>`
          : html`<${EmailPreview} title=${draft.title} body=${draft.body} />`}
        <${Btn} variant="sun" icon="send" disabled=${!ok} onClick=${send}>An ${n} Empfänger senden<//>
        ${!ok ? html`<span class="ui-hint">Titel, Text und mindestens ein Empfänger sind nötig.</span>` : null}</div>
    </div>`;
  }

  function Log({ s }) {
    if (!s.campaigns.length) return html`<p class="ui-muted">Noch keine Kampagne gesendet.</p>`;
    return html`<div class="ui-tablewrap"><table class="ui-table"><thead><tr><th>Gesendet</th><th>Titel</th><th>Kanal</th><th>Empfänger</th><th class="num">Anzahl</th></tr></thead>
      <tbody>${s.campaigns.map(c => html`<tr key=${c.id}><td class="ui-mono">${T.fmt.dateTime(new Date(c.sentAt))}</td><td><strong>${c.title}</strong></td>
        <td><${Pill} tone="neutral" icon=${c.channel === 'push' ? 'phone' : 'mail'}>${c.channel === 'push' ? 'Push' : 'E-Mail'}<//></td><td>${segLabel(c.segment)}</td><td class="num">${c.recipients}</td></tr>`)}</tbody></table></div>`;
  }

  /* ---------- Mengenaktionen ---------- */
  const dayText = wds => {
    if (!wds || wds.length === 7) return 'alle Tage';
    const w = wds.slice().sort((a, b) => a - b);
    if (w.length > 1 && w[w.length - 1] - w[0] === w.length - 1) return T.WD[w[0]] + '–' + T.WD[w[w.length - 1]];
    return w.map(d => T.WD[d]).join(', ');
  };
  const pName = (s, id, plural) => { const p = App.sel.product(s, id); return p ? (plural ? p.plural : p.name) : id; };
  const getText = (s, o) => o.get.qty + ' × ' + pName(s, o.get.productId) + (o.get.pct >= 100 ? ' gratis' : ' mit ' + o.get.pct + ' % Rabatt');
  const buyText = (s, o) => o.buy.qty + ' × ' + (o.buy.kind === 'cat' ? 'aus „' + App.config.labels.cat[o.buy.ref] + '“' : pName(s, o.buy.ref));
  function autoTitle(s, o) {
    const same = o.buy.kind === 'product' && o.buy.ref === o.get.productId;
    const g = o.get.pct >= 100 ? 'gratis' : 'mit ' + o.get.pct + ' % Rabatt';
    if (same) return o.buy.qty + ' ' + pName(s, o.buy.ref, true) + ' + ' + o.get.qty + ' ' + g;
    const b = o.buy.kind === 'cat' ? App.config.labels.cat[o.buy.ref] : pName(s, o.buy.ref, true);
    return 'Ab ' + o.buy.qty + ' ' + b + ': ' + o.get.qty + ' ' + pName(s, o.get.productId) + ' ' + g;
  }

  function CalcBox({ s, o }) {
    const c = App.sel.offerCalc(s, o);
    const gp = App.sel.product(s, o.get.productId) || { name: 'Artikel', cost: 0, price: 0 };
    const rate = c.driverPerPiece != null ? c.driverPerPiece : (App.config.economics || {}).driverPerPiece || 0;
    const verdict = c.verdict || (c.offerMargin <= 0 ? 'loss' : 'gain');
    const gm = c.giftUnitMargin != null ? c.giftUnitMargin : null;
    const up = c.breakEvenUpliftPct;
    const loss = verdict === 'loss';
    const free = o.get.pct >= 100;
    const tone = loss ? 'full' : verdict === 'neutral' || (up != null && up > 25) ? 'warn' : 'ok';
    const unit = free ? gp.name : gp.name + ' mit ' + o.get.pct + ' % Rabatt';
    let line;
    if (loss && free) line = 'Jede Gratis-' + gp.name + ' kostet ' + F.eur(gp.cost + rate) + ': ' + F.eur(gp.cost) + ' Einkauf + ' + F.eur(rate) + ' Fahrer.';
    else if (loss) line = 'Jede ' + unit + ' kostet ' + F.eur(-gm) + ' drauf: Preis ' + F.eur(gp.price) + ' − Nachlass ' + F.eur(c.discountPerUnit != null ? c.discountPerUnit : gp.price * o.get.pct / 100) + ' − Einkauf ' + F.eur(gp.cost) + ' − Fahrer ' + F.eur(rate) + '.';
    else line = 'Jede ' + unit + ' bringt noch ' + F.eur(gm != null ? gm : 0) + ' Ertrag: Preis ' + F.eur(gp.price) + ' − Nachlass ' + F.eur(c.discountPerUnit != null ? c.discountPerUnit : gp.price * o.get.pct / 100) + ' − Einkauf ' + F.eur(gp.cost) + ' − Fahrer ' + F.eur(rate) + '.';
    const delta = c.deltaPerBundle;
    return html`<div class=${'bo-calc bo-calc-' + tone} aria-live="polite">
      <div class="bo-calc-head"><${Icon} name=${loss ? 'alert' : tone === 'ok' ? 'check' : 'info'} size=${20} /><strong>${loss ? 'Achtung: Diese Aktion macht Verlust' : tone === 'ok' ? 'Lohnt sich' : 'Lohnt sich nur mit deutlich mehr Absatz'}</strong></div>
      <p class=${loss ? 'bo-calc-loss' : ''}>${line}</p>
      <p>Deckungsbeitrag je Bündel <strong>${F.eur(c.offerMargin)}</strong> statt ${F.eur(c.normalMargin)}${delta != null && delta < 0 ? ' (' + F.eur(delta).replace('-', '−') + ')' : ''}${!loss && up != null ? ' · lohnt sich, wenn dadurch ' + F.pct(up / 100) + ' mehr Bündel verkauft werden' : ''}${!loss && up == null && delta != null && delta >= 0 ? ' · lohnt sich sofort, auch ohne zusätzlichen Absatz' : ''}.</p>
      ${loss ? html`<p class="bo-calc-loss">Jeder zusätzliche Verkauf vergrößert den Verlust. Verringern Sie die Zugabe oder erhöhen Sie den Kaufwert.</p>` : null}
      <table class="bo-calc-t"><thead><tr><th></th><th class="num">ohne Aktion</th><th class="num">mit Aktion</th></tr></thead><tbody>
        <tr><th scope="row">Umsatz</th><td class="num">${F.eur(c.normalRevenue)}</td><td class="num">${F.eur(c.offerRevenue)}</td></tr>
        <tr><th scope="row">Einkauf und Fahrer</th><td class="num">${F.eur(c.normalCost)}</td><td class="num">${F.eur(c.offerCost)}</td></tr>
        <tr><th scope="row">Deckungsbeitrag</th><td class="num">${F.eur(c.normalMargin)}</td><td class="num"><strong>${F.eur(c.offerMargin)}</strong></td></tr></tbody></table>
      <p class="ui-muted bo-calc-note">Ein Bündel: ${o.buy.qty} × ${o.buy.kind === 'cat' ? 'Artikel der Kategorie' : 'gekaufte Artikel'} + ${getText(s, o)}. Fahrervergütung ${F.eur(rate)} je Stück ist eingerechnet. Annahme: Der Kunde hätte die gekauften Stücke ohnehin bestellt.</p>
    </div>`;
  }

  function OfferSheet({ s, region, offer, onClose }) {
    const fresh = !offer.id;
    const [o, setO] = useState(fresh ? Object.assign({}, offer, { title: autoTitle(s, offer) }) : offer);
    const [auto, setAuto] = useState(fresh);
    const upd = p => {
      const n = Object.assign({}, o, p);
      if (auto) n.title = autoTitle(s, n);
      setO(n);
    };
    const days = o.weekdays || [0, 1, 2, 3, 4, 5, 6];
    const toggleDay = d => { const n = days.includes(d) ? days.filter(x => x !== d) : days.concat([d]); upd({ weekdays: n.length === 7 ? null : n.sort((a, b) => a - b) }); };
    const weak = App.sel.weakDays(s, region.id);
    const cats = App.config.labels.cat;
    const products = s.products.filter(p => p.active !== false || p.id === o.get.productId || p.id === o.buy.ref);
    const valid = o.title.trim() && days.length > 0 && o.buy.qty >= 1 && o.get.qty >= 1 && o.get.pct >= 1 && o.get.pct <= 100 && o.get.productId && o.buy.ref;
    const save = () => {
      App.actions.saveOffer(Object.assign({}, o, { title: o.title.trim(), weekdays: o.weekdays && o.weekdays.length ? o.weekdays : null }));
      toast('Aktion „' + o.title.trim() + '“ gespeichert', 'ok');
      onClose();
    };
    const setBuy = p => upd({ buy: Object.assign({}, o.buy, p) });
    const setGet = p => upd({ get: Object.assign({}, o.get, p) });
    return html`<${Sheet} open=${true} onClose=${onClose} wide=${true} title=${fresh ? 'Neue Mengenaktion' : 'Mengenaktion bearbeiten'}
      footer=${[html`<${Btn} key="c" variant="ghost" onClick=${onClose}>Abbrechen<//>`, html`<${Btn} key="s" variant="sun" icon="check" disabled=${!valid} onClick=${save}>Speichern<//>`]}>
      <div class="ui-stack bo-offer-edit">
        <fieldset class="bo-fs"><legend>Kaufe …</legend><div class="bo-fs-grid">
          <div class="ui-field"><span class="ui-label">Menge</span><${Stepper2} label="Menge kaufen" value=${o.buy.qty} min=${1} max=${50} onChange=${v => setBuy({ qty: v })} /></div>
          <${Field} id="of-bkind" label="Art" as="select" value=${o.buy.kind} options=${[{ value: 'product', label: 'Artikel' }, { value: 'cat', label: 'Kategorie' }]}
            onChange=${e => upd({ buy: { kind: e.target.value, ref: e.target.value === 'cat' ? 'gebaeck' : (s.products[0] || {}).id, qty: o.buy.qty } })} />
          <${Field} id="of-bref" label=${o.buy.kind === 'cat' ? 'Kategorie' : 'Artikel'} as="select" value=${o.buy.ref} onChange=${e => setBuy({ ref: e.target.value })}
            options=${o.buy.kind === 'cat' ? Object.keys(cats).map(k => ({ value: k, label: cats[k] })) : products.map(p => ({ value: p.id, label: p.name }))} />
        </div></fieldset>
        <fieldset class="bo-fs"><legend>… erhalte</legend><div class="bo-fs-grid">
          <div class="ui-field"><span class="ui-label">Menge</span><${Stepper2} label="Menge erhalten" value=${o.get.qty} min=${1} max=${20} onChange=${v => setGet({ qty: v })} /></div>
          <${Field} id="of-gprod" label="Artikel" as="select" value=${o.get.productId} onChange=${e => setGet({ productId: e.target.value })} options=${products.map(p => ({ value: p.id, label: p.name }))} />
          <div class="ui-field"><span class="ui-label">Vorteil</span><${Segmented} label="Vorteil" value=${o.get.pct >= 100 ? 'free' : 'pct'}
            options=${[{ value: 'free', label: 'gratis' }, { value: 'pct', label: 'mit Rabatt' }]} onChange=${v => setGet({ pct: v === 'free' ? 100 : 50 })} /></div>
          ${o.get.pct < 100 ? html`<${Field} id="of-pct" label="Rabatt" type="number" min="1" max="99" suffix="%" value=${o.get.pct} onInput=${e => setGet({ pct: Math.max(1, Math.min(99, Number(e.target.value) || 1)) })} />` : null}
        </div></fieldset>
        <fieldset class="bo-fs"><legend>Gilt an</legend>
          <div class="ui-row bo-chips" role="group" aria-label="Wochentage">${T.WD.map((d, i) => html`<${Chip} key=${i} selected=${days.includes(i)} onClick=${() => toggleDay(i)}>${d}<//>`)}</div>
          <div class="ui-row bo-chips"><${Btn} size="sm" variant="ghost" onClick=${() => upd({ weekdays: null })}>Alle Tage<//>
            <${Btn} size="sm" variant="ghost" disabled=${!weak.length} onClick=${() => upd({ weekdays: weak.slice() })}>Nur schwache Tage${weak.length ? ' (' + dayText(weak) + ')' : ''}<//></div>
          ${!days.length ? html`<div class="ui-error-text" role="alert"><${Icon} name="alert" size=${16} /><span>Wählen Sie mindestens einen Tag.</span></div>` : null}
        </fieldset>
        <${Field} id="of-title" label="Name der Aktion" value=${o.title} onInput=${e => { setAuto(false); setO(Object.assign({}, o, { title: e.target.value })); }} hint=${auto ? 'Wird aus den Angaben erzeugt, bis Sie ihn ändern.' : null} />
        <${Field} id="of-note" label="Interne Notiz" value=${o.note || ''} onInput=${e => setO(Object.assign({}, o, { note: e.target.value }))} />
        <${CalcBox} s=${s} o=${o} />
      </div>
    <//>`;
  }
  function Stepper2(p) { return html`<${App.ui.Stepper} ...${p} />`; }

  function Offers({ s, region }) {
    const [edit, setEdit] = useState(null);
    const [del, setDel] = useState(null);
    const blank = () => ({ title: '', active: true, buy: { kind: 'product', ref: 'kaisersemmel', qty: 5 }, get: { productId: 'kaisersemmel', qty: 1, pct: 100 }, weekdays: null, note: '' });
    return html`<section class="ui-card bo-sec" aria-labelledby="mk-h-offers">
      <div class="bo-sechd"><div class="ui-grow"><h2 id="mk-h-offers">Mengenaktionen</h2>
        <p class="ui-muted bo-sec-sub">Kaufanreize, die Kunden im Sortiment und im Lieferplan sehen. Die Kalkulation zeigt, ab wann sich eine Aktion lohnt.</p></div>
        <${Btn} size="sm" variant="sun" icon="plus" onClick=${() => setEdit(blank())}>Neue Aktion<//></div>
      <ul class="bo-offers">${s.offers.map(o => {
        const c = App.sel.offerCalc(s, o);
        const loss = (c.verdict || (c.offerMargin <= 0 ? 'loss' : 'gain')) === 'loss';
        return html`<li key=${o.id} class=${'bo-offer' + (o.active ? '' : ' is-off')}>
          <div class="bo-offer-main"><strong>${o.title}</strong>
            <div class="ui-muted">Kaufe ${buyText(s, o)} → erhalte ${getText(s, o)} · ${dayText(o.weekdays)}${o.note ? ' · ' + o.note : ''}</div>
            <div class="ui-row bo-offer-pills">${loss ? html`<${Pill} tone="full" icon="alert">macht Verlust<//>` : (c.breakEvenUpliftPct == null ? html`<${Pill} tone="ok">lohnt sich<//>` : html`<${Pill} tone=${c.breakEvenUpliftPct > 60 ? 'warn' : 'ok'}>lohnt ab +${F.pct(c.breakEvenUpliftPct / 100)} Absatz<//>`)}
              <${Pill} tone=${o.active ? 'ok' : 'neutral'}>${o.active ? 'aktiv' : 'aus'}<//></div></div>
          <div class="bo-offer-act"><${Toggle} id=${'of-on-' + o.id} label=${o.active ? 'Ein' : 'Aus'} checked=${o.active} onChange=${v => App.actions.toggleOffer(o.id, v)} />
            <${Btn} size="sm" variant="ghost" icon="edit" onClick=${() => setEdit(JSON.parse(JSON.stringify(o)))} aria-label=${o.title + ' bearbeiten'}>Bearbeiten<//>
            <${Btn} size="sm" variant="quiet" icon="trash" onClick=${() => setDel(o)} aria-label=${o.title + ' löschen'}>Löschen<//></div></li>`;
      })}</ul>
      ${!s.offers.length ? html`<p class="ui-muted">Noch keine Mengenaktion angelegt.</p>` : null}
      ${edit ? html`<${OfferSheet} key=${edit.id || 'new'} s=${s} region=${region} offer=${edit} onClose=${() => setEdit(null)} />` : null}
      <${ConfirmSheet} open=${!!del} title="Aktion löschen?" danger=${true} confirmLabel="Löschen"
        text=${del ? '„' + del.title + '“ wird gelöscht. Kunden sehen sie nicht mehr.' : ''} onClose=${() => setDel(null)}
        onConfirm=${() => { App.actions.deleteOffer(del.id); toast('Aktion gelöscht', 'ok'); setDel(null); }} />
    </section>`;
  }

  /* ---------- Gutscheine, Empfehlungen, Saison ---------- */
  function Vouchers() {
    const rows = [
      ['WILLKOMMEN', 'Zustellung ' + App.config.promo.weakDayFreeWeeks + ' Wochen gratis', 'Neukunden', 38, 'aktiv'],
      ['NACHBARN5', F.eur(App.config.promo.referralCredit) + ' Guthaben für beide', 'Empfehlungen', 21, 'aktiv'],
      ['SONNTAG2', F.eur(2) + ' auf das Sonntagsfrühstück', 'Wochenend-Kunden', 12, 'aktiv'],
      ['HERBST', F.eur(3) + ' auf die erste Einmallieferung', 'Einmalbesteller', 44, 'abgelaufen']
    ];
    return html`<div class="ui-tablewrap"><table class="ui-table"><thead><tr><th>Code</th><th>Wirkung</th><th>Für</th><th class="num">Eingelöst</th><th>Status</th></tr></thead>
      <tbody>${rows.map(r => html`<tr key=${r[0]}><td class="ui-mono"><strong>${r[0]}</strong></td><td>${r[1]}</td><td>${r[2]}</td><td class="num">${r[3]}</td>
        <td><${Pill} tone=${r[4] === 'aktiv' ? 'ok' : 'neutral'}>${r[4]}<//></td></tr>`)}</tbody></table></div>`;
  }
  function Referrals({ s, region }) {
    const reg = s.customers.filter(c => c.registered && c.regionId === region.id && c.id !== 'c-huber');
    const credit = App.config.promo.referralCredit;
    const rows = [[0, 1, 'gutgeschrieben'], [2, 3, 'gutgeschrieben'], [4, 5, 'wartet auf erste Lieferung'], [6, 7, 'gutgeschrieben']].filter(r => reg[r[1]]);
    if (!rows.length) return html`<p class="ui-muted">Noch keine Empfehlungen.</p>`;
    return html`<div class="ui-tablewrap"><table class="ui-table"><thead><tr><th>Geworben von</th><th>Neuer Haushalt</th><th class="num">Guthaben</th><th>Status</th></tr></thead>
      <tbody>${rows.map(r => html`<tr key=${r[0]}><td>${reg[r[0]].name}</td><td>${reg[r[1]].name}</td><td class="num">${F.eur(credit)}</td>
        <td><${Pill} tone=${r[2] === 'gutgeschrieben' ? 'ok' : 'warn'}>${r[2]}<//></td></tr>`)}</tbody></table></div>`;
  }
  function Season({ s }) {
    const ss = App.config.season, on = s.ui.seasonActive !== false;
    const p = App.sel.product(s, ss.productId);
    const open = T.isOpenFor(ss.dateKey);
    return html`<div class="bo-season"><div class="ui-grow"><strong>${ss.title}</strong>
        <div class="ui-muted">Lieferung ${T.fmt.dayLong(ss.dateKey)}${p ? ' · ' + F.eur(p.price) : ''} · ${open ? 'Bestellschluss ' + T.fmt.dateTime(T.cutoffFor(ss.dateKey)) : 'Bestellschluss vorbei'}</div></div>
      <${Pill} tone=${on && open ? 'ok' : 'neutral'}>${!open ? 'beendet' : on ? 'wird beworben' : 'ausgeblendet'}<//>
      <${Toggle} id="mk-season" label=${on ? 'Ein' : 'Aus'} checked=${on} disabled=${!open} onChange=${v => App.actions.setUi({ seasonActive: v })} /></div>`;
  }

  function Marketing() {
    const s = App.useStore();
    const region = B().regionOf(s);
    const [draft, setDraft] = useState({ title: '', body: '', channel: 'push', segment: 'all' });
    const use = i => {
      setDraft({ title: i.title, body: i.suggestedText, channel: i.channel, segment: i.segment });
      setTimeout(() => { const el = document.getElementById('mk-title'); if (el) { el.scrollIntoView({ block: 'center' }); el.focus({ preventScroll: true }); } }, 60);
    };
    return html`<div class="bo-page">
      ${B().head('Marketing', region.name + ' · Kampagnen, Aktionen und Gutscheine')}
      <section class="ui-card bo-sec" aria-labelledby="mk-h-ideas"><h2 id="mk-h-ideas">Vorschläge aus der Auslastung</h2><${Ideas} s=${s} region=${region} onUse=${use} /></section>
      <section class="ui-card bo-sec" aria-labelledby="mk-h-comp"><h2 id="mk-h-comp">Kampagne schreiben</h2><${Composer} s=${s} draft=${draft} setDraft=${setDraft} />
        <h3 class="bo-sub">Protokoll</h3><${Log} s=${s} /></section>
      <${Offers} s=${s} region=${region} />
      <div class="bo-grid2">
        <section class="ui-card bo-sec" aria-labelledby="mk-h-v"><h2 id="mk-h-v">Gutscheincodes</h2><p class="ui-muted bo-sec-sub">Beispieldaten</p><${Vouchers} /></section>
        <section class="ui-card bo-sec" aria-labelledby="mk-h-r"><h2 id="mk-h-r">Empfehlungen</h2><p class="ui-muted bo-sec-sub">Beispieldaten · Guthaben ${F.eur(App.config.promo.referralCredit)} je Empfehlung</p><${Referrals} s=${s} region=${region} /></section>
      </div>
      <section class="ui-card bo-sec" aria-labelledby="mk-h-s"><h2 id="mk-h-s">Saison-Aktion</h2><${Season} s=${s} /></section>
    </div>`;
  }

  App.views = App.views || {};
  App.views.backoffice = App.views.backoffice || {};
  App.views.backoffice.marketing = Marketing;
})(typeof window !== 'undefined' ? window : globalThis);
