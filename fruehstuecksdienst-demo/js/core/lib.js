(function (root) {
  const App = root.App = root.App || {};
  // App.lib = htmPreact (h, html, render, Component, createContext, Hooks …)
  App.lib = root.htmPreact;
})(typeof window !== 'undefined' ? window : globalThis);
