// Baut js/core/photos.js und img/CREDITS.md aus den Bildnachweis-Listen in img/credits*.json.
// Aufruf: node tools/build-photos.mjs
// Reihenfolge: credits-*.json zuerst, credits.json zuletzt (überschreibt gleiche IDs). Einträge ohne Bilddatei werden übersprungen.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imgDir = join(root, 'img');
const files = readdirSync(imgDir).filter(f => /^credits.*\.json$/.test(f)).sort((a, b) => (a === 'credits.json') - (b === 'credits.json') || a.localeCompare(b));

const byId = new Map();
for (const f of files) {
  let list;
  try { list = JSON.parse(readFileSync(join(imgDir, f), 'utf8')); } catch (e) { console.error('Übersprungen (kein gültiges JSON):', f); continue; }
  for (const e of list) {
    if (!e || !e.id || !e.file) continue;
    const file = 'img/' + basename(e.file);
    if (!existsSync(join(root, file))) continue;
    byId.set(e.id, { id: e.id, file, title: clean(e.title), author: clean(e.author) || 'siehe Quelle', license: clean(e.license), source: e.source || '', standIn: !!e.standIn, note: clean(e.note) });
  }
}
function clean(s) { return String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }

const entries = [...byId.values()].sort((a, b) => a.file.localeCompare(b.file));
const photos = {};
for (const e of entries) photos[e.id] = e.file;
const credits = entries.map(({ id, title, author, license, source }) => ({ id, title, author, license, source }));

const js = `// Erzeugt von tools/build-photos.mjs aus img/credits*.json – nicht von Hand ändern.
(function (root) {
  const App = root.App = root.App || {};
  App.photos = ${JSON.stringify(photos, null, 2).replace(/\n/g, '\n  ')};
  App.photoCredits = ${JSON.stringify(credits, null, 2).replace(/\n/g, '\n  ')};
})(typeof window !== 'undefined' ? window : globalThis);
`;
writeFileSync(join(root, 'js/core/photos.js'), js);

const md = ['# Bildnachweise', '',
  'Alle Fotos stammen von Wikimedia Commons und wurden zugeschnitten und verkleinert. Die Lizenzen verlangen die Nennung von Urheber und Lizenz; die Demo zeigt sie im Fuß der Startseite unter „Bildnachweise“.', '',
  '| Datei | Motiv | Urheber | Lizenz | Quelle | Hinweis |', '|---|---|---|---|---|---|',
  ...entries.map(e => `| ${e.file} | ${e.title} | ${e.author} | ${e.license} | ${e.source} | ${[e.standIn ? 'Ersatzmotiv' : '', e.note].filter(Boolean).join('; ')} |`), ''].join('\n');
writeFileSync(join(imgDir, 'CREDITS.md'), md);
console.log(`${entries.length} Fotos im Manifest:`, entries.map(e => e.id).join(', '));
