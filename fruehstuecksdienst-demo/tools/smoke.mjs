// Rauchtest. node tools/smoke.mjs [--port N] [--only rolle:view,…]
import { createRequire } from 'node:module';
import { listen } from './serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const port = Number(opt('port', 4100));
const only = opt('only', '');

const ALL = [
  ['kunde', 'start'], ['kunde', 'sortiment'], ['kunde', 'lieferplan'], ['kunde', 'konto'],
  ['backoffice', 'uebersicht'], ['backoffice', 'kapazitaet'], ['backoffice', 'touren'], ['backoffice', 'baecker'],
  ['backoffice', 'kunden'], ['backoffice', 'warteliste'], ['backoffice', 'marketing'], ['backoffice', 'sortiment'],
  ['fahrer', 'tour'], ['konzept', 'konzept']
];
const targets = only ? only.split(',').map(s => s.trim().split(':')).filter(a => a[0]) : ALL;
const sizes = [[390, 844], [1280, 800]];

let srv = null;
try { srv = await listen(port); } catch { /* läuft schon */ }
const browser = await chromium.launch();
let failures = 0;
const ignore = t => /fonts\.g|fonts\.gstatic|ERR_NAME|ERR_INTERNET|ERR_CONNECTION|ERR_PROXY|ERR_TUNNEL|ERR_FAILED|Failed to load resource/.test(t);

for (const [w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !ignore(m.text())) errs.push('console: ' + m.text()); });
  page.on('requestfailed', r => { if (!ignore(r.url() + ' ' + (r.failure() && r.failure().errorText))) errs.push('request: ' + r.url()); });
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForSelector('#app *', { timeout: 8000 }).catch(() => errs.push('App nicht gemountet'));
  for (const [role, view] of targets) {
    const before = errs.length;
    const res = await page.evaluate(([role, view]) => {
      const A = window.App; if (!A || !A.actions) return { fatal: 'App.actions fehlt' };
      A.actions.go(role, view);
      if (role === 'backoffice') A.actions.loginBackoffice();
      if (role === 'fahrer') A.actions.loginDriver(0);
      if (role === 'backoffice' && view) A.actions.setUi({ backofficeView: view });
      if (role === 'kunde' && view) A.actions.setUi({ customerView: view });
      return {};
    }, [role, view]);
    if (res.fatal) errs.push(res.fatal);
    await page.waitForTimeout(250);
    const m = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      txt: (document.getElementById('app') || {}).innerText || '',
      boundary: !!document.querySelector('.ui-error')
    }));
    if (m.sw > m.cw + 1) errs.push(`horizontales Scrollen: ${m.sw} > ${m.cw}`);
    if (m.boundary) errs.push('Fehlerkasten (.ui-error) sichtbar');
    if (m.txt.trim().length < 20) errs.push('Seite praktisch leer');
    const bad = errs.slice(before);
    if (bad.length) failures += bad.length;
    console.log(`${bad.length ? 'FEHLER' : 'ok    '} ${w}x${h} ${role}:${view}` + (bad.length ? '\n   ' + bad.join('\n   ') : ''));
  }
  await ctx.close();
}
await browser.close();
if (srv) srv.close();
console.log(failures ? `\n${failures} Fehler` : '\nAlles in Ordnung');
process.exit(failures ? 1 : 0);
