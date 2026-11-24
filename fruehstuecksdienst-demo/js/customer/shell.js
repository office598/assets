/* Kunden-Shell: Kopf, Navigation, Push-Banner, Inhalt. Rendert App.views.customer[view]. */
(function (root) {
  const App = root.App = root.App || {};
  const { html, useState } = App.lib;
  const { Icon, Logo, ErrorBoundary, Placeholder, PushBanner, cx } = App.ui;

  const TABS = [
    { id: 'start', label: 'Start', icon: 'home' },
    { id: 'sortiment', label: 'Sortiment', icon: 'bread' },
    { id: 'lieferplan', label: 'Lieferplan', icon: 'bag' },
    { id: 'konto', label: 'Konto', icon: 'user' }
  ];

  function sumQty(o) {
    let n = 0;
    Object.keys(o || {}).forEach(k => { const v = o[k]; n += typeof v === 'number' ? v : sumQty(v); });
    return n;
  }
  const bagCount = (d) => (d ? sumQty(d.abo) + sumQty(d.flex) : 0);

  function ViewHost({ area, view }) {
    const V = App.views && App.views[area] && App.views[area][view];
    if (typeof V !== 'function') {
      return html`<div class="ui-wrap k-view"><${Placeholder} title=${'Ansicht „' + view + '“'} text="Diese Ansicht ist noch nicht gebaut." /></div>`;
    }
    const body = html`<${ErrorBoundary} key=${view} name=${area + '/' + view}><${V} /><//>`;
    return V.fullBleed ? body : html`<div class="ui-wrap k-view">${body}</div>`;
  }

  function CustomerShell({ s }) {
    const [dismissed, setDismissed] = useState({});
    const view = (s.ui && s.ui.customerView) || 'start';
    const cid = s.session && s.session.customerId;
    const go = (v) => { App.actions.setUi({ customerView: v }); if (root.scrollTo) root.scrollTo(0, 0); };

    let unread = 0, push = null;
    try {
      unread = App.sel.unreadPush ? (App.sel.unreadPush(s, cid) || []) : [];
      push = (Array.isArray(unread) ? unread : []).find(n => !dismissed[n.id] && (n.channel || 'push') === 'push') || null;
      unread = Array.isArray(unread) ? unread.length : Number(unread) || 0;
    } catch (e) { unread = 0; }

    let regionChip = null;
    const d = s.draft || {};
    if (d.regionId) {
      const r = (s.regions || []).find(x => x.id === d.regionId);
      if (r) regionChip = html`<button type="button" class="k-chip" title=${r.name + (d.plz ? ' · ' + d.plz : '')} onClick=${() => go('start')}><${Icon} name="pin" size=${14} /><span class=${d.plz ? 'k-chip-name' : ''}>${r.name}</span>${d.plz ? html`<span class="k-chip-plz">${d.plz}</span>` : null}</button>`;
    }
    const count = bagCount(d);
    const openPush = (n) => {
      App.actions.markRead(n.id, cid);
      const a = n.action;
      if (a && a.view) go(a.view);
    };

    const badgeFor = (id) => (id === 'konto' && unread ? unread : id === 'lieferplan' && count ? count : 0);

    return html`<div class="k-shell">
      <header class="k-head"><div class="ui-wrap k-head-in">
        <a class="k-logo" href="#kunde" onClick=${(e) => { e.preventDefault(); go('start'); }} aria-label="Startseite"><${Logo} size=${21} /></a>
        ${regionChip}
        <nav class="k-nav" aria-label="Hauptnavigation">
          ${TABS.map(t => html`<button type="button" key=${t.id} aria-current=${view === t.id ? 'page' : undefined} onClick=${() => go(t.id)}>${t.label}</button>`)}
        </nav>
        <span class="k-spacer"></span>
        <button type="button" class="k-iconbtn" aria-label=${'Nachrichten' + (unread ? ' (' + unread + ' ungelesen)' : '')} onClick=${() => go('konto')}>
          <${Icon} name="bell" size=${23} />${unread ? html`<span class="k-badge">${unread}</span>` : null}
        </button>
        <button type="button" class="k-iconbtn" aria-label=${'Sackerl' + (count ? ' (' + count + ' Artikel)' : '')} onClick=${() => go('lieferplan')}>
          <${Icon} name="bag" size=${23} />${count ? html`<span class="k-badge">${count}</span>` : null}
        </button>
      </div></header>
      ${push ? html`<div class="k-push" key=${push.id}><${PushBanner} notification=${push} onOpen=${openPush} onClose=${(n) => setDismissed({ ...dismissed, [n.id]: true })} /></div>` : null}
      <main class="k-main"><${ViewHost} area="customer" view=${view} /></main>
      <nav class="k-tabs" aria-label="Hauptnavigation">
        ${TABS.map(t => html`<button type="button" class="k-tab" key=${t.id} aria-current=${view === t.id ? 'page' : undefined} onClick=${() => go(t.id)}>
          <${Icon} name=${t.icon} size=${23} /><span>${t.label}</span>${badgeFor(t.id) ? html`<span class="k-badge">${badgeFor(t.id)}</span>` : null}
        </button>`)}
      </nav>
    </div>`;
  }

  App.shells = App.shells || {};
  App.shells.customer = CustomerShell;
  App.shells.ViewHost = ViewHost;
})(typeof window !== 'undefined' ? window : globalThis);
