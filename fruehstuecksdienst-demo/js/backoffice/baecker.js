/* Backoffice › Bäcker (V4): Bestellmengen, Bestellschluss, Bestelltext, Extras je Partner, Packliste je Tour. */
(function (root) {
  const App = root.App = root.App || {};
  const { html, useState } = App.lib;
  const { Icon, Btn, Pill, Segmented, Countdown, Empty, toast } = App.ui;
  const T = App.time;

  const catLabel = (c) => App.config.labels.cat[c] || c;
  const dayShort = (k) => T.WD[T.weekday(k)];

  /* Zeilen nach Partner gruppieren (Reihenfolge des Auftretens), innerhalb nach Kategorie */
  function groupRows(rows) {
    const groups = [];
    rows.forEach((r) => {
      let g = groups.find((x) => x.partner === r.product.partner);
      if (!g) { g = { partner: r.product.partner, cats: [], total: 0 }; groups.push(g); }
      let c = g.cats.find((x) => x.cat === r.product.cat);
      if (!c) { c = { cat: r.product.cat, rows: [] }; g.cats.push(c); }
      c.rows.push(r);
      g.total += r.qty;
    });
    return groups;
  }

  function orderText(g, dates, cutoff) {
    const head = dates.map((k) => dayShort(k) + ' ' + k.slice(8) + '.' + k.slice(5, 7) + '.').join(', ');
    const lines = ['Bestellung für ' + g.partner, 'Lieferung: ' + head, 'Bestellschluss: ' + T.fmt.rel(cutoff) + ' Uhr', ''];
    const w = Math.max(14, Math.max.apply(null, g.cats.map((c) => Math.max.apply(null, c.rows.map((r) => r.product.name.length)))) + 2);
    g.cats.forEach((c) => {
      lines.push(catLabel(c.cat).toUpperCase());
      c.rows.forEach((r) => {
        const cols = dates.length > 1 ? dates.map((k) => dayShort(k) + ' ' + String(r.byDate[k] || 0).padStart(3)).join('  ') + '  = ' : '';
        lines.push('  ' + r.product.name.padEnd(w) + cols + String(r.qty).padStart(4));
      });
      lines.push('');
    });
    lines.push('Summe: ' + g.total + ' Stück');
    return lines.join('\n');
  }

  function OrderTable({ g, dates }) {
    return html`<div class="ui-tablewrap bo-ordertable"><table class="ui-table">
      <thead><tr><th>Artikel</th>${dates.map((k) => html`<th key=${k} class="num">${T.fmt.day(k)}</th>`)}<th class="num">Summe</th></tr></thead>
      <tbody>${g.cats.map((c) => [
        html`<tr key=${'h' + c.cat} class="bo-cat-row"><td colSpan=${dates.length + 2}>${catLabel(c.cat)}</td></tr>`,
        c.rows.map((r) => html`<tr key=${r.product.id}><td>${r.product.name}</td>${dates.map((k) => html`<td key=${k} class="num">${r.byDate[k] || '–'}</td>`)}<td class="num"><strong>${r.qty}</strong></td></tr>`)
      ])}</tbody>
      <tfoot><tr><td><strong>Gesamt</strong></td>${dates.map((k) => html`<td key=${k} class="num"><strong>${g.cats.reduce((n, c) => n + c.rows.reduce((m, r) => m + (r.byDate[k] || 0), 0), 0)}</strong></td>`)}<td class="num"><strong>${g.total}</strong></td></tr></tfoot>
    </table></div>`;
  }

  function PackLists({ s, dates }) {
    const [pd, setPd] = useState(dates[0]);
    const [open, setOpen] = useState(0);
    const date = dates.indexOf(pd) >= 0 ? pd : dates[0];
    const region = App.sel.region(s, s.ui.boRegion);
    const head = html`<div class="bo-pack-head"><div><h3 class="bo-h3">Packliste je Tour</h3>
        <p class="ui-muted bo-small">${region ? region.name : ''} · Reihenfolge wie in der Tour: Stopp → Inhalt. Die Bäckerei packt in dieser Reihenfolge, der Fahrer lädt sie rückwärts ein.</p></div>
      ${dates.length > 1 ? html`<${Segmented} label="Liefertag der Packliste" value=${date} onChange=${(v) => { setPd(v); setOpen(0); }} options=${dates.map((k) => ({ value: k, label: T.fmt.day(k) }))} />` : null}</div>`;
    if (!region || region.planned) return html`<section class="bo-pack">${head}<${Empty} icon="bag" title="Keine Touren" text="Dieses Gebiet liefert noch nicht." /></section>`;
    const plan = App.sel.tourPlan(s, region.id, date);
    return html`<section class="bo-pack">${head}
      ${plan.stops === 0 ? html`<${Empty} icon="bag" title="Keine Stopps" text=${'Für ' + T.fmt.dayLong(date) + ' gibt es keine Lieferungen.'} />` : null}
      ${plan.tours.map((t, i) => {
        const on = open === i;
        const sum = t.stops.reduce((n, st) => n + Object.keys(st.items).reduce((m, id) => m + st.items[id], 0), 0);
        return html`<div class="bo-packtour" key=${i}>
          <button type="button" class="bo-packtour-btn" aria-expanded=${on ? 'true' : 'false'} onClick=${() => setOpen(on ? -1 : i)}>
            <strong>${t.driver.name}</strong><span class="ui-muted">${t.stops.length} Stopps · ${sum} Stück</span><span class="ui-grow"></span>
            <${Icon} name=${on ? 'chevron-up' : 'chevron-down'} size=${18} /></button>
          ${on ? html`<div class="ui-tablewrap bo-packwrap"><table class="ui-table bo-packtable">
            <thead><tr><th class="num">Nr.</th><th>Adresse</th><th>Inhalt</th></tr></thead>
            <tbody>${t.stops.map((st) => html`<tr key=${st.customerId}><td class="num ui-mono">${st.seq}</td>
              <td>${st.customer.street} ${st.customer.houseNo}<div class="ui-muted bo-small">${st.customer.name}</div></td>
              <td>${App.sel.itemsText(s, st.items, 99)}</td></tr>`)}</tbody></table></div>` : null}
        </div>`;
      })}
    </section>`;
  }

  function Baecker() {
    const s = App.useStore();
    const dates = App.sel.bakeryDates(s);
    if (!dates.length) {
      return html`<div class="bo-baecker"><h2 class="bo-h">Bäckerbestellung</h2><${Empty} icon="bread" title="Kein offener Bestellschluss" text="Aktuell ist keine Bestellung offen." /></div>`;
    }
    const rows = App.sel.bakeryOrder(s, dates);
    const groups = groupRows(rows);
    const cutoff = T.cutoffFor(dates[0]);
    const open = cutoff.getTime() > T.now().getTime();
    const sent = s.bakeryOrders[dates[0]];
    const bakeryName = (groups[0] && groups[0].partner) || 'Backstube Kornfeld';
    const main = groups.filter((g) => g.partner !== 'Hofladen');
    const extra = groups.filter((g) => g.partner === 'Hofladen');
    const total = rows.reduce((n, r) => n + r.qty, 0);
    const previewText = groups.map((g) => orderText(g, dates, cutoff)).join('\n\n— — —\n\n');

    const send = () => {
      App.actions.sendBakeryOrder(dates);
      toast('Bestellung an ' + bakeryName + ' gesendet.', 'ok');
    };

    return html`<div class="bo-baecker">
      <div class="bo-head"><div><div class="ui-eyebrow">Alle Gebiete</div>
        <h2 class="bo-h">Bäckerbestellung · ${dates.map(dayShort).join(' + ')}</h2></div></div>

      <div class=${'bo-deadline ' + (open ? 'is-open' : 'is-over')} role="status">
        <${Icon} name="clock" size=${26} />
        <div class="ui-grow"><div class="bo-deadline-t">Bestellschluss ${T.fmt.rel(cutoff)} Uhr</div>
          <div class="bo-small">${open ? html`<${Countdown} to=${cutoff} />` : 'Der Bestellschluss ist vorbei – Änderungen kommen nur noch von Hand.'}
            ${' · '}${total} Stück für ${dates.length === 1 ? T.fmt.dayLong(dates[0]) : dates.length + ' Liefertage'}</div></div>
        ${sent ? html`<${Pill} tone="ok" icon="check">gesendet um ${T.fmt.hm(new Date(sent.sentAt))}<//>` : html`<${Pill} tone="warn">noch nicht gesendet<//>`}
      </div>

      ${main.map((g) => html`<section class="bo-order" key=${g.partner}>
        <div class="bo-sec-head"><h3 class="bo-h3">${g.partner}</h3><span class="ui-muted bo-small">${g.total} Stück</span></div>
        <${OrderTable} g=${g} dates=${dates} /></section>`)}
      ${extra.map((g) => html`<section class="bo-order" key=${g.partner}>
        <div class="bo-sec-head"><h3 class="bo-h3">Extras vom ${g.partner}</h3><span class="ui-muted bo-small">${g.total} Stück · eigener Partner, getrennt ausgewiesen</span></div>
        <${OrderTable} g=${g} dates=${dates} /></section>`)}
      ${rows.length === 0 ? html`<${Empty} icon="bread" title="Noch keine Mengen" text="Für diese Tage liegen keine Bestellungen vor." />` : null}

      <section class="bo-preview ui-card">
        <div class="bo-sec-head"><h3 class="bo-h3">Vorschau Bestelltext</h3>
          <${Btn} variant=${sent ? 'ghost' : 'sun'} icon="send" onClick=${send} disabled=${rows.length === 0}>${sent ? 'Erneut an Bäckerei senden' : 'An Bäckerei senden'}<//></div>
        <div class="bo-pre-wrap" tabindex="0" role="region" aria-label="Bestelltext"><pre class="bo-pre">${previewText}</pre></div>
        <p class="ui-muted bo-small" style="margin:0">${sent ? 'Zuletzt gesendet um ' + T.fmt.hm(new Date(sent.sentAt)) + ' Uhr (' + T.fmt.day(T.key(new Date(sent.sentAt))) + ').' : 'So geht der Text an die Bäckerei. Das Senden ist in der Demo simuliert.'}</p>
      </section>

      <${PackLists} s=${s} dates=${dates} />
    </div>`;
  }

  App.views = App.views || {};
  App.views.backoffice = App.views.backoffice || {};
  App.views.backoffice.baecker = Baecker;
})(typeof window !== 'undefined' ? window : globalThis);
