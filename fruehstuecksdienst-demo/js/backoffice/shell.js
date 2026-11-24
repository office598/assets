/* Backoffice-Shell: Anmeldung, Seitenleiste/Reiter, Gebietswahl. Rendert App.views.backoffice[view]. */
(function (root) {
  const App = root.App = root.App || {};
  const { html } = App.lib;
  const { Icon, Btn, Field, Tabs, Logo, ErrorBoundary, Placeholder } = App.ui;

  const NAV = [
    { id: 'uebersicht', label: 'Übersicht', icon: 'chart' },
    { id: 'kapazitaet', label: 'Kapazität', icon: 'calendar' },
    { id: 'touren', label: 'Touren', icon: 'route' },
    { id: 'baecker', label: 'Bäcker', icon: 'bread' },
    { id: 'kunden', label: 'Kunden', icon: 'users' },
    { id: 'warteliste', label: 'Warteliste', icon: 'clock' },
    { id: 'marketing', label: 'Marketing', icon: 'megaphone' },
    { id: 'sortiment', label: 'Sortiment', icon: 'basket' }
  ];

  function Login() {
    return html`<div class="bo-login"><form class="bo-login-card" onSubmit=${(e) => { e.preventDefault(); App.actions.loginBackoffice(); }}>
      <${Logo} size=${22} />
      <div><div class="ui-eyebrow">Backoffice</div><h1>Anmelden</h1></div>
      <p class="ui-muted" style="margin:0">Demo-Zugang: Die Felder sind bereits ausgefüllt.</p>
      <${Field} id="bo-user" label="E-Mail" type="email" value="disposition@semmelengel.example" autocomplete="off" />
      <${Field} id="bo-pass" label="Passwort" type="password" value="demo-demo" autocomplete="off" />
      <${Btn} type="submit" variant="sun" size="lg" full icon="lock">Anmelden<//>
    </form></div>`;
  }

  function BackofficeShell({ s }) {
    if (!s.ui.boAuthed) return html`<div class="bo-shell"><${Login} /></div>`;
    const view = s.ui.backofficeView || 'uebersicht';
    const region = s.ui.boRegion;
    const waiting = (s.waitlist || []).filter(w => w.regionId === region && w.status === 'waiting').length;
    const count = (id) => (id === 'warteliste' ? waiting : 0);
    const go = (v) => App.actions.setUi({ backofficeView: v });
    const V = App.views && App.views.backoffice && App.views.backoffice[view];
    const clock = App.time ? App.time.WD[(new Date(App.time.now()).getDay() + 6) % 7] + ' ' + App.time.fmt.hm(App.time.now()) : '';

    let body;
    if (typeof V !== 'function') body = html`<${Placeholder} title=${'Bereich „' + view + '“'} text="Dieser Bereich ist noch nicht gebaut." />`;
    else body = html`<${ErrorBoundary} key=${view} name=${'backoffice/' + view}><${V} /><//>`;

    return html`<div class="bo-shell"><div class="bo-frame">
      <div class="bo-top"><div class="ui-wrap ui-wrap-wide bo-top-in">
        <${Logo} size=${19} />
        <span class="ui-pill ui-pill-neutral ui-pill-mono">Backoffice</span>
        <span class="ui-grow"></span>
        <label class="bo-region"><span class="ui-label">Gebiet</span>
          <select id="bo-region" class="ui-input" value=${region} onChange=${(e) => App.actions.setUi({ boRegion: e.target.value })}>
            ${(s.regions || []).map(r => html`<option key=${r.id} value=${r.id} selected=${r.id === region}>${r.name}${r.planned ? ' (in Planung)' : ''}</option>`)}
          </select></label>
        <span class="ui-pill ui-pill-neutral ui-mono"><${Icon} name="clock" size=${14} />${clock}</span>
        <${Btn} variant="quiet" size="sm" icon="logout" onClick=${() => App.actions.logout('backoffice')}>Abmelden<//>
      </div></div>
      <nav class="bo-side" aria-label="Bereiche">
        ${NAV.map(n => html`<button type="button" class="bo-nav-item" key=${n.id} aria-current=${view === n.id ? 'page' : undefined} onClick=${() => go(n.id)}>
          <${Icon} name=${n.icon} size=${19} />${n.label}${count(n.id) ? html`<span class="bo-nav-count">${count(n.id)}</span>` : null}</button>`)}
      </nav>
      <div class="bo-body">
        <div class="bo-tabs"><div class="ui-wrap"><${Tabs} label="Bereiche" value=${view} onChange=${go}
          tabs=${NAV.map(n => ({ id: n.id, label: n.label, icon: n.icon, badge: count(n.id) || undefined }))} /></div></div>
        <div class="ui-wrap ui-wrap-wide bo-view">${body}</div>
      </div>
    </div></div>`;
  }

  App.shells = App.shells || {};
  App.shells.backoffice = BackofficeShell;
})(typeof window !== 'undefined' ? window : globalThis);
