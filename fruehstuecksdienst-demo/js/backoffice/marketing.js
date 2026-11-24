/* STUB (V3): wird ersetzt. Registriert App.views.backoffice.marketing. */
(function (root) {
  const App = root.App = root.App || {};
  const { html } = App.lib;
  App.views = App.views || {};
  App.views.backoffice = App.views.backoffice || {};
  App.views.backoffice.marketing = function () {
    return html`<${App.ui.Placeholder} title="Platzhalter backoffice/marketing" text="Dieser Bereich wird von V3 gebaut." />`;
  };
})(typeof window !== 'undefined' ? window : globalThis);
