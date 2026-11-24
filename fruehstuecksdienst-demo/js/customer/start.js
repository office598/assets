/* Kunden-App › Start (V1). Registriert App.views.customer.start.
   Aufbau: Hero + PLZ-Prüfung · Ergebnis (Wochenleiste) · Schnellstart-Sackerl · So funktioniert's · Abo/Einmalig ·
   Aktionen + Sortiment · Saison · Partner · Nachbarn werben · Büro/Geschenk · Pünktlich-Versprechen · FAQ · Fuß. */
(function (root) {
  const App = root.App = root.App || {};
  const { html, useState, useEffect, useRef } = App.lib;
  const { Btn, Icon, Pill, Photo, Sheet, Field, Segmented, WeekStrip, Ticket, Bar, Countdown, Logo, Accordion, toast, cx } = App.ui;
  const T = App.time, C = App.config;
  App.views = App.views || {};
  App.views.customer = App.views.customer || {};
  App.nav = App.nav || {};                       // kleiner Merkzettel zwischen Start und Sortiment (Kategorie-Tab)

  const eur = (n) => App.fmt.eur(n);
  const dayShort = (k) => T.fmt.day(k).replace(/^\S+\s/, '');
  const hm = (min) => T.fmt.hm(min);
  const sel = () => App.sel;
  const reduced = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const goView = (v) => { App.actions.setUi({ customerView: v }); if (root.scrollTo) root.scrollTo(0, 0); };
  const goSortiment = (cat) => { App.nav.sortimentCat = cat || null; goView('sortiment'); };
  const cutoffText = () => hm(C.cutoff.h * 60 + C.cutoff.m);
  const SAFETY = () => 'Keine Bindung · jederzeit pausieren · bis ' + cutoffText() + ' am Vortag änderbar';
  const F = () => { const f = C.fees; return { abo: f.abo, aboWe: f.aboWeekend != null ? f.aboWeekend : f.abo, flex: f.flex, flexWe: f.flexWeekend != null ? f.flexWeekend : f.flex }; };
  const feePair = (a, b) => (a === b ? eur(a) : eur(a) + ' werktags · ' + eur(b) + ' am Wochenende');
  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());

  /* ---------- Hilfen ---------- */
  function Section({ id, eyebrow, title, lead, tone, children, class: klass }) {
    return html`<section class=${cx('k-sec', tone && 'k-sec-' + tone, klass)} id=${id}>
      <div class="ui-wrap">
        ${eyebrow || title || lead ? html`<header class="k-sec-head">
          ${eyebrow ? html`<div class="ui-eyebrow">${eyebrow}</div>` : null}
          ${title ? html`<h2>${title}</h2>` : null}
          ${lead ? html`<p class="ui-lead">${lead}</p>` : null}
        </header>` : null}
        ${children}
      </div>
    </section>`;
  }

  function weekdaysText(wds) {
    if (!wds || !wds.length) return 'an allen Liefertagen';
    const s = wds.slice().sort((a, b) => a - b);
    const run = s.every((v, i) => i === 0 || v === s[i - 1] + 1);
    return 'nur ' + (run && s.length > 2 ? T.WD[s[0]] + '–' + T.WD[s[s.length - 1]] : s.map(w => T.WD[w]).join(', '));
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
          <p>${waiting ? waiting + (waiting === 1 ? ' Person wartet' : ' Personen warten') + ' in ' + (region ? region.name : 'Ihrem Gebiet') + ' bereits auf einen ' + dayName + '.' : 'Aktuell ist kein weiterer ' + dayName + '-Platz frei.'}
            Sie hören von uns, sobald ein Platz frei wird. Er ist dann ${C.reserveHours} Stunden nur für Sie reserviert.</p>
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
        <p class="ui-lead">Sobald ${need} Haushalte vorgemerkt sind, beginnen wir mit der Belieferung. Sie liefern keine Daten über das Vormerken hinaus.</p>
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
        promo: eff === 'free' && weak.includes(wd) ? 'Gratis-Zustellung' : undefined,
        selected: d.mode !== 'flex' && !!d.abo[wd]
      };
    });
    const freeCount = days.filter(x => x.effective === 'free' || x.effective === 'few').length;
    const chosen = days.filter(x => x.selected);
    const stats = sel().regionStats ? sel().regionStats(s, region.id) : null;
    const few = days.filter(x => x.effective === 'few');
    const full = days.filter(x => x.effective === 'full');
    const promoDays = days.filter(x => x.promo);
    const pick = (day) => {
      if (day.effective === 'full') { onWait({ wd: day.wd, regionId: region.id }); return; }
      if (day.effective === 'booked' || day.effective === 'closed') return;
      if (d.mode === 'flex') App.actions.setDraft({ mode: 'abo' });
      App.actions.draftToggleDay(day.wd);
    };
    const plan = () => { App.actions.setDraft({ mode: 'abo' }); goView('lieferplan'); };
    const once = () => { App.actions.setDraft({ mode: 'flex' }); goView('lieferplan'); };
    return html`<div class="k-result-body">
      <div class="k-result-head"><div>
        <div class="ui-eyebrow">PLZ ${plz} · ${region.name}</div>
        <h2>${region.name}: an ${freeCount} von 7 Tagen sind Plätze frei.</h2>
        ${stats && stats.households ? html`<p class="k-proof"><${Icon} name="users" size=${18} /><span>${stats.households} Haushalte in ${region.name} frühstücken schon mit uns.</span></p>` : null}
      </div></div>
      <p class="k-strip-hint">Tippen Sie auf die Tage, an denen Sie beliefert werden möchten.</p>
      <${WeekStrip} days=${days} onPick=${pick} label=${'Liefertage in ' + region.name} />
      <div class="k-flags">
        ${few.map(x => html`<span class="k-flag k-flag-warn" key=${'f' + x.wd}><${Icon} name="alert" size=${16} />${T.WD_LONG[x.wd]}: nur noch ${Math.max(x.cap.freeAbo, 0)} Plätze</span>`)}
        ${full.map(x => html`<button type="button" class="k-flag k-flag-full" key=${'u' + x.wd} onClick=${() => onWait({ wd: x.wd, regionId: region.id })}>
          <${Icon} name="bell" size=${16} />${T.WD_LONG[x.wd]} ist ausgebucht${sel().waitlistFor(s, region.id, x.wd).length ? ' · ' + sel().waitlistFor(s, region.id, x.wd).length + ' warten' : ''} – auf die Warteliste</button>`)}
      </div>
      ${promoDays.length ? html`<p class="k-promo"><${Icon} name="gift" size=${18} /><span><strong>Aktion für Neukunden:</strong> ${promoDays.map(x => T.WD[x.wd]).join(', ')} – die ersten ${C.promo.weakDayFreeWeeks} Wochen ohne Zustellgebühr (${eur(F().abo)} je Lieferung).</span></p>` : null}
      <div class="k-cta">
        <div class="k-cta-main">
          <${Btn} variant="sun" size="lg" icon="bag" onClick=${plan}>Lieferplan zusammenstellen<//>
          <${Btn} variant="ghost" size="lg" onClick=${once}>Nur einmal bestellen<//>
        </div>
        <p class="k-safety"><${Icon} name="check" size=${16} /><span>${SAFETY()}</span></p>
        ${chosen.length ? html`<p class="k-chosen">Vorgemerkt: ${chosen.map(x => T.WD_LONG[x.wd]).join(', ')}</p>` : null}
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
      <div class="k-hero-bg"><${Photo} id="hero" alt="Papiersackerl mit frischem Gebäck an einer Türschnalle" ratio="3/2" /></div>
      <div class="k-hero-shade"></div>
      <div class="ui-wrap k-hero-in">
        <div class="k-hero-text">
          <div class="k-hero-eyebrow">Werktags bis ${hm(C.deadlineMin.weekday)} · am Wochenende bis ${hm(C.deadlineMin.weekend)}</div>
          <h1 id="k-h1">${C.brand.claim}</h1>
          <p class="k-hero-lead">Semmeln, Weckerl und Croissants vom Partnerbäcker, dazu Butter und Marmelade vom Hofladen. Als Sackerl an Ihrer Türschnalle, bevor der Wecker läutet.</p>
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
        </div>
        <aside class="k-hero-ticket" aria-label="Beispiel Lieferzettel">
          <${Ticket} title="Lieferzettel" stamp="frisch" rows=${[['Lieferung', T.fmt.day(next)], ['Sackerl da', 'bis ' + hm(T.deadlineMin(next))], ['Ablage', 'Türschnalle'], ['Bestellschluss', T.fmt.rel(cut)]]}
            footer=${html`<span>Bestellschluss: <${Countdown} to=${cut} /></span>`} />
        </aside>
      </div>
    </section>`;
  }

  /* ---------- Schnellstart-Sackerl ---------- */
  function StarterBags({ s, onNeedPlz }) {
    const bags = sel().starterBags ? sel().starterBags(s) : [];
    if (!bags.length) return null;
    const apply = (bag) => {
      const d = s.draft;
      if (!d.regionId) { onNeedPlz(); return; }
      const region = sel().region(s, d.regionId);
      if (!region || region.planned) { onNeedPlz(); return; }
      const cid = s.session.customerId;
      const open = (wd) => ['free', 'few', 'reserved'].includes(sel().dayStatusFor(s, d.regionId, wd, cid));
      let wds = Object.keys(d.abo).map(Number).filter(open);
      if (!wds.length) {
        const cand = [0, 1, 2, 3, 4, 5, 6].filter(open).sort((a, b) => (T.nextDateForWeekday(a) < T.nextDateForWeekday(b) ? -1 : 1));
        wds = cand.length ? [cand[0]] : [];
      }
      if (!wds.length) { toast('An diesen Tagen ist aktuell kein Platz frei.', 'warn'); return; }
      wds.forEach(wd => App.actions.draftApplyBag({ wd }, bag.items));
      App.actions.setDraft({ mode: 'abo', target: { type: 'abo', weekdays: wds } });
      toast(bag.title + ' liegt im Sackerl für ' + wds.map(w => T.WD_LONG[w]).join(' und ') + '.', 'ok');
      goView('lieferplan');
    };
    return html`<${Section} id="k-schnellstart" eyebrow="Schnellstart" title="In zehn Sekunden zum ersten Sackerl" lead="Drei bewährte Zusammenstellungen. Sie können alles im Lieferplan noch ändern.">
      <div class="k-bags">
        ${bags.map(b => {
          const ids = Object.keys(b.items).slice(0, 3);
          return html`<article class="k-bag" key=${b.id}>
            <div class=${'k-mosaic k-mosaic-' + ids.length} aria-hidden="true">${ids.map(id => html`<div class="k-mosaic-cell" key=${id}><${Photo} id=${id} ratio="1/1" /></div>`)}</div>
            <div class="k-bag-body">
              <h3>${b.title}</h3>
              <p class="ui-muted">${b.text}</p>
              <p class="k-bag-items">${sel().itemsText(s, b.items, 4)}</p>
              <div class="k-bag-price"><strong>${eur(b.total)}</strong>${b.saving > 0 ? html`<${Pill} tone="ok">spart ${eur(b.saving)}<//>` : null}</div>
            </div>
            <${Btn} variant="sun" full icon="bag" onClick=${() => apply(b)}>In den Lieferplan<//>
          </article>`;
        })}
      </div>
    <//>`;
  }

  /* ---------- So funktioniert's, Abo/Einmalig ---------- */
  function HowItWorks() {
    const steps = [
      { t: 'bis ' + cutoffText(), h: 'Sie bestellen am Vortag', p: 'Bis ' + cutoffText() + ' am Vortag stellen Sie Ihr Sackerl zusammen. Für Samstag, Sonntag und Montag gilt der Freitag.' },
      { t: 'ab 03:30', h: 'Wir holen frisch vom Bäcker', p: 'In der Nacht backt die Partnerbäckerei, ab 03:30 holen wir Ihr Gebäck ab und packen die Sackerl.' },
      { t: 'bis ' + hm(C.deadlineMin.weekday), h: 'Das Sackerl hängt an der Tür', p: 'Werktags bis ' + hm(C.deadlineMin.weekday) + ', am Wochenende bis ' + hm(C.deadlineMin.weekend) + '. Ablageort Ihrer Wahl, ohne Klingeln.' }
    ];
    return html`<${Section} id="k-ablauf" eyebrow="Ablauf" title="So funktioniert’s">
      <div class="k-how">
        <div class="k-how-photo"><${Photo} id="baecker" alt="Frisches Gebäck in der Backstube" ratio="4/3" /></div>
        <ol class="k-steps">
          ${steps.map((st, i) => html`<li class="k-step" key=${i}>
            <span class="k-step-time">${st.t}</span>
            <div><h3>${st.h}</h3><p>${st.p}</p></div>
          </li>`)}
        </ol>
      </div>
    <//>`;
  }

  function Modes({ s }) {
    const f = F(), save = Math.round((f.flex - f.abo) * 100) / 100, saveWe = Math.round((f.flexWe - f.aboWe) * 100) / 100;
    const yearly = Math.round(save * 52);
    const choose = (mode) => { App.actions.setDraft({ mode }); goView('lieferplan'); };
    return html`<${Section} id="k-modi" eyebrow="Regelmäßig oder nur einmal" title="Beides ist möglich. Das Abo ist günstiger." tone="soft">
      <div class="k-modes">
        <article class="k-mode k-mode-rec">
          <div class="k-mode-top"><h3>Abo</h3><${Pill} tone="sun" icon="star">Empfohlen<//></div>
          <p class="k-mode-price"><strong>${eur(f.abo)}</strong> werktags${f.aboWe !== f.abo ? html` · <strong>${eur(f.aboWe)}</strong> am Wochenende` : ''} je Lieferung</p>
          <p class="k-mode-save">Sie sparen ${eur(save)} werktags${saveWe !== save ? ' und ' + eur(saveWe) + ' am Wochenende' : ''} je Lieferung gegenüber einer Einmalbestellung. Bei einem Sackerl pro Woche sind das rund ${eur(yearly)} im Jahr.</p>
          <ul class="k-ticks">
            <li><${Icon} name="check" size=${18} />Fester Platz auf der Tour, auch wenn der Tag voll wird</li>
            <li><${Icon} name="check" size=${18} />Jederzeit pausieren, aussetzen oder ändern</li>
            <li><${Icon} name="check" size=${18} />Keine Bindung, keine Mindestlaufzeit</li>
          </ul>
          <${Btn} variant="sun" size="lg" icon="calendar" onClick=${() => choose('abo')}>Abo zusammenstellen<//>
        </article>
        <article class="k-mode">
          <div class="k-mode-top"><h3>Einmalig</h3></div>
          <p class="k-mode-price"><strong>${eur(f.flex)}</strong> werktags${f.flexWe !== f.flex ? html` · <strong>${eur(f.flexWe)}</strong> am Wochenende` : ''} Zustellung · ab ${eur(C.fees.flexMinOrder)} Bestellwert</p>
          <p class="k-mode-save ui-muted">Für den Sonntag mit Besuch oder wenn Sie nur testen möchten.</p>
          <ul class="k-ticks">
            <li><${Icon} name="check" size=${18} />Solange am gewünschten Tag Plätze frei sind</li>
            <li><${Icon} name="check" size=${18} />Kein Abo, keine Anmeldung auf Dauer</li>
            <li><${Icon} name="check" size=${18} />Bestellschluss ${cutoffText()} am Vortag</li>
          </ul>
          <${Btn} variant="ghost" size="lg" icon="bag" onClick=${() => choose('flex')}>Einmal bestellen<//>
        </article>
      </div>
      <p class="k-safety k-safety-center"><${Icon} name="check" size=${16} /><span>${SAFETY()}</span></p>
      ${C.fees.freeDeliveryFrom ? html`<p class="ui-muted k-fine">Ab ${eur(C.fees.freeDeliveryFrom)} Warenwert je Lieferung entfällt die Zustellgebühr.</p>` : null}
    <//>`;
  }

  /* ---------- Aktionen und Sortiment ---------- */
  function Offers({ s }) {
    const offers = (s.offers || []).filter(o => o.active);
    if (!offers.length) return null;
    return html`<div class="k-offers-wrap">
      <div class="k-sub-head"><h3>Aktionen</h3><span class="ui-muted">Der Rabatt wird im Sackerl automatisch berechnet.</span></div>
      <div class="k-scroller k-offers">
        ${offers.map(o => {
          const gp = sel().product(s, o.get.productId), bp = o.buy.kind === 'product' ? sel().product(s, o.buy.ref) : null;
          if (!gp) return null;
          const saving = Math.round(gp.price * o.get.qty * o.get.pct) / 100;
          return html`<button type="button" class="k-offer" key=${o.id} onClick=${() => goSortiment('aktionen')}>
            <span class="k-offer-img"><${Photo} id=${gp.id} alt=${gp.name} ratio="4/3" /><span class="ui-pill ui-pill-sun">${o.get.pct >= 100 ? 'gratis' : '−' + o.get.pct + ' %'}</span></span>
            <span class="k-offer-body">
              <strong>${o.title}</strong>
              <span class="ui-muted">${weekdaysText(o.weekdays)} · Sie sparen ${eur(saving)} je Bündel${bp && bp.id !== gp.id ? '' : ''}</span>
              ${o.note ? html`<span class="k-offer-note">${o.note}</span>` : null}
            </span>
          </button>`;
        })}
      </div>
    </div>`;
  }

  function Assortment({ s }) {
    const season = C.season, seasonOpen = season && T.isOpenFor(season.dateKey);
    const cats = Object.keys(C.labels.cat);
    const best = s.products.filter(p => p.active && p.bestseller && !(p.season && !seasonOpen));
    const rest = s.products.filter(p => p.active && !p.bestseller && !p.weekendOnly && !p.season).slice(0, 6);
    const shown = best.concat(rest).slice(0, 12);
    return html`<${Section} id="k-sortiment" eyebrow="Sortiment" title="Frisch gebacken, echt lecker">
      <${Offers} s=${s} />
      <div class="k-sub-head"><h3>Beliebt zum Frühstück</h3><${Btn} variant="quiet" size="sm" iconAfter="chevron-right" onClick=${() => goSortiment(null)}>Alles ansehen<//></div>
      <div class="k-scroller k-picks">
        ${shown.map(p => {
          const badge = (sel().offersForProduct(s, p.id, null)[0] || {}).badge;
          return html`<button type="button" class="k-pick" key=${p.id} onClick=${() => goSortiment(p.cat)}>
            <span class="k-pick-img"><${Photo} id=${p.id} alt=${p.name} ratio="1/1" />${badge ? html`<span class="ui-pill ui-pill-sun">${badge}</span>` : null}</span>
            <span class="k-pick-name">${p.name}</span>
            <span class="k-pick-price ui-num">${eur(p.price)}</span>
          </button>`;
        })}
      </div>
      <div class="k-cats" role="group" aria-label="Kategorien">
        ${cats.map(c => html`<button type="button" class="k-catpill" key=${c} onClick=${() => goSortiment(c)}>${C.labels.cat[c]}<${Icon} name="chevron-right" size=${16} /></button>`)}
      </div>
    <//>`;
  }

  function SeasonBlock({ s }) {
    const se = C.season;
    if (!se || !T.isOpenFor(se.dateKey)) return null;
    const p = sel().product(s, se.productId);
    if (!p || !p.active) return null;
    const pre = () => {
      const flex = Object.assign({}, s.draft.flex); flex[p.id] = Math.max(1, flex[p.id] || 0);
      App.actions.setDraft({ mode: 'flex', flexDate: se.dateKey, flex, target: { type: 'flex' } });
      goView('lieferplan');
    };
    const cut = T.cutoffFor(se.dateKey);
    return html`<section class="k-sec k-season" id="k-saison"><div class="ui-wrap">
      <div class="k-season-card">
        <div class="k-season-photo"><${Photo} id=${p.id} alt=${p.name} ratio="1/1" /></div>
        <div class="k-season-body">
          <div class="ui-eyebrow">Saison · ${T.fmt.dayLong(se.dateKey)}</div>
          <h2>${se.title}</h2>
          <p>${p.desc} Zum Nikolotag als Einmallieferung vor die Tür, ${eur(p.price)}.</p>
          <p class="k-season-cut"><${Icon} name="clock" size=${18} />Bestellschluss ${T.fmt.rel(cut)} · <${Countdown} to=${cut} /></p>
          <${Btn} variant="sun" size="lg" icon="gift" onClick=${pre}>Vorbestellen<//>
        </div>
      </div>
    </div></section>`;
  }

  function Partners({ s }) {
    const extras = ['teebutter', 'marillenmarmelade', 'bluetenhonig', 'freilandeier'].map(id => sel().product(s, id)).filter(Boolean);
    return html`<${Section} id="k-partner" eyebrow="Unsere Partner" title="Vom Bäcker und vom Hof">
      <div class="k-partners">
        <article class="k-partner">
          <div class="k-partner-photo"><${Photo} id="baecker" alt="Backstube der Partnerbäckerei" ratio="3/2" /></div>
          <h3>Backstube Kornfeld</h3>
          <p>Familienbetrieb seit 1928 (Beispielname). Die Semmeln und Weckerl werden in der Nacht gebacken und gehen noch warm in Ihr Sackerl.</p>
        </article>
        <article class="k-partner">
          <div class="k-partner-photo"><${Photo} id="hofladen" alt="Aufstriche und Milchprodukte aus dem Hofladen" ratio="3/2" /></div>
          <h3>Hofladen-Extras</h3>
          <p>Butter, Marmelade, Honig, Eier, Käse und Milch aus der Region. Gekühlte Waren kommen im Kühlsackerl.</p>
          <ul class="k-extras">${extras.map(p => html`<li key=${p.id}><${Photo} id=${p.id} alt="" ratio="1/1" /><span>${p.name}</span></li>`)}</ul>
          <${Btn} variant="quiet" size="sm" iconAfter="chevron-right" onClick=${() => goSortiment('extras')}>Extras ansehen<//>
        </article>
      </div>
    <//>`;
  }

  /* ---------- Nachbarn werben, Büro, Geschenk ---------- */
  function codeFor(id) {
    let h = 5381;
    for (let i = 0; i < String(id).length; i++) h = ((h * 33) ^ String(id).charCodeAt(i)) >>> 0;
    return 'ENGEL-' + h.toString(36).toUpperCase().slice(0, 4).padEnd(4, 'X');
  }
  function Referral({ s }) {
    const code = codeFor(s.session.customerId);
    const credit = C.promo.referralCredit;
    const copy = () => {
      let ok = false;
      try { if (root.navigator && root.navigator.clipboard) { root.navigator.clipboard.writeText(code); ok = true; } } catch (e) { ok = false; }
      toast(ok ? 'Code ' + code + ' kopiert.' : 'Ihr Code: ' + code, 'ok');
    };
    return html`<${Section} id="k-werben" eyebrow="Nachbarn werben" title=${'Zwei Sackerl, ' + eur(credit) + ' Guthaben'} tone="soft">
      <div class="k-referral">
        <div>
          <p class="ui-lead">Je mehr Nachbarn in einer Straße mitmachen, desto kürzer die Tour. Das geben wir weiter: Wer einen Haushalt wirbt, bekommt ${eur(credit)} Guthaben, die Geworbenen ebenfalls.</p>
          <p class="ui-muted">Das Guthaben wird mit der nächsten Rechnung verrechnet.</p>
        </div>
        <${Ticket} title="Ihr Empfehlungscode" rows=${[['Code', code], ['Guthaben', eur(credit) + ' für beide']]}
          footer=${html`<${Btn} variant="primary" size="sm" icon="send" onClick=${copy}>Code kopieren<//>`} />
      </div>
    <//>`;
  }

  function OfficeGift({ s }) {
    const office = sel().product(s, 'box-buero'), gift = sel().product(s, 'box-sonntag');
    return html`<${Section} id="k-buero" eyebrow="Für Büro und Geschenk" title="Frühstück für andere">
      <div class="k-duo">
        <article class="k-duo-card">
          <div class="k-duo-photo"><${Photo} id="buero" alt="Gedeckter Frühstückstisch im Büro" ratio="3/2" /></div>
          <div class="k-duo-body">
            <h3>Büro-Frühstück${office ? ' für 10' : ''}</h3>
            <p>Gebäck, Aufstriche und Getränke für das Team${office ? ', ab ' + eur(office.price) : ''}. Als Einmallieferung zum Meeting oder regelmäßig am Montag.</p>
            <${Btn} variant="ghost" size="sm" iconAfter="chevron-right" onClick=${() => goSortiment('boxen')}>Frühstücks-Sackerl ansehen<//>
          </div>
        </article>
        <article class="k-duo-card">
          <div class="k-duo-photo"><${Photo} id="geschenk" alt="Verpacktes Frühstücks-Sackerl als Geschenk" ratio="3/2" /></div>
          <div class="k-duo-body">
            <h3>Frühstück verschenken</h3>
            <p>Ein Sonntagsfrühstück${gift ? ' (' + eur(gift.price) + ')' : ''} für Eltern, Freunde oder zum Geburtstag. Wählen Sie die Einmallieferung und geben Sie bei der Bestellung die Adresse der Beschenkten an.</p>
            <${Btn} variant="ghost" size="sm" iconAfter="chevron-right" onClick=${() => goSortiment('boxen')}>Sackerl aussuchen<//>
          </div>
        </article>
      </div>
    <//>`;
  }

  function PromiseBlock() {
    return html`<section class="k-sec k-promise"><div class="ui-wrap">
      <div class="k-promise-card">
        <span class="k-promise-icon"><${Icon} name="clock" size=${30} /></span>
        <div><h2>Pünktlich oder gratis</h2>
          <p>Kommt Ihr Sackerl später als ${hm(C.deadlineMin.weekday)} Uhr (Samstag und Sonntag ${hm(C.deadlineMin.weekend)} Uhr), geht die Zustellung auf uns. Das Gebäck bleibt Ihres.</p></div>
      </div>
    </div></section>`;
  }

  function Faq() {
    const items = [
      { id: 'cut', title: 'Bis wann muss ich bestellen?', body: 'Bis ' + cutoffText() + ' am Vortag. Für Samstag, Sonntag und Montag gilt der Freitag davor. Im Lieferplan sehen Sie immer, wie lange Sie noch ändern können.' },
      { id: 'urlaub', title: 'Was passiert im Urlaub?', body: 'Sie können einzelne Lieferungen aussetzen oder eine Urlaubspause von–bis eintragen, jeweils bis zum Bestellschluss. Pausierte Lieferungen kosten nichts.' },
      { id: 'montag', title: 'Was, wenn der Montag ausgebucht ist?', body: 'Dann setzen wir Sie auf die Warteliste. Sobald ein Platz frei wird, bekommen Sie eine Nachricht und der Platz ist ' + C.reserveHours + ' Stunden für Sie reserviert. Bis dahin können Sie die anderen Tage schon nutzen.' },
      { id: 'einmal', title: 'Kann ich auch nur einmal bestellen?', body: 'Ja. Einmallieferungen gibt es ab ' + eur(C.fees.flexMinOrder) + ' Bestellwert, solange am Wunschtag ein Platz frei ist. Die Zustellung kostet ' + eur(C.fees.flex) + '.' },
      { id: 'zahlung', title: 'Wie bezahle ich?', body: 'Per SEPA-Lastschrift monatlich oder mit Karte. In dieser Demo wird nichts abgebucht.' },
      { id: 'ablage', title: 'Wohin kommt das Sackerl?', body: 'An die Türschnalle, vor die Wohnungstür oder in die Zeitungsbox. Sie können auch einen eigenen Hinweis für den Fahrer hinterlegen, zum Beispiel für den Hintereingang.' }
    ];
    return html`<${Section} id="k-faq" eyebrow="Fragen und Antworten" title="Gut zu wissen">
      <div class="k-faq"><${Accordion} items=${items} /></div>
    <//>`;
  }

  /* ---------- Fuß ---------- */
  function Credits({ open, onClose }) {
    const list = App.photoCredits || [];
    return html`<${Sheet} open=${open} onClose=${onClose} title="Bildnachweise">
      ${list.length ? html`<ul class="k-credits">${list.map((c, i) => html`<li key=${i}>
        <strong>${c.title || c.id || 'Foto'}</strong>
        <span>${[c.author ? 'Von ' + c.author : null, c.license || c.licence].filter(Boolean).join(' · ')}</span>
        ${c.source ? html`<span class="k-credit-src">Quelle: ${c.source}</span>` : null}
      </li>`)}</ul>`
        : html`<p>Die Demo zeigt Illustrationen, solange keine Fotos hinterlegt sind. Sobald Fotos eingebunden werden, stehen hier Titel, Urheber, Lizenz und Quelle.</p>`}
    <//>`;
  }

  function Foot({ onCredits }) {
    return html`<footer class="k-foot ui-band-night"><div class="ui-wrap k-foot-in">
      <div class="k-foot-brand"><${Logo} onNight size=${24} /><p>${C.brand.claim}</p></div>
      <div class="k-foot-note">
        <p><strong>Demo mit Beispieldaten.</strong> Alle Namen, Adressen, Preise und Zahlen sind erfunden. Es wird nichts bestellt und nichts abgebucht.</p>
        <button type="button" class="k-foot-link" onClick=${onCredits}>Bildnachweise</button>
      </div>
    </div></footer>`;
  }

  /* ---------- Seite ---------- */
  function Start() {
    const s = App.useStore();
    const [plz, setPlz] = useState(s.draft.plz || '');
    const [err, setErr] = useState('');
    const [wait, setWait] = useState(null);
    const [credits, setCredits] = useState(false);
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

    const needPlz = () => {
      setErr('Bitte prüfen Sie zuerst Ihre Postleitzahl, dann legen wir das Sackerl für Sie an.');
      if (root.scrollTo) root.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
      if (inputRef.current) setTimeout(() => inputRef.current && inputRef.current.focus({ preventScroll: true }), 200);
    };

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
      <${StarterBags} s=${s} onNeedPlz=${needPlz} />
      <${HowItWorks} />
      <${Modes} s=${s} />
      <${Assortment} s=${s} />
      <${SeasonBlock} s=${s} />
      <${Partners} s=${s} />
      <${Referral} s=${s} />
      <${OfficeGift} s=${s} />
      <${PromiseBlock} />
      <${Faq} />
      <${Foot} onCredits=${() => setCredits(true)} />
      ${wait ? html`<${WaitlistSheet} s=${s} target=${wait} onClose=${() => setWait(null)} />` : null}
      <${Credits} open=${credits} onClose=${() => setCredits(false)} />
    </div>`;
  }
  Start.fullBleed = true;
  App.views.customer.start = Start;
})(typeof window !== 'undefined' ? window : globalThis);
