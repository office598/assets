/* Kunden-App › Start (V1). Registriert App.views.customer.start.
   Sieben Abschnitte: Hero + PLZ · Ergebnis (Wochenleiste) · So funktioniert's · Diese Woche · Abo/Einmal · FAQ · Fuß. */
(function (root) {
  const App = root.App = root.App || {};
  const { html, useState, useEffect, useRef } = App.lib;
  const { Btn, Icon, Pill, Photo, Sheet, Field, Segmented, WeekStrip, Ticket, Bar, Countdown, Logo, Accordion, toast, cx } = App.ui;
  const T = App.time, C = App.config;
  App.views = App.views || {};
  App.views.customer = App.views.customer || {};
  App.nav = App.nav || {};                       // Merkzettel zwischen Start und Sortiment

  const eur = (n) => App.fmt.eur(n);
  const dayShort = (k) => T.fmt.day(k).replace(/^\S+\s/, '');
  const hm = (min) => T.fmt.hm(min);
  const sel = () => App.sel;
  const reduced = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const goView = (v) => { App.actions.setUi({ customerView: v }); if (root.scrollTo) root.scrollTo(0, 0); };
  const goSortiment = (cat) => { App.nav.sortimentCat = cat || null; goView('sortiment'); };
  const cutoffText = () => hm(C.cutoff.h * 60 + C.cutoff.m);
  const F = () => { const f = C.fees; return { abo: f.abo, aboWe: f.aboWeekend != null ? f.aboWeekend : f.abo, flex: f.flex, flexWe: f.flexWeekend != null ? f.flexWeekend : f.flex }; };
  const feePair = (a, b) => (a === b ? eur(a) : eur(a) + ' werktags · ' + eur(b) + ' am Wochenende');
  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
  const hasPhoto = (id) => !!((App.photos && App.photos[id]) || (C.photos && C.photos[id]));

  function Section({ id, eyebrow, title, lead, tone, children, class: klass }) {
    return html`<section class=${cx('k-sec', tone && 'k-sec-' + tone, klass)} id=${id} aria-labelledby=${title ? id + '-h' : undefined}>
      <div class="ui-wrap">
        ${eyebrow || title || lead ? html`<header class="k-sec-head">
          ${eyebrow ? html`<div class="ui-eyebrow">${eyebrow}</div>` : null}
          ${title ? html`<h2 id=${id + '-h'}>${title}</h2>` : null}
          ${lead ? html`<p class="ui-lead">${lead}</p>` : null}
        </header>` : null}
        ${children}
      </div>
    </section>`;
  }

  /* ---------- Wartelisten-Sheet ---------- */
  function WaitlistSheet({ s, target, onClose }) {
    const [channel, setChannel] = useState('push');
    const [email, setEmail] = useState('');
    const [err, setErr] = useState('');
    const [done, setDone] = useState(null);
    if (!target) return null;
    const region = sel().region(s, target.regionId);
    const dayName = T.WD_LONG[target.wd];
    const waiting = sel().waitlistFor(s, target.regionId, target.wd).length;
    const submit = () => {
      if (channel === 'email' && !validEmail(email)) { setErr('Bitte geben Sie eine gültige E-Mail-Adresse ein.'); return; }
      setErr('');
      const r = App.actions.joinWaitlist({
        regionId: target.regionId, weekday: target.wd, channel, customerId: s.session.customerId,
        contact: { name: '', plz: s.draft.plz || '', email: channel === 'email' ? email.trim() : '' }
      });
      setDone(r);
    };
    const footer = done
      ? html`<${Btn} variant="primary" onClick=${onClose}>Schließen<//>`
      : [html`<${Btn} key="n" variant="ghost" onClick=${onClose}>Abbrechen<//>`, html`<${Btn} key="y" variant="sun" icon="bell" onClick=${submit}>Auf die Warteliste<//>`];
    return html`<${Sheet} open=${true} onClose=${onClose} title=${done ? 'Sie stehen auf der Warteliste' : dayName + ' ist ausgebucht'} footer=${footer}>
      ${done ? html`<div class="ui-stack">
          <${Ticket} title="Warteliste" stamp="vorgemerkt" rows=${[['Gebiet', region ? region.name : '–'], ['Tag', dayName], ['Ihre Position', String(done.position || 1)], ['Benachrichtigung', channel === 'push' ? 'Push in der App' : 'E-Mail']]}
            footer=${'Sobald ein Platz frei wird, halten wir ihn ' + C.reserveHours + ' Stunden für Sie frei.'} />
          <p class="ui-muted">Die Demo zeigt Ihnen die Nachricht, wenn das Backoffice den Tag wieder freigibt (Backoffice › Kapazität).</p>
        </div>`
        : html`<div class="ui-stack">
          <p>${waiting ? waiting + (waiting === 1 ? ' Person wartet' : ' Personen warten') + ' in ' + (region ? region.name : 'Ihrem Gebiet') + ' bereits auf einen ' + dayName + '.' : 'Aktuell ist kein weiterer ' + dayName + '-Platz frei.'}${' '}Sie hören von uns, sobald ein Platz frei wird. Er ist dann ${C.reserveHours} Stunden nur für Sie reserviert.</p>
          <div class="ui-field"><span class="ui-label" id="k-wl-channel-l">Wie sollen wir Sie benachrichtigen?</span>
            <${Segmented} label="Benachrichtigung" full value=${channel} onChange=${setChannel} options=${[{ value: 'push', label: 'Push in der App', icon: 'bell' }, { value: 'email', label: 'E-Mail', icon: 'mail' }]} /></div>
          ${channel === 'email'
            ? html`<${Field} id="k-wl-email" label="E-Mail-Adresse" type="email" autocomplete="email" inputmode="email" placeholder="name@beispiel.at" value=${email} error=${err} onInput=${(e) => setEmail(e.target.value)} />`
            : html`<p class="ui-muted">Die Nachricht erscheint direkt in dieser App, auch wenn Sie sie gerade nicht geöffnet haben.</p>`}
        </div>`}
    <//>`;
  }

  /* ---------- Vormerk-Formular (PLZ außerhalb / Gebiet in Planung) ---------- */
  function PreregForm({ s, regionId, plz, idp }) {
    const [email, setEmail] = useState('');
    const [err, setErr] = useState('');
    const mine = s.waitlist.find(w => w.customerId === s.session.customerId && (w.regionId || null) === (regionId || null) && w.weekday == null && (w.status === 'waiting' || w.status === 'notified') && (regionId || (w.contact && w.contact.plz === plz)));
    if (mine) {
      return html`<div class="k-note k-note-ok" role="status"><${Icon} name="check" size=${20} /><div><strong>Sie sind vorgemerkt.</strong> Sobald wir bei Ihnen starten, melden wir uns per E-Mail an ${mine.contact && mine.contact.email ? mine.contact.email : 'Ihre Adresse'}.</div></div>`;
    }
    const submit = (e) => {
      e.preventDefault();
      if (!validEmail(email)) { setErr('Bitte geben Sie eine gültige E-Mail-Adresse ein.'); return; }
      setErr('');
      App.actions.joinWaitlist({ regionId: regionId || null, weekday: null, channel: 'email', customerId: s.session.customerId, contact: { name: '', plz, email: email.trim() } });
      toast('Vorgemerkt – wir melden uns, sobald wir bei Ihnen liefern.', 'ok');
    };
    return html`<form class="k-prereg" onSubmit=${submit} noValidate>
      <${Field} id=${idp + '-email'} label="Ihre E-Mail-Adresse" type="email" autocomplete="email" inputmode="email" placeholder="name@beispiel.at" value=${email} error=${err} onInput=${(e) => setEmail(e.target.value)} />
      <${Btn} type="submit" variant="sun" icon="bell">Vormerken<//>
    </form>`;
  }

  /* ---------- Ergebnis der PLZ-Prüfung ---------- */
  function ResultOutside({ s, plz }) {
    return html`<div class="k-result-body">
      <div class="k-result-head"><div>
        <div class="ui-eyebrow">PLZ ${plz}</div>
        <h2>Für diese PLZ liefern wir noch nicht</h2>
        <p class="ui-lead">Wir starten dort, wo genug Haushalte mitmachen. Lassen Sie sich vormerken, dann melden wir uns, sobald in ${plz} geliefert wird.</p>
      </div></div>
      <${PreregForm} s=${s} regionId=${null} plz=${plz} idp="k-outside" />
    </div>`;
  }

  function ResultPlanned({ s, region, plz }) {
    const have = sel().waitlistFor(s, region.id, null).length, need = region.neededPrereg || 25;
    return html`<div class="k-result-body">
      <div class="k-result-head"><div>
        <div class="ui-eyebrow">PLZ ${plz} · ${region.name}</div>
        <h2>${region.name} ist in Planung</h2>
        <p class="ui-lead">Sobald ${need} Haushalte vorgemerkt sind, beginnen wir mit der Belieferung. Das Vormerken kostet nichts und verpflichtet zu nichts.</p>
      </div></div>
      <div class="k-prog"><div class="k-prog-top"><strong>${have} von ${need} Haushalten vorgemerkt</strong><span class="ui-muted">noch ${Math.max(0, need - have)}</span></div>
        <${Bar} value=${have} max=${need} tone="sun" label="Vormerkungen" /></div>
      <${PreregForm} s=${s} regionId=${region.id} plz=${plz} idp="k-planned" />
    </div>`;
  }

  function ResultOpen({ s, region, plz, onWait }) {
    const cid = s.session.customerId, d = s.draft;
    const weak = sel().weakDays(s, region.id);
    const days = [0, 1, 2, 3, 4, 5, 6].map(wd => {
      const k = T.nextDateForWeekday(wd);
      const cap = sel().cap(s, region.id, wd);
      const eff = sel().dayStatusFor(s, region.id, wd, cid);
      const mine = s.waitlist.find(w => w.customerId === cid && w.regionId === region.id && w.weekday === wd && w.status === 'waiting');
      let sub;
      if (eff === 'few') sub = 'noch ' + Math.max(cap.freeAbo, 0) + ' Plätze';
      else if (eff === 'full') sub = mine ? 'Sie: Platz ' + (sel().waitPosition(s, cid, region.id, wd) || 1) : 'Warteliste';
      return {
        wd, dateLabel: dayShort(k), effective: eff, sub, cap, k,
        promo: eff === 'free' && weak.includes(wd) ? 'Aktion' : undefined,
        selected: d.mode !== 'flex' && !!d.abo[wd]
      };
    });
    const freeN = days.filter(x => x.effective === 'free').length;
    const few = days.filter(x => x.effective === 'few');
    const full = days.filter(x => x.effective === 'full');
    const parts = [];
    if (freeN) parts.push(freeN + (freeN === 1 ? ' Tag frei' : ' Tage frei'));
    few.forEach(x => parts.push(T.WD_LONG[x.wd] + ': nur noch ' + Math.max(x.cap.freeAbo, 0) + ' Plätze'));
    full.forEach(x => parts.push(T.WD_LONG[x.wd] + ' ausgebucht'));
    const pick = (day) => {
      if (day.effective === 'full') { onWait({ wd: day.wd, regionId: region.id }); return; }
      if (day.effective === 'booked' || day.effective === 'closed') return;
      if (d.mode === 'flex') App.actions.setDraft({ mode: 'abo' });
      App.actions.draftToggleDay(day.wd);
    };
    const plan = () => { App.actions.setDraft({ mode: 'abo' }); goView('lieferplan'); };
    const once = () => { App.actions.setDraft({ mode: 'flex' }); goView('lieferplan'); };
    const hasPromo = days.some(x => x.promo);
    return html`<div class="k-result-body">
      <div class="k-result-head">
        <h2>Ihre Liefertage in ${region.name}</h2>
        <p class="k-summary">${parts.join(' · ')}</p>
      </div>
      <${WeekStrip} days=${days} onPick=${pick} label=${'Liefertage in ' + region.name} />
      <p class="k-strip-hint">Tippen Sie auf Ihre Liefertage.${hasPromo ? ' „Aktion“: Neukunden zahlen an diesem Tag ' + C.promo.weakDayFreeWeeks + ' Wochen lang keine Zustellgebühr.' : ''}
        ${full.length ? html`<span> ${full.map(x => html`<button type="button" class="k-linkbtn" key=${x.wd} onClick=${() => onWait({ wd: x.wd, regionId: region.id })}>${T.WD_LONG[x.wd]}: auf die Warteliste</button>`)}</span>` : null}</p>
      <div class="k-cta">
        <${Btn} variant="sun" size="lg" icon="bag" onClick=${plan}>Lieferplan zusammenstellen<//>
        <${Btn} variant="quiet" size="lg" onClick=${once}>Nur einmal bestellen<//>
      </div>
    </div>`;
  }

  /* ---------- Hero ---------- */
  const DEMOS = [
    { plz: '5303', label: '5303 Thalgau', note: 'Montag ausgebucht' },
    { plz: '5310', label: '5310 Mondsee', note: 'alles frei' },
    { plz: '5330', label: '5330 Fuschl', note: 'Gebiet in Planung' }
  ];

  function Hero({ plz, setPlz, err, onCheck, inputRef }) {
    const next = T.nextDates(1)[0];
    const cut = T.cutoffFor(next);
    const submit = (e) => { e.preventDefault(); onCheck(plz); };
    return html`<section class="k-hero" aria-labelledby="k-h1">
      <div class="ui-wrap k-hero-in">
        <div class="k-hero-media">
          <${Photo} id="hero" alt="Papiersackerl mit frischem Gebäck an einer Türschnalle" ratio="16/10" />
          <div class="k-hero-ticket"><${Ticket} title="Lieferzettel" rows=${[['Lieferung', T.fmt.day(next)], ['Sackerl da', 'bis ' + hm(T.deadlineMin(next))]]}
            footer=${html`<span>Bestellschluss <${Countdown} to=${cut} /></span>`} /></div>
        </div>
        <div class="k-hero-text">
          <div class="ui-eyebrow">Werktags bis ${hm(C.deadlineMin.weekday)} · am Wochenende bis ${hm(C.deadlineMin.weekend)}</div>
          <h1 id="k-h1">${C.brand.claim}</h1>
          <p class="ui-lead">Gebäck vom Partnerbäcker als Sackerl an Ihrer Türschnalle, ohne Klingeln.</p>
          <form class="k-plz" onSubmit=${submit} noValidate>
            <label class="k-plz-label" for="k-plz">Ihre Postleitzahl</label>
            <div class="k-plz-row">
              <input id="k-plz" ref=${inputRef} class="ui-input k-plz-input" inputmode="numeric" autocomplete="postal-code" maxlength="4" placeholder="z. B. 5303"
                value=${plz} aria-invalid=${err ? 'true' : undefined} aria-describedby=${err ? 'k-plz-err' : undefined} onInput=${(e) => setPlz(e.target.value.replace(/\D/g, '').slice(0, 4))} />
              <${Btn} type="submit" variant="sun" size="lg" iconAfter="chevron-right">Liefertage prüfen<//>
            </div>
            ${err ? html`<div class="k-plz-err" id="k-plz-err" role="alert"><${Icon} name="alert" size=${16} />${err}</div>` : null}
          </form>
          <div class="k-demo" role="group" aria-label="Demo-Beispiele für Postleitzahlen">
            <span class="k-demo-label">Demo-Beispiele</span>
            ${DEMOS.map(x => html`<button type="button" class="k-demochip" key=${x.plz} onClick=${() => onCheck(x.plz)}><strong>${x.label}</strong><span>${x.note}</span></button>`)}
          </div>
          <p class="k-trust"><${Icon} name="check" size=${18} />Keine Bindung · jederzeit pausieren · bis ${hm(C.deadlineMin.weekday)} an der Tür</p>
        </div>
      </div>
    </section>`;
  }

  /* ---------- So funktioniert's ---------- */
  function HowItWorks() {
    const steps = [
      { t: 'bis ' + cutoffText(), h: 'Bestellen', p: 'Am Vortag, Sa bis Mo schon am Freitag.' },
      { t: 'ab ' + hm(C.tour.startMin.weekday), h: 'Frisch vom Bäcker', p: 'Wir holen und packen Ihr Sackerl.' },
      { t: 'bis ' + hm(C.deadlineMin.weekday), h: 'An Ihrer Tür', p: 'Am Wochenende bis ' + hm(C.deadlineMin.weekend) + ', ohne Klingeln.' }
    ];
    return html`<${Section} id="k-ablauf" title="So funktioniert’s">
      <ol class="k-steps">
        ${steps.map((st, i) => html`<li class="k-step" key=${i}><span class="k-step-time">${st.t}</span><h3>${st.h}</h3><p>${st.p}</p></li>`)}
      </ol>
    <//>`;
  }

  /* ---------- Diese Woche ---------- */
  function ThisWeek({ s }) {
    const ws = s.weeklySpecial;
    const p = ws && sel().product(s, ws.productId);
    const special = p && p.active !== false ? p : null;
    const se = C.season;
    const sp = se && T.isOpenFor(se.dateKey) ? sel().product(s, se.productId) : null;
    const season = sp && sp.active !== false ? sp : null;
    if (!special && !season) return null;
    const addSpecial = () => {
      if (App.nav.addToTarget && App.nav.addToTarget(special.id, 1)) toast(special.name + ' liegt im Sackerl.', 'ok');
      else { App.nav.pendingAdd = { pid: special.id, n: 1 }; goSortiment('empfohlen'); }
    };
    const preorder = () => {
      const flex = Object.assign({}, s.draft.flex); flex[season.id] = Math.max(1, flex[season.id] || 0);
      App.actions.setDraft({ mode: 'flex', flexDate: se.dateKey, flex, target: { type: 'flex' } });
      goView('lieferplan');
    };
    const pct = ws && ws.pct > 0 ? ws.pct : 0;
    return html`<${Section} id="k-woche" title="Diese Woche" tone="soft">
      <div class="k-week">
        ${special ? html`<article class="k-wcard">
          <div class="k-wcard-photo"><${Photo} id=${special.id} alt=${special.name} ratio="4/3" /></div>
          <div class="k-wcard-body">
            <div class="ui-eyebrow">${ws.title || 'Brot der Woche'}</div>
            <h3>${special.name}</h3>
            <p>${ws.text || special.desc}</p>
            <p class="k-wcard-price"><strong class="ui-num">${eur(Math.round(special.price * (100 - pct)) / 100)}</strong>${pct ? html` <s class="ui-muted ui-num">${eur(special.price)}</s>` : null}${special.unit ? html` <span class="ui-muted">· ${special.unit}</span>` : null}</p>
            <${Btn} variant="sun" icon="bag" onClick=${addSpecial}>Zum Sackerl<//>
          </div>
        </article>` : null}
        ${season ? html`<article class="k-wcard">
          <div class="k-wcard-photo"><${Photo} id=${season.id} alt=${season.name} ratio="4/3" /></div>
          <div class="k-wcard-body">
            <div class="ui-eyebrow">Saison · ${T.fmt.dayLong(se.dateKey)}</div>
            <h3>${se.title}</h3>
            <p>${season.desc}</p>
            <p class="k-wcard-price"><strong class="ui-num">${eur(season.price)}</strong> <span class="ui-muted">· bestellbar bis ${T.fmt.rel(T.cutoffFor(se.dateKey))}</span></p>
            <${Btn} variant="sun" icon="gift" onClick=${preorder}>Vorbestellen<//>
          </div>
        </article>` : null}
      </div>
      <p class="k-week-link"><${Btn} variant="ghost" iconAfter="chevron-right" onClick=${() => goSortiment(null)}>Ganzes Sortiment ansehen<//></p>
    <//>`;
  }

  /* ---------- Abo / Einmalig ---------- */
  function Modes() {
    const f = F(), save = Math.round((f.flex - f.abo) * 100) / 100;
    const choose = (mode) => { App.actions.setDraft({ mode }); goView('lieferplan'); };
    return html`<${Section} id="k-modi" title="Regelmäßig oder nur einmal">
      <div class="k-modes">
        <article class="k-mode k-mode-rec">
          <div class="k-mode-top"><h3>Abo</h3><${Pill} tone="sun" icon="star">Empfohlen<//></div>
          <p class="k-mode-price"><strong>${eur(f.abo)}</strong> werktags${f.aboWe !== f.abo ? html` · <strong>${eur(f.aboWe)}</strong> am Wochenende` : ''} je Lieferung</p>
          <p class="k-mode-save">${eur(save)} günstiger je Lieferung als einmalig, dazu ein fester Platz auf der Tour.</p>
          <${Btn} variant="sun" size="lg" icon="calendar" onClick=${() => choose('abo')}>Abo zusammenstellen<//>
        </article>
        <article class="k-mode">
          <div class="k-mode-top"><h3>Einmalig</h3></div>
          <p class="k-mode-price"><strong>${eur(f.flex)}</strong> werktags${f.flexWe !== f.flex ? html` · <strong>${eur(f.flexWe)}</strong> am Wochenende` : ''} je Lieferung</p>
          <p class="k-mode-save">Ab ${eur(C.fees.flexMinOrder)} Bestellwert, solange am Wunschtag ein Platz frei ist.</p>
          <${Btn} variant="ghost" size="lg" icon="bag" onClick=${() => choose('flex')}>Einmal bestellen<//>
        </article>
      </div>
    <//>`;
  }

  /* ---------- FAQ ---------- */
  function Faq() {
    const items = [
      { id: 'cut', title: 'Bis wann muss ich bestellen?', body: 'Bis ' + cutoffText() + ' am Vortag. Für Samstag, Sonntag und Montag gilt der Freitag davor.' },
      { id: 'urlaub', title: 'Was passiert im Urlaub?', body: 'Sie setzen einzelne Lieferungen aus oder tragen eine Urlaubspause ein, jeweils bis zum Bestellschluss. Pausierte Lieferungen kosten nichts.' },
      { id: 'montag', title: 'Was, wenn der Montag ausgebucht ist?', body: 'Dann kommen Sie auf die Warteliste. Wird ein Platz frei, halten wir ihn ' + C.reserveHours + ' Stunden für Sie frei.' },
      { id: 'spaet', title: 'Was, wenn das Sackerl zu spät kommt?', body: 'Kommt es später als ' + hm(C.deadlineMin.weekday) + ' Uhr (Sa und So ' + hm(C.deadlineMin.weekend) + ' Uhr), geht die Zustellung auf uns.' },
      { id: 'ablage', title: 'Wohin kommt das Sackerl, und wie bezahle ich?', body: 'An die Türschnalle, vor die Wohnungstür oder in die Zeitungsbox. Bezahlt wird per SEPA-Lastschrift oder Karte, in dieser Demo wird nichts abgebucht.' }
    ];
    return html`<${Section} id="k-faq" title="Häufige Fragen"><div class="k-faq"><${Accordion} items=${items} /></div><//>`;
  }

  /* ---------- Fuß mit kleinen Sheets ---------- */
  function codeFor(id) {
    let h = 5381;
    for (let i = 0; i < String(id).length; i++) h = ((h * 33) ^ String(id).charCodeAt(i)) >>> 0;
    return 'ENGEL-' + h.toString(36).toUpperCase().slice(0, 4).padEnd(4, 'X');
  }

  function InfoSheet({ s, kind, onClose }) {
    if (!kind) return null;
    if (kind === 'credits') {
      const list = App.photoCredits || [];
      return html`<${Sheet} open=${true} onClose=${onClose} title="Bildnachweise">
        ${list.length ? html`<ul class="k-credits">${list.map((c, i) => html`<li key=${i}>
          <strong>${c.title || c.id || 'Foto'}</strong>
          <span>${[c.author ? 'Von ' + c.author : null, c.license || c.licence].filter(Boolean).join(' · ')}</span>
          ${c.source ? html`<span class="k-credit-src">Quelle: ${c.source}</span>` : null}</li>`)}</ul>`
          : html`<p>Solange keine Fotos hinterlegt sind, zeigt die Demo Illustrationen. Fotos werden hier mit Titel, Urheber, Lizenz und Quelle genannt.</p>`}
      <//>`;
    }
    if (kind === 'buero' || kind === 'geschenk') {
      const p = sel().product(s, kind === 'buero' ? 'box-buero' : 'box-sonntag');
      const office = kind === 'buero';
      return html`<${Sheet} open=${true} onClose=${onClose} title=${office ? 'Büro-Frühstück' : 'Frühstück verschenken'}
        footer=${html`<${Btn} variant="sun" onClick=${() => { onClose(); goSortiment('boxen'); }}>Frühstücks-Sackerl ansehen<//>`}>
        <div class="ui-stack">
          ${p && hasPhoto(p.id) ? html`<${Photo} id=${p.id} alt=${p.name} ratio="3/2" />` : null}
          <p>${office ? 'Gebäck, Aufstriche und Getränke für das Team' : 'Ein Frühstück an der Tür von Eltern, Freunden oder zum Geburtstag'}${p ? ': ' + p.name + ' ab ' + eur(p.price) + '.' : '.'}</p>
          <p class="ui-muted">${office ? 'Als Einmallieferung zum Meeting oder regelmäßig am Montag.' : 'Wählen Sie die Einmallieferung und geben Sie bei der Bestellung die Adresse der Beschenkten an.'}</p>
        </div>
      <//>`;
    }
    const code = codeFor(s.session.customerId), credit = C.promo.referralCredit;
    const copy = () => {
      let ok = false;
      try { if (root.navigator && root.navigator.clipboard) { root.navigator.clipboard.writeText(code); ok = true; } } catch (e) { ok = false; }
      toast(ok ? 'Code ' + code + ' kopiert.' : 'Ihr Code: ' + code, 'ok');
    };
    return html`<${Sheet} open=${true} onClose=${onClose} title="Nachbarn werben">
      <div class="ui-stack">
        <p>Wer einen Haushalt wirbt, bekommt ${eur(credit)} Guthaben, die Geworbenen ebenfalls. Es wird mit der nächsten Rechnung verrechnet.</p>
        <${Ticket} title="Ihr Empfehlungscode" rows=${[['Code', code], ['Guthaben', eur(credit) + ' für beide']]} footer=${html`<${Btn} variant="primary" size="sm" icon="send" onClick=${copy}>Code kopieren<//>`} />
      </div>
    <//>`;
  }

  function Foot({ onInfo }) {
    return html`<footer class="k-foot"><div class="ui-wrap k-foot-in">
      <div class="k-foot-brand"><${Logo} size=${24} />
        <p>Unser Gebäck backt die Backstube Kornfeld, Partnerbäckerei seit 1928 (Beispielname). Butter, Marmelade und Co. kommen vom Hofladen.</p></div>
      <nav class="k-foot-links" aria-label="Weitere Angebote">
        <button type="button" onClick=${() => onInfo('buero')}>Büro-Frühstück</button>
        <button type="button" onClick=${() => onInfo('geschenk')}>Frühstück verschenken</button>
        <button type="button" onClick=${() => onInfo('werben')}>Nachbarn werben</button>
        <button type="button" onClick=${() => onInfo('credits')}>Bildnachweise</button>
      </nav>
      <p class="k-foot-note"><strong>Demo mit Beispieldaten.</strong> Alle Namen, Adressen, Preise und Zahlen sind erfunden. Es wird nichts bestellt oder abgebucht.</p>
    </div></footer>`;
  }

  /* ---------- Seite ---------- */
  function Start() {
    const s = App.useStore();
    const [plz, setPlz] = useState(s.draft.plz || '');
    const [err, setErr] = useState('');
    const [wait, setWait] = useState(null);
    const [info, setInfo] = useState(null);
    const inputRef = useRef(null);
    const resultRef = useRef(null);
    const scrollNext = useRef(false);

    const check = (value) => {
      const p = String(value || '').trim();
      setPlz(p);
      if (!/^\d{4}$/.test(p)) { setErr('Bitte geben Sie eine vierstellige Postleitzahl ein, zum Beispiel 5303.'); return; }
      setErr('');
      App.actions.draftCheckPlz(p);
      scrollNext.current = true;
    };
    useEffect(() => {
      if (!scrollNext.current) return;
      scrollNext.current = false;
      const el = resultRef.current;
      if (el && el.scrollIntoView) setTimeout(() => el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }), 60);
    }, [s.draft.plz]);

    const r = sel().regionForPlz(s, s.draft.plz);
    let result = null;
    if (r) {
      if (r.outside) result = html`<${ResultOutside} s=${s} plz=${s.draft.plz} />`;
      else if (r.region.planned) result = html`<${ResultPlanned} s=${s} region=${r.region} plz=${s.draft.plz} />`;
      else result = html`<${ResultOpen} s=${s} region=${r.region} plz=${s.draft.plz} onWait=${setWait} />`;
    }

    return html`<div class="k-start">
      <${Hero} plz=${plz} setPlz=${setPlz} err=${err} onCheck=${check} inputRef=${inputRef} />
      <div class="ui-wrap k-result-wrap" ref=${resultRef} aria-live="polite">
        ${result ? html`<section class="k-result" key=${s.draft.plz} aria-label="Ergebnis der Postleitzahl-Prüfung">${result}</section>` : null}
      </div>
      <${HowItWorks} />
      <${ThisWeek} s=${s} />
      <${Modes} />
      <${Faq} />
      <${Foot} onInfo=${setInfo} />
      ${wait ? html`<${WaitlistSheet} s=${s} target=${wait} onClose=${() => setWait(null)} />` : null}
      <${InfoSheet} s=${s} kind=${info} onClose=${() => setInfo(null)} />
    </div>`;
  }
  Start.fullBleed = true;
  App.views.customer.start = Start;
})(typeof window !== 'undefined' ? window : globalThis);
