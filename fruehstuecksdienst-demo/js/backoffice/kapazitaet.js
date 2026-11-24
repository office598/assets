/* Backoffice › Kapazität (V3): je Wochentag eine Zeile, Bearbeiten im Sheet mit Live-Prognose. */
(function (root) {
  const App = root.App = root.App || {};
  const { html, useState, useEffect } = App.lib;
  const { Btn, Pill, StatusPill, Bar, Sheet, Segmented, Stepper, Toggle, toast, Icon } = App.ui;
  const T = App.time;
  const B = () => App.boA;

  /* Live-Vorschau im Sheet: Tourende, Plätze und wie viele Wartende benachrichtigt würden */
  function Forecast({ s, region, wd, draft, cur }) {
    const fe = App.sel.forecastEnd(s, region.id, wd, draft.drivers);
    const max = draft.drivers * draft.stopsPerDriver;
    const freeAbo = max - draft.flexQuota - cur.abo;
    const waiting = App.sel.waitlistFor(s, region.id, wd).filter(w => w.status === 'waiting').length;
    const wouldNotify = draft.status === 'open' && draft.autoNotify && freeAbo > 0 ? Math.min(freeAbo, waiting) : 0;
    const late = fe.endMin - fe.deadlineMin;
    return html`<div class=${'bo-fc ' + (fe.late ? 'bo-fc-late' : 'bo-fc-ok')} aria-live="polite">
      <div class="bo-fc-row"><${Icon} name=${fe.late ? 'alert' : 'check'} size=${20} />
        <div><strong>Tourende ${T.fmt.hm(fe.endMin)}</strong> ${fe.late ? html`<span class="bo-fc-tag">${late} Min zu spät</span>` : html`<span class="bo-fc-tag">pünktlich</span>`}
          <div class="ui-muted">Frist ${T.fmt.hm(fe.deadlineMin)} · ${cur.abo} Abo-Stopps (${T.fmt.day(fe.dateKey)}) auf ${draft.drivers} ${draft.drivers === 1 ? 'Fahrer' : 'Fahrer'}</div></div></div>
      <div class="bo-fc-row"><${Icon} name="users" size=${20} />
        <div><strong>${max} Plätze, davon ${freeAbo > 0 ? freeAbo + ' frei für Abos' : 'keiner frei für Abos'}</strong>
          <div class="ui-muted">${max} − ${draft.flexQuota} Flex-Kontingent − ${cur.abo} Abos = ${freeAbo}</div></div></div>
      <div class="bo-fc-row"><${Icon} name="bell" size=${20} />
        <div><strong>${wouldNotify ? (wouldNotify === 1 ? '1 Wartende wird' : wouldNotify + ' Wartende werden') + ' benachrichtigt' : 'Niemand wird benachrichtigt'}</strong>
          <div class="ui-muted">${waiting ? waiting + ' warten auf diesen Tag.' : 'Keine Wartenden für diesen Tag.'}${wouldNotify === 0 && waiting && draft.status !== 'open' ? ' Status „Offen“ nötig.' : ''}${wouldNotify === 0 && waiting && draft.status === 'open' && !draft.autoNotify ? ' Automatik ist aus.' : ''}</div></div></div>
    </div>`;
  }

  function Pay({ s, region, wd, drivers, dateKey }) {
    if (!App.sel.tourEconomics) return null;
    const e = App.sel.tourEconomics(s, region.id, dateKey, drivers);
    const eco = B().eco(), rate = eco.driverPerPiece, anyMin = e.perDriver.some(d => d.minApplied);
    const eur = App.fmt.eur;
    return html`<div class="bo-pay"><h4>Vergütung je Fahrer (${T.fmt.day(dateKey)}, netto)</h4>
      <div class="ui-tablewrap"><table class="ui-table"><thead><tr><th>Fahrer</th><th class="num">Stopps</th><th class="num">Stück</th><th class="num">Vergütung</th></tr></thead>
        <tbody>${e.perDriver.map((d, i) => html`<tr key=${i}><td>${d.driver.name}</td><td class="num">${d.stops}</td><td class="num">${d.pieces}</td><td class="num"><strong>${eur(d.pay)}</strong>${d.minApplied ? html`<div class="ui-muted bo-pay-min">Mindestvergütung ${eur(eco.driverMinPerTour)} statt ${eur(d.pieceBased)} nach Stück</div>` : null}</td></tr>`)}</tbody></table></div>
      <p class="ui-muted">Die Fahrer sind Subunternehmer und bekommen ${eur(rate)} je Stück, mindestens ${eur(eco.driverMinPerTour)} je Tour. ${anyMin ? 'Ein weiterer Fahrer kostet das Unternehmen zusätzlich, solange die Mindestvergütung greift: Vergütung insgesamt ${eur(e.perDriver.reduce((a, d) => a + d.pay, 0))}.' : 'Alle Fahrer liegen über der Mindestvergütung, ein weiterer Fahrer kostet deshalb nichts zusätzlich.'}</p></div>`;
  }

  function EditSheet({ s, region, wd, onClose }) {
    const cur = App.sel.cap(s, region.id, wd);
    const [d, setD] = useState({ status: cur.status, drivers: cur.drivers, stopsPerDriver: cur.stopsPerDriver, flexQuota: cur.flexQuota, autoNotify: cur.autoNotify !== false });
    const set = patch => setD(Object.assign({}, d, patch));
    const labels = App.config.labels.capStatus;
    const save = () => {
      const was = cur.status;
      const r = App.actions.setCapacity(region.id, wd, d);
      const opened = d.status === 'open' && was !== 'open';
      let txt = T.WD_LONG[wd] + (opened ? ' freigegeben' : ' gespeichert');
      if (r.notified) txt += ' · ' + r.notified + ' Wartende' + ' benachrichtigt (' + r.push + ' Push, ' + r.email + ' E-Mail)';
      toast(txt, 'ok');
      onClose();
    };
    return html`<${Sheet} open=${true} onClose=${onClose} title=${T.WD_LONG[wd] + ' · ' + region.name}
      footer=${[html`<${Btn} key="c" variant="ghost" onClick=${onClose}>Abbrechen<//>`, html`<${Btn} key="s" variant="sun" icon="check" onClick=${save}>Speichern<//>`]}>
      <div class="ui-stack bo-edit">
        <div class="ui-field"><span class="ui-label">Status</span>
          <${Segmented} label="Status" value=${d.status} onChange=${v => set({ status: v })}
            options=${['open', 'waitlist', 'closed'].map(v => ({ value: v, label: labels[v] }))} />
          <div class="ui-hint">Offen: Kunden können buchen. Warteliste: Der Tag gilt als ausgebucht, neue Interessenten kommen auf die Warteliste. Gesperrt: keine Lieferung.</div></div>
        <div class="bo-edit-grid">
          <div class="ui-field"><span class="ui-label">Fahrer</span><${Stepper} label="Fahrer" value=${d.drivers} min=${1} max=${6} onChange=${v => set({ drivers: v })} /></div>
          <div class="ui-field"><span class="ui-label">Stopps je Fahrer</span><${Stepper} label="Stopps je Fahrer" value=${d.stopsPerDriver} min=${10} max=${150} onChange=${v => set({ stopsPerDriver: v })} /></div>
          <div class="ui-field"><span class="ui-label">Flex-Kontingent</span><${Stepper} label="Flex-Kontingent" value=${d.flexQuota} min=${0} max=${30} onChange=${v => set({ flexQuota: v })} /></div>
        </div>
        <${Toggle} id="cap-auto" label="Warteliste automatisch benachrichtigen" hint=${"Wird der Tag offen und ist Platz frei, bekommen die ersten Wartenden " + App.config.reserveHours + " Stunden lang den Vorrang."}
          checked=${d.autoNotify} onChange=${v => set({ autoNotify: v })} />
        <${Forecast} s=${s} region=${region} wd=${wd} draft=${d} cur=${cur} />
        <${Pay} s=${s} region=${region} wd=${wd} drivers=${d.drivers} dateKey=${App.sel.forecastEnd(s, region.id, wd, d.drivers).dateKey} />
      </div>
    <//>`;
  }

  function endCell(s, region, u) {
    const fe = App.sel.forecastEnd(s, region.id, u.wd, u.drivers);
    const late = fe.endMin - fe.deadlineMin;
    return html`<span class=${'bo-end ' + (fe.late ? 'bo-end-late' : 'bo-end-ok')}><strong class="ui-mono">${T.fmt.hm(fe.endMin)}</strong>
      <span class="ui-muted ui-mono">/ ${T.fmt.hm(fe.deadlineMin)}</span>
      <${Pill} tone=${fe.late ? 'full' : 'ok'} icon=${fe.late ? 'alert' : 'check'}>${fe.late ? late + ' Min zu spät' : 'pünktlich'}<//></span>`;
  }

  function Row({ s, region, u, onEdit }) {
    const wait = App.sel.waitlistFor(s, region.id, u.wd).length;
    const stLabel = App.config.labels.capStatus[u.status];
    return html`<div class="bo-cap-row" role="row">
      <div class="bo-cell bo-cell-day" role="cell"><strong>${T.WD_LONG[u.wd]}</strong><${StatusPill} effective=${u.effective} /><span class="ui-muted bo-cap-st">Status: ${stLabel}</span></div>
      <div class="bo-cell bo-cell-util" role="cell" data-l="Auslastung"><div class="bo-util-n"><strong>${u.abo} / ${u.max}</strong><span class="ui-muted">${Math.round(u.pct * 100)} %</span></div>
        <${Bar} value=${u.abo} max=${u.max} label=${'Auslastung ' + T.WD_LONG[u.wd]} /></div>
      <div class="bo-cell bo-cell-n" role="cell" data-l="Fahrer"><strong>${u.drivers}</strong></div>
      <div class="bo-cell bo-cell-n" role="cell" data-l="Stopps je Fahrer"><strong>${u.stopsPerDriver}</strong></div>
      <div class="bo-cell bo-cell-n" role="cell" data-l="Flex-Kontingent"><strong>${u.flexQuota}</strong></div>
      <div class="bo-cell bo-cell-end" role="cell" data-l="Tourende / Frist">${endCell(s, region, u)}</div>
      <div class="bo-cell bo-cell-n" role="cell" data-l="Wartende">${wait ? html`<${Pill} tone="info" icon="clock">${wait}<//>` : html`<span class="ui-muted">0</span>`}</div>
      <div class="bo-cell bo-cell-act" role="cell"><${Btn} size="sm" variant="ghost" icon="edit" onClick=${onEdit} aria-label=${T.WD_LONG[u.wd] + ' bearbeiten'}>Bearbeiten<//></div>
    </div>`;
  }

  function Kapazitaet() {
    const s = App.useStore();
    const region = B().regionOf(s);
    const [edit, setEdit] = useState(null);
    useEffect(() => {
      if (s.ui.capEdit != null) { setEdit(s.ui.capEdit); App.actions.setUi({ capEdit: null }); }
    }, [s.ui.capEdit]);
    const util = App.sel.utilization(s, region.id);
    const d = App.config.capacityDefaults;
    return html`<div class="bo-page">
      ${B().head('Kapazität', region.name + ': Fahrer, Plätze und Tourende je Wochentag')}
      ${region.planned ? html`<div class="ui-card-flat bo-nt"><${Icon} name="info" size=${18} /><span>${region.name} ist noch in Planung. Die Werte gelten ab dem Start.</span></div>` : null}
      <div class="ui-card bo-caps" role="table" aria-label="Kapazität je Wochentag">
        <div class="bo-cap-head" role="row"><span role="columnheader">Tag</span><span role="columnheader">Auslastung</span><span role="columnheader" class="c">Fahrer</span>
          <span role="columnheader" class="c">Stopps je Fahrer</span><span role="columnheader" class="c">Flex</span><span role="columnheader">Tourende / Frist</span><span role="columnheader" class="c">Wartende</span><span role="columnheader"></span></div>
        ${util.map(u => html`<${Row} key=${u.wd} s=${s} region=${region} u=${u} onEdit=${() => setEdit(u.wd)} />`)}
      </div>
      <section class="ui-card bo-sec bo-rule" aria-labelledby="bo-h-rule"><h2 id="bo-h-rule">So rechnet die Kapazität</h2>
        <ul class="bo-rules">
          <li><strong>Plätze</strong> = Fahrer × Stopps je Fahrer (Standard: ${d.stopsPerDriver.weekday} werktags, ${d.stopsPerDriver.weekend} am Wochenende).</li>
          <li><strong>Abo-Plätze</strong> = Plätze − Flex-Kontingent (Standard ${d.flexQuota}). Sind sie vergeben, gilt der Tag für neue Abos als ausgebucht.</li>
          <li><strong>Einmallieferungen</strong> nutzen jeden am Datum noch freien Platz, auch das Flex-Kontingent und Plätze von pausierten oder ausgesetzten Abos.</li>
          <li><strong>Tourende</strong> ist die Prognose für das nächste Datum dieses Wochentags. Zu spät heißt: nach der Frist (werktags ${T.fmt.hm(App.config.deadlineMin.weekday)}, am Wochenende ${T.fmt.hm(App.config.deadlineMin.weekend)}).</li>
        </ul></section>
      ${edit != null ? html`<${EditSheet} key=${edit} s=${s} region=${region} wd=${edit} onClose=${() => setEdit(null)} />` : null}
    </div>`;
  }

  App.views = App.views || {};
  App.views.backoffice = App.views.backoffice || {};
  App.views.backoffice.kapazitaet = Kapazitaet;
})(typeof window !== 'undefined' ? window : globalThis);
