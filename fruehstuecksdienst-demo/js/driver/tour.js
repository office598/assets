/* STUB (V4): wird ersetzt. Registriert App.views.driver.tour. */
(function (root) {
  const App = root.App = root.App || {};
  const { html } = App.lib;
  App.views = App.views || {};
  App.views.driver = App.views.driver || {};
  App.views.driver.tour = function () {
    return html`<${App.ui.Placeholder} title="Platzhalter driver/tour" text="Dieser Bereich wird von V4 gebaut." />`;
  };
})(typeof window !== 'undefined' ? window : globalThis);
