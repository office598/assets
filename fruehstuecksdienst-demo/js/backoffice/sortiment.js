/* Backoffice › Sortiment (V3): Preise, Einkauf, Marge, aktiv/inaktiv, Kategorie, Partner. */
(function (root) {
  const App = root.App = root.App || {};
  const { html, useState, useEffect } = App.lib;
  const { Pill, Toggle, Field, Chip, Btn, Sheet, toast } = App.ui;
  const F = App.fmt;

  const B = () => App.boA;
  const parseNum = v => { const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : null; };
  const num2 = n => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');

  /* Zahlenfeld: schreibt erst bei Verlassen bzw. Enter */
  function MoneyInput({ id, label, value, onCommit }) {
    const [txt, setTxt] = useState(num2(value));
    const [bad, setBad] = useState(false);
    useEffect(() => { setTxt(num2(value)); setBad(false); }, [value]);
    const commit = () => {
      const n = parseNum(txt);
      if (n == null || n < 0) { setBad(true); return; }
      setBad(false);
      if (Math.abs(n - value) > 1e-9) onCommit(Math.round(n * 100) / 100); else setTxt(num2(value));
    };
    return html`<div class="bo-money"><label class="ui-sr" for=${id}>${label}</label>
      <input id=${id} class="ui-input ui-num" inputmode="decimal" value=${txt} aria-invalid=${bad ? 'true' : undefined}
        onInput=${e => setTxt(e.target.value)} onBlur=${commit} onKeyDown=${e => { if (e.key === 'Enter') e.target.blur(); }} /><span class="bo-money-eur" aria-hidden="true">€</span></div>`;
  }

  function TextInput({ id, label, value, onCommit }) {
    const [txt, setTxt] = useState(value || '');
    useEffect(() => setTxt(value || ''), [value]);
    return html`<div><label class="ui-sr" for=${id}>${label}</label>
      <input id=${id} class="ui-input" value=${txt} onInput=${e => setTxt(e.target.value)}
        onBlur=${() => { const v = txt.trim(); if (v && v !== value) onCommit(v); else setTxt(value || ''); }} onKeyDown=${e => { if (e.key === 'Enter') e.target.blur(); }} /></div>`;
  }

  function Row({ s, p }) {
    const cats = App.config.labels.cat;
    const eco = App.config.economics || {}, rate = eco.driverPerPiece || 0, net = p.price / (1 + (eco.vatRate || 0));
    const margin = App.sel.unitMargin(s, p), mp = net ? margin / net : 0;
    const tone = margin < 0 ? 'full' : mp < 0.3 ? 'warn' : 'ok';
    const up = patch => App.actions.updateProduct(p.id, patch);
    return html`<tr class=${p.active === false ? 'bo-off' : ''}>
      <td><strong>${p.name}</strong><div class="ui-muted bo-unit">${p.unit}${p.weekendOnly ? ' · nur Wochenende' : ''}${p.season ? ' · Saison' : ''}</div></td>
      <td><label class="ui-sr" for=${'pc-' + p.id}>Kategorie ${p.name}</label>
        <select id=${'pc-' + p.id} class="ui-input" value=${p.cat} onChange=${e => up({ cat: e.target.value })}>
          ${Object.keys(cats).map(k => html`<option key=${k} value=${k} selected=${k === p.cat}>${cats[k]}</option>`)}</select></td>
      <td><${TextInput} id=${'pp-' + p.id} label=${'Partner ' + p.name} value=${p.partner} onCommit=${v => up({ partner: v })} /></td>
      <td><${MoneyInput} id=${'pe-' + p.id} label=${'Verkaufspreis ' + p.name + ' in Euro'} value=${p.price} onCommit=${v => up({ price: v })} /></td>
      <td><${MoneyInput} id=${'pk-' + p.id} label=${'Einkaufspreis ' + p.name + ' in Euro'} value=${p.cost || 0} onCommit=${v => up({ cost: v })} /></td>
      <td class="num ui-mono">${F.eur(rate)}</td>
      <td class="num"><${Pill} tone=${tone} mono>${B().minus(F.eur(margin))} · ${B().minus(Math.round(mp * 100) + ' %')}<//></td>
      <td><${Toggle} id=${'pf-' + p.id} label=${(p.focus ? 'im Fokus: ' : 'nicht im Fokus: ') + p.name} checked=${!!p.focus} onChange=${v => up({ focus: v })} /></td>
      <td><${Toggle} id=${'pa-' + p.id} label=${(p.active === false ? 'inaktiv: ' : 'aktiv: ') + p.name} checked=${p.active !== false} onChange=${v => up({ active: v })} /></td>
    </tr>`;
  }

  function Sortiment() {
    const s = App.useStore();
    const [cat, setCat] = useState('');
    const [q, setQ] = useState('');
    const [dir, setDir] = useState(-1);
    const [prop, setProp] = useState(null);
    const cats = App.config.labels.cat;
    const term = q.trim().toLowerCase();
    const list = s.products.filter(p => (!cat || p.cat === cat) && (!term || p.name.toLowerCase().includes(term)))
      .sort((a, b) => dir * (App.sel.unitMargin(s, a) - App.sel.unitMargin(s, b)));
    const nFocus = s.products.filter(p => p.focus).length;
    const act = s.products.filter(p => p.active !== false);
    const avg = act.length ? act.reduce((a, p) => a + (p.price ? (p.price / (1 + ((App.config.economics || {}).vatRate || 0)) - (p.cost || 0) - ((App.config.economics || {}).driverPerPiece || 0)) / (p.price / (1 + ((App.config.economics || {}).vatRate || 0))) : 0), 0) / act.length : 0;
    return html`<div class="bo-page">
      ${App.boA.head('Sortiment', act.length + ' von ' + s.products.length + ' Artikeln aktiv · durchschnittliche Marge ' + B().minus(F.pct(avg)))}
      <div class="ui-card bo-focus"><div class="ui-grow"><strong>${nFocus} Artikel im Fokus</strong>
        <p class="ui-muted">Fokus-Artikel zeigt die Kunden-App zuerst und in „Dazu passt“. Ziel: teurere Stücke statt mehr Stücke, denn jedes Stück kostet Fahrervergütung.</p></div>
        <${Btn} variant="sun" icon="star" onClick=${() => setProp(App.sel.focusProposal(s, Math.max(nFocus, 5)))}>Fokus vorschlagen<//></div>
      <div class="ui-card bo-filters bo-filters-2">
        <${Field} id="so-q" label="Suche" type="search" placeholder="Artikel suchen" value=${q} onInput=${e => setQ(e.target.value)} />
        <div class="ui-field"><span class="ui-label">Kategorie</span><div class="ui-row bo-chips" role="group" aria-label="Kategorie">
          <${Chip} selected=${cat === ''} onClick=${() => setCat('')}>Alle<//>
          ${Object.keys(cats).map(k => html`<${Chip} key=${k} selected=${cat === k} onClick=${() => setCat(k)}>${cats[k]}<//>`)}</div></div>
      </div>
      <p class="ui-muted bo-hint">Verkaufspreis brutto (inkl. USt), alle anderen Beträge netto. Marge je Stück = Verkaufspreis netto − Einkauf − Fahrervergütung; negative Werte sind rot und bedeuten: Dieses Stück trägt die Fahrervergütung nicht, die Zustellgebühr gleicht es aus. ${B().estimateNote()}.</p>
      <div class="ui-tablewrap"><table class="ui-table bo-prod-table"><thead><tr><th>Artikel</th><th>Kategorie</th><th>Partner</th><th>Verkauf (brutto)</th><th>Einkauf (netto)</th><th class="num">Fahrer (netto)</th><th class="num" aria-sort=${dir > 0 ? 'ascending' : 'descending'}><button type="button" class="bo-sortbtn" onClick=${() => setDir(-dir)}>Deckungsbeitrag je Stück (netto) ${dir > 0 ? '↑' : '↓'}</button></th><th>Im Fokus</th><th>Status</th></tr></thead>
        <tbody>${list.map(p => html`<${Row} key=${p.id} s=${s} p=${p} />`)}</tbody></table></div>
      ${prop ? html`<${Sheet} open=${true} onClose=${() => setProp(null)} title="Fokus vorschlagen"
        footer=${[html`<${Btn} key="c" variant="ghost" onClick=${() => setProp(null)}>Abbrechen<//>`, html`<${Btn} key="o" variant="sun" icon="check" onClick=${() => {
          const ids = prop.map(x => x.id);
          s.products.forEach(p => { const want = ids.includes(p.id); if (!!p.focus !== want) App.actions.updateProduct(p.id, { focus: want }); });
          toast('Fokus gesetzt: ' + prop.length + ' Artikel', 'ok'); setProp(null); }}>Übernehmen<//>`]}>
        <p>Diese ${prop.length} Artikel bringen aktuell den höchsten Deckungsbeitrag je Stück. Mit „Übernehmen“ ersetzen sie die bisherige Auswahl.</p>
        <ul class="bo-list">${prop.map(p => html`<li key=${p.id}><strong>${p.name}</strong><span class="ui-muted">${p.focus ? 'schon im Fokus' : 'neu im Fokus'}</span><span class="ui-mono">${B().minus(F.eur(App.sel.unitMargin(s, p)))}</span></li>`)}</ul><//>` : null}
      ${!list.length ? html`<p class="ui-muted">Kein Artikel gefunden.</p>` : null}
    </div>`;
  }

  App.views = App.views || {};
  App.views.backoffice = App.views.backoffice || {};
  App.views.backoffice.sortiment = Sortiment;
})(typeof window !== 'undefined' ? window : globalThis);
