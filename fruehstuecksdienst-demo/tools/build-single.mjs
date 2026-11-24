// Baut eine einzige, eigenständige HTML-Datei (alle Styles, Skripte und Fotos eingebettet),
// die ohne Server in jedem Browser läuft. Aufruf: node tools/build-single.mjs [--out dist/semmelengel-demo.html]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outRel = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'dist/semmelengel-demo.html';
const out = join(root, outRel);

const read = p => readFileSync(join(root, p), 'utf8');
const dataUri = p => 'data:image/jpeg;base64,' + readFileSync(join(root, p)).toString('base64');
// Bildpfade in JS durch eingebettete Daten ersetzen
const inlineImages = src => src.replace(/(['"])(img\/[A-Za-z0-9_.-]+\.jpe?g)\1/g, (m, q, p) => existsSync(join(root, p)) ? q + dataUri(p) + q : m);
// "</script" in eingebettetem Code entschärfen
const safeScript = src => src.replace(/<\/script/gi, '<\\/script');

let page = read('index.html');
let title = 'Semmelengel Frühstücksdienst';
page = page.replace(/<title>([\s\S]*?)<\/title>\s*/i, (m, t) => { title = t.trim(); return ''; });
page = page.replace(/<meta name="claude:[^>]*>\s*/gi, '');
page = page.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (m, p) => `<style>\n${read(p)}\n</style>`);
page = page.replace(/<script src="(js\/[^"]+)"><\/script>/g, (m, p) => `<script>\n${safeScript(inlineImages(read(p)))}\n</script>`);

const head = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<style>:root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
`;
const html = head + page + '\n</body>\n</html>\n';
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`${outRel}: ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB`);
