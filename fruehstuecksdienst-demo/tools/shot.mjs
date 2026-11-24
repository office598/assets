// Screenshot einer Ansicht. node tools/shot.mjs --port 4100 --role kunde --view start --out datei.png [--width 390 --height 844] [--dark] [--full] [--eval "JS"]
import { createRequire } from 'node:module';
import { listen } from './serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const flag = n => args.includes('--' + n);
const port = Number(opt('port', 4100));
const role = opt('role', 'kunde');
const view = opt('view', '');
const out = opt('out', 'shot.png');
const width = Number(opt('width', 390)), height = Number(opt('height', 844));
const evalJs = opt('eval', '');

let srv = null;
try { srv = await listen(port); } catch { /* läuft schon */ }
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme: flag('dark') ? 'dark' : 'light' });
const page = await ctx.newPage();
page.on('pageerror', e => console.error('PAGEERROR', e.message));
page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) console.error('CONSOLE', m.text()); });
await page.goto(`http://127.0.0.1:${port}/#${role}`);
await page.waitForSelector('#app *', { timeout: 8000 });
await page.evaluate(([role, view]) => {
  const A = window.App;
  if (A.actions.go) A.actions.go(role, view || undefined);
  if (role === 'backoffice' && A.actions.loginBackoffice) A.actions.loginBackoffice();
  if (role === 'fahrer' && A.actions.loginDriver) A.actions.loginDriver(0);
  if (view && role === 'backoffice') A.actions.setUi({ backofficeView: view });
  if (view && role === 'kunde') A.actions.setUi({ customerView: view });
}, [role, view]);
if (evalJs) await page.evaluate(evalJs);
await page.waitForTimeout(500);
await page.screenshot({ path: out, fullPage: flag('full') });
console.log('Gespeichert:', out);
await browser.close();
if (srv) srv.close();
