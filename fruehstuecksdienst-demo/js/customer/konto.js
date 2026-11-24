/* Kunden-App: Konto – Lieferungen, Pause, Wochenplan, Warteliste, Nachrichten, Einstellungen.
   Nutzt geteilte Bausteine aus lieferplan.js (App.views.customer.lieferplan.shared), erst beim Rendern aufgelöst. */
(function (root) {
  const App = root.App = root.App || {};
  const { html, useState } = App.lib;
  const U = App.ui;
  const { Icon, Btn, Pill, Segmented, Field, Toggle, Tabs, Stepper, Photo, Empty, ConfirmSheet, cx, toast } = U;
  const T = App.time, C = App.config;
  const sel = () => App.sel, act = () => App.actions;
  const eur = n => App.fmt.eur(n);
  const WD = T.WD, WDL = T.WD_LONG;
  const shared = () => (App.views.customer.lieferplan && App.views.customer.lieferplan.shared) || {};
  const MONTHS = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const sumQty = o => Object.keys(o || {}).reduce((a, k) => a + (o[k] > 0 ? o[k] : 0), 0);
  const goPlan = () => { act().setUi({ customerView: 'lieferplan' }); if (root.scrollTo) root.scrollTo(0, 0); };

  /* ---------- Demo-Umschalter ---------- */
  function Switcher({ cid }) {
    return html`<div class="k-switch"><span class="k-switch-l"><${Icon} name="user" size=${16} /> Demo-Ansicht</span>
      <${Segmented} label="Kundenansicht wechseln" value=${cid} onChange=${v => act().switchCustomer(v)}
        options=${[{ value: 'me', label: 'Besucher' }, { value: 'c-huber', label: 'Maria Huber' }]} /></div>`;
  }

  /* ---------- Reservierung: Banner ---------- */
  function bookNow(cust, w) {
    const a = act();
    a.draftCheckPlz(cust.plz || (w.contact && w.contact.plz) || '');
    shared().bookDay(w.weekday);
    goPlan();
  }
  function ReservedBanner({ s, cust }) {
    const list = shared().reservedFor(s, cust.id, null);
    return list.map(w => html`<div class="k-reserved" key=${w.id}>
      <div class="k-reserved-ic"><${Icon} name="bell" size=${24} /></div>
      <div class="ui-grow"><strong>${WDL[w.weekday]} ist frei und für Sie reserviert.</strong>
        <div>Reserviert bis ${T.fmt.rel(w.reservedUntil)} · <${U.Countdown} to=${w.reservedUntil} /></div></div>
      <${Btn} variant="sun" icon="check" onClick=${() => bookNow(cust, w)}>Jetzt buchen<//></div>`);
  }

  /* ---------- Nächste Lieferungen ---------- */
  function Upcoming({ s, cid }) {
    const list = sel().upcoming(s, cid, 6);
    if (!list.length) return html`<${Empty} icon="calendar" title="Keine Lieferung geplant" text="Stellen Sie einen Lieferplan zusammen." action=${html`<${Btn} variant="sun" onClick=${goPlan}>Lieferplan öffnen<//>`} />`;
    return html`<ul class="k-ups">${list.map(u => {
      const flexOnly = u.kinds.length === 1 && u.kinds[0] === 'flex';
      const fo = flexOnly ? s.flexOrders.find(f => f.customerId === cid && f.dateKey === u.dateKey && f.status === 'confirmed') : null;
      const dv = u.delivery;
      let status;
      if (dv) status = dv.status === 'delivered' ? html`<${Pill} tone="ok" icon="check">Zugestellt ${T.fmt.hm(dv.at)} Uhr<//>` : html`<${Pill} tone="full" icon="alert">Problem: ${dv.reason || 'Zustellung nicht möglich'}<//>`;
      else if (u.skipped) status = html`<${Pill} tone="neutral">ausgesetzt<//>`;
      else if (u.paused) status = html`<${Pill} tone="info" icon="pause">Urlaubspause<//>`;
      else status = html`<${Pill} tone="ok">geplant · bis ${T.fmt.hm(T.deadlineMin(u.dateKey))} Uhr<//>`;
      const off = u.skipped || u.paused;
      return html`<li class=${cx('k-up', off && 'is-off')} key=${u.dateKey}>
        <div class="k-up-d"><span class="k-up-wd">${WD[u.wd]}</span><span class="k-up-dt">${T.fmt.day(u.dateKey).replace(/^\D+/, '')}</span></div>
        <div class="k-up-m"><div class="k-up-it">${sel().itemsText(s, u.items, 3)}</div>
          <div class="k-up-st">${status}${flexOnly ? html` <${Pill} tone="kraft">einmalig<//>` : null}</div>
          ${!u.changeable && !dv ? html`<div class="ui-hint">Bestellschluss war ${T.fmt.rel(u.cutoff)}.</div>` : null}</div>
        <div class="k-up-r"><div class="k-up-p">${off ? '–' : eur(u.total + u.fee)}</div>
          ${u.changeable && !dv ? (u.skipped ? html`<${Btn} variant="ghost" onClick=${() => { act().unskipDate(cid, u.dateKey) ? toast('Wir liefern am ' + T.fmt.day(u.dateKey) + ' wieder.', 'ok') : toast('Der Bestellschluss ist vorbei.', 'warn'); }}>Doch liefern<//>`
            : flexOnly && fo ? html`<${Btn} variant="ghost" onClick=${() => { act().cancelFlex(fo.id); toast('Einmallieferung storniert.', 'info'); }}>Stornieren<//>`
              : html`<${Btn} variant="ghost" onClick=${() => { act().skipDate(cid, u.dateKey) ? toast('Ausgesetzt: ' + T.fmt.day(u.dateKey) + '. Sie zahlen für diesen Tag nichts.', 'ok') : toast('Der Bestellschluss ist vorbei.', 'warn'); }}>Aussetzen<//>`) : null}
          ${u.changeable && !dv ? html`<div class="ui-hint">bis ${T.fmt.rel(u.cutoff)}</div>` : null}</div>
      </li>`;
    })}</ul>`;
  }

  /* ---------- Urlaubspause ---------- */
  function Pause({ s, cid }) {
    const tomorrow = T.addDays(T.today(), 1);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [err, setErr] = useState('');
    const mine = s.pauses.filter(p => p.customerId === cid && p.to >= T.today()).sort((a, b) => (a.from < b.from ? -1 : 1));
    const add = e => {
      e.preventDefault();
      if (!from || !to) { setErr('Bitte wählen Sie Beginn und Ende der Pause.'); return; }
      if (from < tomorrow) { setErr('Die Pause kann frühestens morgen beginnen.'); return; }
      if (to < from) { setErr('Das Ende darf nicht vor dem Beginn liegen.'); return; }
      act().setPause(cid, from, to); setFrom(''); setTo(''); setErr('');
      toast('Pause eingetragen: ' + T.fmt.day(from) + ' bis ' + T.fmt.day(to), 'ok');
    };
    return html`<div class="ui-stack" style="--gap:12px">
      <p class="ui-muted" style="margin:0">In dieser Zeit liefern wir nicht, Ihr Platz bleibt Ihnen.</p>
      <form class="k-pause" onSubmit=${add} noValidate>
        <${Field} id="pause-from" label="Von" type="date" min=${tomorrow} value=${from} onInput=${e => { setFrom(e.target.value); setErr(''); }} />
        <${Field} id="pause-to" label="Bis einschließlich" type="date" min=${from || tomorrow} value=${to} onInput=${e => { setTo(e.target.value); setErr(''); }} />
        <${Btn} type="submit" variant="primary" icon="pause">Pause eintragen<//>
      </form>
      ${err ? html`<div class="ui-error-text" role="alert"><${Icon} name="alert" size=${16} /><span>${err}</span></div>` : null}
      ${mine.length ? html`<ul class="k-list">${mine.map(p => html`<li key=${p.id}><${Icon} name="pause" size=${18} /><span class="ui-grow">${T.fmt.day(p.from)} bis ${T.fmt.day(p.to)}</span>
        <${Btn} size="sm" variant="quiet" onClick=${() => { act().clearPause(p.id); toast('Pause beendet.', 'info'); }}>Beenden<//></li>`)}</ul>` : null}
    </div>`;
  }

  /* ---------- Warteliste ---------- */
  function WaitlistBox({ s, cust }) {
    const now = T.now().getTime();
    const mine = s.waitlist.filter(w => w.customerId === cust.id && (w.status === 'waiting' || w.status === 'notified'));
    if (!mine.length) return html`<p class="ui-muted" style="margin:0">Sie stehen auf keiner Warteliste.</p>`;
    return html`<ul class="k-list k-list-lg">${mine.map(w => {
      const res = w.status === 'notified' && w.reservedUntil && new Date(w.reservedUntil).getTime() > now;
      const pos = w.weekday != null ? sel().waitPosition(s, cust.id, w.regionId, w.weekday) : null;
      const rg = sel().region(s, w.regionId);
      return html`<li key=${w.id}><${Icon} name=${res ? 'bell' : 'clock'} size=${20} />
        <span class="ui-grow"><strong>${w.weekday != null ? WDL[w.weekday] : 'Gebiets-Vormerkung'}</strong>
          <span class="ui-hint" style="display:block">${res ? 'Frei – reserviert bis ' + T.fmt.rel(w.reservedUntil) : (pos ? 'Platz ' + pos + ' auf der Warteliste' : 'vorgemerkt') + (rg ? ' · ' + rg.name : '') + ' · ' + (w.channel === 'push' ? 'Push' : 'E-Mail')}</span></span>
        ${res ? html`<${Btn} variant="sun" onClick=${() => bookNow(cust, w)}>Jetzt buchen<//>`
          : html`<${Btn} size="sm" variant="quiet" onClick=${() => { act().leaveWaitlist(w.id); toast('Von der Warteliste gestrichen.', 'info'); }}>Streichen<//>`}</li>`;
    })}</ul>`;
  }

  /* ---------- Wochenplan ---------- */
  function PlanDay({ s, cust, p, onAdd, onRemove }) {
    const bag = sel().priceBag(s, p.items, { wd: p.wd });
    const disc = bag.discounts.reduce((a, x) => a + x.amount, 0);
    const fee = sel().feeFor(s, { mode: 'abo', wd: p.wd, regionId: cust.regionId, customerId: cust.id, total: bag.total });
    return html`<section class="k-sack k-sack-plain" aria-label=${WDL[p.wd]}>
      <header class="k-sack-head"><div class="k-sack-ic"><${Icon} name="bag" size=${22} /></div>
        <div class="ui-grow"><h3>${WDL[p.wd]}</h3><div class="k-sack-sub">bis ${T.fmt.hm(T.deadlineMin(T.nextDateForWeekday(p.wd)))} Uhr · ${eur(bag.total + fee)} je Lieferung</div></div>
        <${Btn} variant="quiet" size="sm" icon="trash" onClick=${onRemove}>Tag entfernen<//></header>
      <ul class="k-lines">${bag.lines.map(l => html`<li class="k-line" key=${l.product.id}>
        <div class="k-line-ph"><${Photo} id=${l.product.id} alt=${l.product.name} ratio="1/1" /></div>
        <div class="k-line-main"><div class="k-line-name">${l.product.name}</div><div class="k-line-sub">${eur(l.product.price)}</div>
          <${Stepper} size="sm" value=${l.qty} label=${l.product.name + ' am ' + WDL[p.wd]} onChange=${n => { act().setSubQty(cust.id, p.wd, l.product.id, n); if (n === 0 && bag.lines.length === 1) toast(WDL[p.wd] + ' aus dem Wochenplan entfernt.', 'info'); }} /></div>
        <div class="k-line-sum">${eur(l.sum)}</div></li>`)}
        ${bag.discounts.map(x => html`<li class="k-line k-line-disc" key=${x.offerId}><div class="k-line-ph"><${Icon} name="gift" size=${22} /></div>
          <div class="k-line-main"><div class="k-line-name">${x.title}</div><div class="k-line-sub">Aktion</div></div><div class="k-line-sum">− ${eur(x.amount)}</div></li>`)}
      </ul>
      <div class="k-sack-actions"><${Btn} variant="ghost" size="sm" icon="plus" onClick=${onAdd}>Artikel hinzufügen<//>
        <span class="ui-hint">${disc > 0 ? 'Ersparnis durch Aktionen: ' + eur(disc) : ''}</span></div>
    </section>`;
  }

  function WeeklyPlan({ s, cust }) {
    const [add, setAdd] = useState(null);       // wd
    const [rem, setRem] = useState(null);
    const [wl, setWl] = useState(null);
    const plan = sel().weeklyPlan(s, cust.id);
    const have = plan.map(p => p.wd);
    const Sheets = shared();
    const addItems = add != null ? ((s.subs.find(x => x.customerId === cust.id && x.weekday === add) || {}).items || {}) : {};
    const addDay = wd => {
      const eff = sel().dayStatusFor(s, cust.regionId, wd, cust.id);
      if (eff === 'full') { setWl(wd); return; }
      if (eff === 'closed' || eff === 'planned') return;
      act().draftCheckPlz(cust.plz); Sheets.bookDay(wd); goPlan();
    };
    return html`<div class="ui-stack" style="--gap:16px">
      <p class="ui-muted" style="margin:0">Änderungen gelten ab der nächsten Lieferung.</p>
      ${plan.length ? plan.map(p => html`<${PlanDay} key=${p.wd} s=${s} cust=${cust} p=${p} onAdd=${() => setAdd(p.wd)} onRemove=${() => setRem(p.wd)} />`)
        : html`<${Empty} icon="bag" title="Noch kein Wochenplan" text="Wählen Sie Liefertage im Lieferplan." action=${html`<${Btn} variant="sun" onClick=${goPlan}>Lieferplan öffnen<//>`} />`}
      <div><h3 class="k-h3">Tag hinzufügen</h3>
        <div class="k-addday">${[0, 1, 2, 3, 4, 5, 6].filter(wd => !have.includes(wd)).map(wd => {
          const eff = sel().dayStatusFor(s, cust.regionId, wd, cust.id);
          return html`<button type="button" key=${wd} class=${cx('k-addday-b', 'is-' + eff)} disabled=${eff === 'closed' || eff === 'planned'} onClick=${() => addDay(wd)}>
            <strong>${WD[wd]}</strong><span>${C.labels.effective[eff]}</span></button>`;
        })}</div></div>
      <${Sheets.ProductSheet} open=${add != null} onClose=${() => setAdd(null)} s=${s} items=${addItems} wd=${add} title=${add != null ? 'Artikel für ' + WDL[add] : ''}
        onQty=${(id, n) => act().setSubQty(cust.id, add, id, n)} />
      <${ConfirmSheet} open=${rem != null} onClose=${() => setRem(null)} title=${rem != null ? WDL[rem] + ' aus dem Wochenplan entfernen?' : ''}
        text="Wir liefern an diesem Wochentag künftig nicht mehr. Ihr Platz wird für andere frei." confirmLabel="Tag entfernen" danger
        onConfirm=${() => { act().removeSubDay(cust.id, rem); toast(WDL[rem] + ' entfernt.', 'info'); setRem(null); }} />
      <${Sheets.WaitlistSheet} open=${wl != null} onClose=${() => setWl(null)} s=${s} wd=${wl} regionId=${cust.regionId} />
    </div>`;
  }

  /* ---------- Nachrichten ---------- */
  function Inbox({ s, cust }) {
    const list = sel().inbox(s, cust.id);
    const unread = list.filter(n => !n.read).length;
    if (!list.length) return html`<${Empty} icon="bell" title="Keine Nachrichten" text="Bestätigungen und Zustellmeldungen erscheinen hier." />`;
    return html`<div class="ui-stack" style="--gap:12px">
      ${unread ? html`<div><${Btn} variant="ghost" icon="check" onClick=${() => act().markRead('all', cust.id)}>Alle als gelesen markieren (${unread})<//></div>` : null}
      <ul class="k-msgs">${list.map(n => html`<li key=${n.id} class=${cx('k-msg', !n.read && 'is-unread')}>
        <span class="k-msg-ic"><${Icon} name=${n.channel === 'email' ? 'mail' : 'bell'} size=${20} /></span>
        <div class="ui-grow"><div class="k-msg-h"><strong>${n.title}</strong>${!n.read ? html`<span class="k-msg-dot" aria-label="ungelesen"></span>` : null}</div>
          <div class="k-msg-b">${n.body}</div>
          <div class="k-msg-f"><span class="ui-mono">${T.fmt.rel(n.createdAt)} · ${n.channel === 'email' ? 'E-Mail' : 'Push'}</span>
            ${n.action && n.action.view ? html`<${Btn} variant="ghost" onClick=${() => { act().markRead(n.id, cust.id); act().setUi({ customerView: n.action.view }); if (root.scrollTo) root.scrollTo(0, 0); }}>Öffnen<//>` : null}
            ${!n.read ? html`<${Btn} size="sm" variant="quiet" onClick=${() => act().markRead(n.id, cust.id)}>Gelesen<//>` : null}</div></div>
      </li>`)}</ul></div>`;
  }

  /* ---------- Einstellungen ---------- */
  function Settings({ s, cust }) {
    const Sh = shared();
    const [note, setNote] = useState(cust.note || '');
    const plan = sel().weeklyPlan(s, cust.id);
    const perWeek = Math.round(plan.reduce((a, p) => a + p.total + sel().feeFor(s, { mode: 'abo', wd: p.wd, regionId: cust.regionId, customerId: cust.id, total: p.total }), 0) * 100) / 100;
    const now = T.now();
    const invoices = [1, 2, 3].map(i => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const amount = Math.round(perWeek * (i === 3 ? 4 : 4.3) * 100) / 100;
      return { no: 'R-' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + (400 + cust.id.length * 7 + i), label: MONTHS[d.getMonth()] + ' ' + d.getFullYear(), amount };
    });
    const code = (cust.name.split(' ')[0] || 'Freund').toUpperCase().replace(/[^A-ZÄÖÜ]/g, '') + '-' + (cust.plz || '5303');
    return html`<div class="k-settings">
      <section class="k-card"><h3 class="k-h3">Ablageort</h3>
        <${Sh.PlacementCards} idp="konto-pl" value=${cust.placement} onChange=${v => { act().updateCustomer(cust.id, { placement: v }); toast('Ablageort gespeichert.', 'ok'); }} />
        <div class="k-lnote-row"><${Field} id="konto-note" as="textarea" rows="2" label="Hinweis für die Zustellung" value=${note} onInput=${e => setNote(e.target.value)} placeholder="z. B. Hinterhof, grünes Tor" />
          <${Btn} variant="ghost" size="sm" disabled=${note === (cust.note || '')} onClick=${() => { act().updateCustomer(cust.id, { note }); toast('Hinweis gespeichert.', 'ok'); }}>Hinweis speichern<//></div></section>

      <section class="k-card"><h3 class="k-h3">Benachrichtigungen</h3>
        <div class="k-toggles">
          <${Toggle} id="konto-n-push" label="Push-Nachricht" hint="„Ihr Frühstück ist da“, Wartelisten-Meldungen" checked=${cust.notify.push} onChange=${v => act().updateCustomer(cust.id, { notify: { push: v } })} />
          <${Toggle} id="konto-n-mail" label="E-Mail" hint="Bestätigungen und Rechnungen" checked=${cust.notify.email} onChange=${v => act().updateCustomer(cust.id, { notify: { email: v } })} />
        </div>
        <p class="ui-hint" style="margin:10px 0 0">Lieferadresse: ${cust.street} ${cust.houseNo}, ${cust.plz} ${cust.city}</p></section>

      <section class="k-card"><h3 class="k-h3">Zahlung und Rechnungen</h3>
        <div class="k-pay-now"><${Icon} name="euro" size=${22} /><div><strong>SEPA-Lastschrift</strong><div class="ui-hint">AT61 •••• •••• •••• 3201 · monatlich im Nachhinein</div></div></div>
        <div class="ui-tablewrap" style="margin-top:12px"><table class="ui-table"><thead><tr><th>Rechnung</th><th>Zeitraum</th><th class="num">Betrag</th></tr></thead>
          <tbody>${invoices.map(r => html`<tr key=${r.no}><td class="ui-mono">${r.no}</td><td>${r.label}</td><td class="num">${eur(r.amount)}</td></tr>`)}</tbody></table></div>
        <p class="ui-hint" style="margin:8px 0 0">Beispielzeilen der Demo.</p></section>

      <section class="k-card k-refer"><h3 class="k-h3">Nachbarn werben</h3>
        <p style="margin:0 0 10px">Sie und Ihre Nachbarn erhalten je ${eur(C.promo.referralCredit)} Guthaben.</p>
        <div class="k-code" aria-label="Ihr Empfehlungscode"><span class="ui-eyebrow">Ihr Code</span><strong>${code}</strong></div></section>
    </div>`;
  }

  /* ---------- Ansicht ---------- */
  function Konto() {
    const s = App.useStore();
    const cid = s.session.customerId, cust = sel().customer(s, cid);
    const [tab, setTab] = useState('start');
    if (!cust || !cust.registered) {
      return html`<div class="k-konto"><h1 class="k-h1">Ihr Konto</h1>
        <${Switcher} cid=${cid} />
        <${Empty} icon="user" title="Noch kein Konto" text="Nach Ihrer ersten Bestellung verwalten Sie hier Ihre Lieferungen."
          action=${html`<div class="ui-stack" style="--gap:10px;align-items:stretch"><${Btn} variant="sun" icon="bag" onClick=${goPlan}>Lieferplan zusammenstellen<//>
            <${Btn} variant="ghost" icon="user" onClick=${() => act().switchCustomer('c-huber')}>Demo: Bestandskundin Maria Huber ansehen<//></div>`} />
      </div>`;
    }
    const unread = sel().unreadPush ? s.notifications.filter(n => n.customerId === cid && !n.read).length : 0;
    const tabs = [{ id: 'start', label: 'Lieferungen' }, { id: 'plan', label: 'Wochenplan' }, { id: 'post', label: 'Nachrichten', badge: unread || undefined }, { id: 'einst', label: 'Einstellungen' }];
    let body;
    if (tab === 'plan') body = html`<${WeeklyPlan} s=${s} cust=${cust} />`;
    else if (tab === 'post') body = html`<${Inbox} s=${s} cust=${cust} />`;
    else if (tab === 'einst') body = html`<${Settings} s=${s} cust=${cust} />`;
    else body = html`<div class="k-konto-grid">
      <section class="k-card k-card-main"><h3 class="k-h3">Nächste Lieferungen</h3><${Upcoming} s=${s} cid=${cid} /></section>
      <div class="ui-stack" style="--gap:16px">
        <section class="k-card"><h3 class="k-h3">Urlaubspause</h3><${Pause} s=${s} cid=${cid} /></section>
        <section class="k-card"><h3 class="k-h3">Warteliste</h3><${WaitlistBox} s=${s} cust=${cust} /></section>
      </div></div>`;
    return html`<div class="k-konto">
      <header class="k-konto-head"><div><div class="ui-eyebrow">Konto</div><h1 class="k-h1">${cust.name}</h1>
        <div class="ui-muted">${cust.street} ${cust.houseNo}, ${cust.plz} ${cust.city}</div></div></header>
      <${Switcher} cid=${cid} />
      <${ReservedBanner} s=${s} cust=${cust} />
      <div class="k-konto-tabs"><${Tabs} tabs=${tabs} value=${tab} onChange=${setTab} label="Kontobereiche" /></div>
      <div class="k-konto-body" role="tabpanel">${body}</div>
    </div>`;
  }

  App.views = App.views || {};
  App.views.customer = App.views.customer || {};
  App.views.customer.konto = Konto;
})(typeof window !== 'undefined' ? window : globalThis);
