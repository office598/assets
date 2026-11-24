/* STUB (V1): wird ersetzt. Registriert App.views.customer.start. */
(function (root) {
  const App = root.App = root.App || {};
  const { html } = App.lib;
  App.views = App.views || {};
  App.views.customer = App.views.customer || {};
  App.views.customer.start = function () {
    return html`<${App.ui.Placeholder} title="Platzhalter customer/start" text="Dieser Bereich wird von V1 gebaut." />`;
  };
})(typeof window !== 'undefined' ? window : globalThis);
