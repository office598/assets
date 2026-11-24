/* Fahrer-Shell: PIN-Anmeldung, schmale Kopfleiste, Handy-Spalte. Rendert App.views.driver.tour. */
(function (root) {
  const App = root.App = root.App || {};
  const { html, useState } = App.lib;
  const { Btn, Field, Logo, ErrorBoundary, Placeholder } = App.ui;

  function Login({ s }) {
    const [pin, setPin] = useState('');
    const [idx, setIdx] = useState(0);
    const [err, setErr] = useState('');
    const submit = (e) => {
      e.preventDefault();
      if (!/^\d{4}$/.test(pin)) { setErr('Bitte geben Sie eine vierstellige PIN ein (Demo: jede PIN, z. B. 1234).'); return; }
      App.actions.loginDriver(idx);
    };
    return html`<form class="fa-login" onSubmit=${submit}>
      <${Logo} size=${22} />
      <div><div class="ui-eyebrow">Fahrer-App</div><h1>Guten Morgen</h1></div>
      <${Field} id="fa-driver" as="select" label="Wer fährt?" value=${idx} onChange=${(e) => setIdx(Number(e.target.value))}
        options=${(s.drivers || []).map((d, i) => ({ value: i, label: d.name }))} />
      <${Field} id="fa-pin" label="PIN" type="password" inputmode="numeric" maxlength="4" autocomplete="off" class="" value=${pin}
        hint="Demo: jede vierstellige PIN funktioniert." error=${err} onInput=${(e) => { setPin(e.target.value.replace(/\D/g, '')); setErr(''); }} />
      <${Btn} type="submit" variant="sun" size="lg" full>Tour starten<//>
    </form>`;
  }

  function DriverShell({ s }) {
    const V = App.views && App.views.driver && App.views.driver.tour;
    let inner;
    if (!s.ui.driverAuthed) inner = html`<${Login} s=${s} />`;
    else {
      const d = (s.drivers || [])[s.ui.driverIdx] || { name: 'Fahrer' };
      inner = html`<div class="fa-top"><strong>${d.name}</strong><span class="ui-grow"></span>
          <${Btn} variant="quiet" size="sm" icon="logout" onClick=${() => App.actions.logout('fahrer')}>Abmelden<//></div>
        <div class="fa-view">${typeof V === 'function'
          ? html`<${ErrorBoundary} name="fahrer/tour"><${V} /><//>`
          : html`<${Placeholder} title="Tour" text="Die Tour-Ansicht ist noch nicht gebaut." />`}</div>`;
    }
    return html`<div class="fa-shell"><div class="fa-phone">${inner}</div></div>`;
  }

  App.shells = App.shells || {};
  App.shells.driver = DriverShell;
})(typeof window !== 'undefined' ? window : globalThis);
