/* Backoffice › Warteliste (V3): Einträge je Gebiet und Tag, Plätze anbieten, Gebiets-Vormerkungen. */
(function (root) {
  const App = root.App = root.App || {};
  const { html } = App.lib;
  const { Btn, Pill, Bar, toast, Empty } = App.ui;
  const T = App.time;
  const B = () => App.boA;

  const CH = { push: ['Push', 'phone'], email: ['E-Mail', 'mail'] };
  function nameOf(s, w) {
    const c = w.customerId ? App.sel.customer(s, w.customerId) : null;
    return (c && c.registered ? c.name : '') || (w.contact && w.contact.name) || 'Ohne Namen';
  }
  function StatusCell({ w }) {
    if (w.status === 'notified') {
      const live = w.reservedUntil && new Date(w.reservedUntil).getTime() > T.now().getTime();
      return live ? html`<${Pill} tone="info" icon="bell">benachrichtigt · reserviert bis ${T.fmt.rel(new Date(w.reservedUntil))}<//>`
        : html`<${Pill} tone="warn" icon="clock">benachrichtigt, Frist vorbei<//>`;
    }
    if (w.status === 'booked') return html`<${Pill} tone="ok" icon="check">gebucht<//>`;
    if (w.status === 'expired') return html`<${Pill} tone="neutral">abgelaufen<//>`;
    return html`<${Pill} tone="neutral" icon="clock">wartet<//>`;
  }

  function EntryTable({ s, entries }) {
    const sorted = entries.slice().sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    return html`<div class="ui-tablewrap"><table class="ui-table bo-wl-table"><thead><tr><th>Nr.</th><th>Name</th><th>PLZ</th><th>Kanal</th><th>Eingetragen</th><th>Status</th></tr></thead>
      <tbody>${sorted.map((w, i) => html`<tr key=${w.id}><td class="ui-mono">${i + 1}</td><td><strong>${nameOf(s, w)}</strong></td>
        <td class="ui-mono">${(w.contact && w.contact.plz) || '–'}</td>
        <td><${Pill} tone="neutral" icon=${CH[w.channel] ? CH[w.channel][1] : 'bell'}>${CH[w.channel] ? CH[w.channel][0] : w.channel}<//></td>
        <td class="ui-mono">${T.fmt.dateTime(new Date(w.createdAt))}</td><td><${StatusCell} w=${w} /></td></tr>`)}</tbody></table></div>`;
  }

  function offer(region, wd, count, free) {
    const r = App.actions.notifyWaitlist(region.id, wd, count);
    if (!r.notified) toast('Niemand zu benachrichtigen.', 'warn');
    else toast(T.WD_LONG[wd] + ' angeboten · ' + r.notified + ' Wartende benachrichtigt (' + r.push + ' Push, ' + r.email + ' E-Mail)', 'ok');
  }

  function DaySection({ s, region, wd }) {
    const entries = s.waitlist.filter(w => w.regionId === region.id && w.weekday === wd);
    if (!entries.length) return null;
    const cap = App.sel.cap(s, region.id, wd);
    const waiting = entries.filter(w => w.status === 'waiting').length;
    const can = Math.max(0, Math.min(waiting, cap.status === 'open' ? cap.freeAbo : 0));
    const id = 'wl-' + wd;
    return html`<section class="ui-card bo-sec" aria-labelledby=${id}>
      <div class="bo-sec-head"><div class="ui-grow"><h2 id=${id}>${T.WD_LONG[wd]}</h2>
        <p class="ui-muted bo-sec-sub">${B().plural(waiting, 'Person wartet', 'Personen warten')} · ${cap.abo} von ${cap.max} Plätzen belegt · ${cap.freeAbo > 0 ? cap.freeAbo + ' Abo-Plätze frei' : 'keine Abo-Plätze frei'}</p></div>
        <div class="ui-row">
          ${waiting && can > 0 ? html`<${Btn} size="sm" variant="ghost" onClick=${() => offer(region, wd, 1)}>Nächstem Platz anbieten<//>
            <${Btn} size="sm" variant="sun" icon="bell" onClick=${() => offer(region, wd, can)}>${can === waiting ? 'Allen' : 'Den ersten ' + can} Platz anbieten<//>` : null}
          ${waiting && can <= 0 ? html`<span class="bo-nocap ui-muted">${cap.status !== 'open' ? 'Tag ist nicht offen.' : 'Kein Platz frei.'}</span>
            <${Btn} size="sm" variant="primary" icon="calendar" onClick=${() => B().go('kapazitaet', { capEdit: wd })}>Kapazität öffnen<//>` : null}
        </div></div>
      <${EntryTable} s=${s} entries=${entries} /></section>`;
  }

  function Prereg({ s }) {
    const groups = [];
    s.regions.forEach(r => {
      const list = s.waitlist.filter(w => w.regionId === r.id && w.weekday == null);
      if (r.planned || list.length) groups.push({ r, list });
    });
    const outside = s.waitlist.filter(w => !w.regionId);
    return html`<section class="ui-card bo-sec" aria-labelledby="wl-prereg"><h2 id="wl-prereg">Gebiets-Vormerkungen</h2>
      <p class="ui-muted bo-sec-sub">Haushalte, die sich für ein Gebiet in Planung vormerken lassen.</p>
      <div class="ui-stack">
        ${groups.map(({ r, list }) => {
          const need = r.neededPrereg || 0, n = list.filter(w => w.status === 'waiting' || w.status === 'notified').length;
          const ready = need > 0 && n >= need;
          return html`<div key=${r.id} class="bo-prereg"><div class="bo-sec-head"><div class="ui-grow"><h3>${r.name}</h3>
            <div class="ui-muted">PLZ ${r.plz.join(', ')}</div></div>
            ${r.planned ? html`<${Btn} size="sm" variant=${ready ? 'sun' : 'ghost'} icon="bell" disabled=${!ready || !list.some(w => w.status === 'waiting')}
              onClick=${() => { const x = App.actions.notifyWaitlist(r.id, null); toast(x.notified + ' Vormerkungen benachrichtigt (' + x.push + ' Push, ' + x.email + ' E-Mail)', 'ok'); }}>Gebiet starten und benachrichtigen<//>` : null}</div>
            ${need ? html`<div class="bo-prereg-bar"><${Bar} value=${n} max=${need} tone=${ready ? 'ok' : 'sun'} label=${'Vormerkungen ' + r.name} />
              <span class="ui-mono"><strong>${n}</strong> von ${need} Haushalten${ready ? ' · Ziel erreicht' : ' · noch ' + (need - n)}</span></div>` : null}
            <details class="bo-details"><summary>Vormerkungen anzeigen (${list.length})</summary><${EntryTable} s=${s} entries=${list} /></details></div>`;
        })}
        ${outside.length ? html`<div class="bo-prereg"><h3>PLZ außerhalb aller Gebiete</h3>
          <p class="ui-muted">${outside.length} Vormerkungen, zum Beispiel ${Array.from(new Set(outside.map(w => w.contact && w.contact.plz).filter(Boolean))).slice(0, 5).join(', ')}.</p>
          <${EntryTable} s=${s} entries=${outside} /></div>` : null}
        ${!groups.length && !outside.length ? html`<${Empty} icon="map" title="Keine Vormerkungen" text="Sobald sich jemand für ein neues Gebiet vormerken lässt, erscheint er hier." />` : null}
      </div></section>`;
  }

  function Warteliste() {
    const s = App.useStore();
    const region = B().regionOf(s);
    const days = [0, 1, 2, 3, 4, 5, 6].filter(wd => s.waitlist.some(w => w.regionId === region.id && w.weekday === wd));
    const waiting = s.waitlist.filter(w => w.regionId === region.id && w.weekday != null && w.status === 'waiting').length;
    return html`<div class="bo-page">
      ${B().head('Warteliste', region.name + ' · ' + (waiting ? B().plural(waiting, 'Person wartet', 'Personen warten') : 'niemand wartet'))}
      ${days.length ? days.map(wd => html`<${DaySection} key=${wd} s=${s} region=${region} wd=${wd} />`)
        : html`<div class="ui-card"><${Empty} icon="clock" title="Keine Wartenden" text=${'Für ' + region.name + ' steht niemand auf einer Tages-Warteliste.'} /></div>`}
      <${Prereg} s=${s} />
    </div>`;
  }

  App.views = App.views || {};
  App.views.backoffice = App.views.backoffice || {};
  App.views.backoffice.warteliste = Warteliste;
})(typeof window !== 'undefined' ? window : globalThis);
