# Bauplan – Frühstücksdienst-Demo (Arbeitstitel „Semmelengel“)

Verbindliche Vorlage für alle, die an dieser Demo bauen. Wer ein Modul baut, liest Abschnitt 1–5 ganz und danach den eigenen Abschnitt in 6.

## 1. Ziel und Leitgeschichte

Klickbare, voll funktionsfähige Demo eines eigenständigen Frühstücks-Lieferdienstes: frisches Gebäck vom Partnerbäcker bis 06:30 Uhr (Sa/So bis 08:30 Uhr) an die Haustür. Rein statische Web-App mit Beispieldaten, kein Server. Vier Bereiche in einer Seite, oben umschaltbar:

| Bereich | Hash | Zweck |
|---|---|---|
| Kunden-App | `#kunde` | mobile-first Website/App für Endkunden |
| Backoffice | `#backoffice` | Disposition: Auslastung, Kapazität, Touren, Bäckerbestellung, Kunden, Warteliste, Marketing |
| Fahrer-App | `#fahrer` | mobile Stopp-Liste in Tour-Reihenfolge |
| Konzept | `#konzept` | Erklärung, geführte Demo, offene Fragen |

Die Demo muss diese Geschichte lückenlos tragen (das ist der Abnahmetest):

1. Kunde gibt PLZ 4040 ein → Wochenleiste: **Mo ausgebucht** (Warteliste), Di–Fr frei mit Aktion, Sa frei, So wenige Plätze.
2. Kunde setzt sich für Montag auf die Warteliste (Push) und bestellt ein Abo für Di + Sa – oder eine Einmallieferung.
3. Backoffice › Übersicht: Montag 107 % ausgelastet, Di–Fr rund 50 %.
4. Backoffice › Touren, Montag: 1 Fahrer → Tourende nach 06:30 (rot). Mit 2 Fahrern pünktlich.
5. Backoffice › Kapazität: Montag auf 2 Fahrer + Status „offen“ → alle Wartenden werden benachrichtigt.
6. Kunden-App: Push „Montag ist frei – 24 Stunden für Sie reserviert“ → Montag buchen.
7. Fahrer-App: Stopp abhaken → Kunde bekommt Push „Ihr Frühstück ist da“.

## 2. Technische Regeln (gelten für alle)

- **Kein Build-Schritt.** Klassische `<script>`-Dateien, ein globaler Namensraum `window.App`. UI mit Preact + htm aus `js/vendor/htm-preact.umd.js` (global `htmPreact`: `h, html, render, Component, createContext, useState, useReducer, useEffect, useLayoutEffect, useRef, useMemo, useCallback, useContext, useErrorBoundary`). Kein JSX, kein `Fragment` – mehrere Wurzeln als Array oder in einem Wrapper.
- Jede JS-Datei ist eine IIFE: `(function (root) { const App = root.App = root.App || {}; … })(typeof window !== 'undefined' ? window : globalThis);`
  Logikdateien unter `js/core/` (außer `ui.js`, `art.js`, `lib.js`) greifen beim Laden nicht auf DOM/`window` zu, damit sie in Node testbar sind.
- `index.html` ist ein **Artefakt-Fragment**: kein `<!doctype>`, `<html>`, `<head>`, `<body>`. Oben `<title>`, `<meta name="claude:viewport-fit-sides" content="cover">`, Font-Link, CSS-Links; dann `<div id="app"></div>`; dann Scripts. Lokale Vorschau über `tools/serve.mjs` (wickelt das Fragment in ein Dokument).
- **Verboten** (im Artefakt-Rahmen wirkungslos oder gesperrt): `eval`/`new Function`, `alert/confirm/prompt`, `window.print`, Downloads, `window.open`, `mailto:`/`tel:`-Links, iframes, externe Requests (einzige Ausnahme: Google-Fonts-Stylesheet), absolute URLs auf eigene Dateien, `#/pfad`-Hashes. Bestätigungen und Fehlermeldungen immer als eigenes UI (Sheet, Inline-Hinweis, Toast).
- `localStorage` nur über die Persistenz im Store, immer in try/catch.
- **CSS:** jede Farbe über ein Token aus `css/base.css`; keine Literal-Farben in Komponenten-CSS (Ausnahme: `transparent`, `currentColor`). Beide Themes müssen funktionieren. Layout mit flex/grid + `gap`. Seite darf bei 390 px nie horizontal scrollen; breite Tabellen in eigenem `overflow-x:auto`-Container. Klassen mit Bereichs-Präfix: `k-` (Kunde), `bo-` (Backoffice), `fa-` (Fahrer), `kz-` (Konzept), `ui-` (geteilt).
- Höhe einer Ein-Bildschirm-Ansicht mit `height:100%`, nie `100vh`. Fixierte Leisten addieren die passenden `env(safe-area-inset-*, 0px)`.
- Jedes Formularfeld hat eine stabile `id` und ein `<label>`. Fokus sichtbar. `prefers-reduced-motion` respektieren.
- **Sprache:** Deutsch (Österreich), Anrede „Sie“. Echte Umlaute (UTF-8). Vokabular: Semmel, Weckerl, Gebäck, Sackerl, Türschnalle, Topfen, Marille, Jänner. Kurze, konkrete Sätze. Keine Emojis als Icons, kein Lorem Ipsum, **keine erfundenen Kundenstimmen**, keine Namen/Marken fremder Unternehmen (auch nicht des bisherigen Franchise-Systems).
- Dateien anderer Zuständiger nicht verändern. Fehlt etwas in einer fremden Datei: im Abschlussbericht melden, nicht selbst umbauen. **Kein `git commit`, kein `git push`.**
- JS-Dateien möglichst unter 700 Zeilen; lieber in mehrere Komponentenfunktionen gliedern.

## 3. Dateien und Zuständigkeit

```
fruehstuecksdienst-demo/
  index.html                         K2
  css/base.css                       K2   Tokens, Reset, Typo, alle ui-* Komponenten, Shell-Layouts
  css/customer-start.css             V1
  css/customer-order.css             V2
  css/backoffice-a.css               V3
  css/backoffice-b.css               V4
  css/driver.css                     V4
  css/concept.css                    V5
  js/vendor/htm-preact.umd.js        vorhanden, nicht ändern
  js/core/lib.js                     K2   App.lib = htmPreact
  js/core/config.js                  K1
  js/core/time.js                    K1   App.time, App.fmt
  js/core/data.js                    K1   App.data.seed()
  js/core/routing.js                 K1   App.routing
  js/core/store.js                   K1   App.store, App.useStore, App.sel, App.actions
  js/core/art.js                     V6   App.art (Illustrationen)
  js/core/ui.js                      K2   App.ui (geteilte Komponenten)
  js/customer/shell.js               K2
  js/customer/start.js               V1   App.views.customer.start
  js/customer/sortiment.js           V1   App.views.customer.sortiment
  js/customer/lieferplan.js          V2   App.views.customer.lieferplan
  js/customer/konto.js               V2   App.views.customer.konto
  js/backoffice/shell.js             K2
  js/backoffice/uebersicht.js        V3   App.views.backoffice.uebersicht
  js/backoffice/kapazitaet.js        V3   …kapazitaet
  js/backoffice/warteliste.js        V3   …warteliste
  js/backoffice/marketing.js         V3   …marketing
  js/backoffice/kunden.js            V3   …kunden
  js/backoffice/sortiment.js         V3   …sortiment
  js/backoffice/touren.js            V4   …touren
  js/backoffice/baecker.js           V4   …baecker
  js/driver/shell.js                 K2
  js/driver/tour.js                  V4   App.views.driver.tour
  js/concept/konzept.js              V5   App.views.concept.konzept
  js/app.js                          K2   Demo-Leiste, Rollenwechsel, Mount
  img/                               (Fotos, später) + CREDITS.md
  tools/serve.mjs, smoke.mjs, shot.mjs   K2
  tools/test-core.mjs                K1
  README.md                          V5
```

K2 legt für alle V-Dateien **Stubs** an (JS: registriert eine Platzhalter-Komponente; CSS: leere Datei mit Kopfkommentar) und trägt alle Dateien in fester Reihenfolge in `index.html` ein. V-Agenten ersetzen nur den Inhalt ihrer Dateien. Die Shells rendern einen Platzhalter, wenn eine View fehlt – die Seite bricht nie, weil ein Modul noch nicht fertig ist.

Script-Reihenfolge: vendor → `core/lib` → `core/config` → `core/time` → `core/data` → `core/routing` → `core/store` → `core/art` → `core/ui` → alle Views → Shells → `app.js`.

View-Vertrag: `App.views.<bereich>.<name>` ist eine Preact-Komponente ohne Pflicht-Props. Sie liest `const s = App.useStore()` und ruft `App.actions.*`. Sie rendert nur ihren Inhalt (keine eigene Kopf-/Fußleiste, kein eigener Seiten-Gutter – den setzt die Shell).

## 4. Kern-API (Vertrag zwischen Logik und Oberfläche)

Wochentage sind überall **0 = Montag … 6 = Sonntag**. Datumsschlüssel sind lokale Strings `'YYYY-MM-DD'`. Minuten-Zeiten sind Minuten seit Mitternacht. Enums sind englisch/ASCII, Beschriftungen kommen aus `App.config.labels`.

### 4.1 `App.config`

```js
App.config = {
  brand: { name: 'Semmelengel', claim: 'Frisches Gebäck an Ihrer Tür. Noch bevor Sie aufstehen.', domain: 'semmelengel.example' },
  cutoff: { h: 16, m: 30 },                         // Bestellschluss am Vortag; für Sa, So und Mo gilt Freitag
  deadlineMin: { weekday: 390, weekend: 510 },      // 06:30 / 08:30
  tour: { startMin: { weekday: 240, weekend: 300 }, speedKmh: 30, roadFactor: 1.3, serviceMin: 1.3 }, // serviceMin von K1 kalibriert
  capacityDefaults: { stopsPerDriver: { weekday: 60, weekend: 95 }, flexQuota: 6, fewThreshold: 8 },
  fees: { abo: 1.20, flex: 2.40, flexMinOrder: 6.00 },
  promo: { weakBelowPct: 0.6, weakDayFreeWeeks: 4, referralCredit: 5 },
  reserveHours: 24,
  season: { id: 'nikolo', title: 'Nikolo-Sackerl', dateKey: '2026-12-06', productId: 'box-nikolo' },
  photos: {},                                       // Manifest id → Pfad, z. B. { 'kaisersemmel': 'img/p-kaisersemmel.jpg', hero: 'img/hero.jpg' }. Leer = Illustrationen.
  labels: {
    effective: { free: 'frei', few: 'wenige Plätze', full: 'ausgebucht', closed: 'gesperrt', reserved: 'für Sie reserviert', booked: 'gebucht', planned: 'in Planung' },
    capStatus: { open: 'Offen', waitlist: 'Warteliste', closed: 'Gesperrt' },
    cat: { gebaeck: 'Semmeln & Weckerl', suess: 'Süßes', brot: 'Brot', extras: 'Frühstücks-Extras', boxen: 'Frühstücks-Sackerl' },
    placement: { tuerschnalle: 'Sackerl an die Türschnalle', 'vor-der-tuer': 'Vor die Wohnungstür', box: 'In die Zeitungsbox', hinweis: 'Eigener Hinweis' }
  }
};
```

### 4.2 `App.time` und `App.fmt`

```js
App.time = {
  WD: ['Mo','Di','Mi','Do','Fr','Sa','So'], WD_LONG: ['Montag', … ,'Sonntag'],
  now(),                    // Date; echte Zeit + Demo-Verschiebung
  setOffset(ms), getOffset(), setNow(dateOrNull),   // setNow: absolute Übersteuerung nur für Tests
  presets: [ { id:'echt', label:'Echtzeit' }, { id:'fr-1500', label:'Freitag 15:00 · kurz vor Bestellschluss' },
             { id:'fr-1700', label:'Freitag 17:00 · Bestellschluss vorbei' }, { id:'mo-0500', label:'Montag 05:00 · Tour läuft' } ],
  offsetForPreset(id),      // ms bis zum nächsten solchen Zeitpunkt in der Zukunft (max. 7 Tage)
  key(date), fromKey(k), addDays(k, n), today(), weekday(k), isWeekend(k),
  cutoffFor(k),             // Date. Di–Fr: Vortag 16:30. Sa, So, Mo: der Freitag davor 16:30.
  isOpenFor(k),             // now() < cutoffFor(k)
  deadlineMin(k),           // 390 oder 510
  nextDates(n, fromKey),    // n Schlüssel ab morgen (bzw. ab fromKey+1)
  nextDateForWeekday(wd),   // nächstes Datum mit diesem Wochentag, dessen Bestellschluss noch offen ist
  fmt: { day(k) /* 'Di, 24.11.' */, dayLong(k) /* 'Dienstag, 24. November' */, hm(dateOrMin) /* '06:30' */,
         rel(date) /* 'heute 16:30' | 'morgen 16:30' | 'Fr, 27.11. 16:30' */, left(date) /* 'noch 2 Std 13 Min' | 'vorbei' */, dateTime(date) }
};
App.fmt = { eur(n) /* '€ 1,20' */, num(n), pct(x) /* 0.52 → '52 %' */ };
```

### 4.3 Zustand (`App.store.getState()`)

```js
{
  tick, clockPreset,
  ui: { role:'kunde'|'backoffice'|'fahrer'|'konzept', customerView:'start'|'sortiment'|'lieferplan'|'konto',
        backofficeView:'uebersicht'|'kapazitaet'|'touren'|'baecker'|'kunden'|'warteliste'|'marketing'|'sortiment',
        boAuthed:false, boRegion:'nord', boDate:<Schlüssel>, driverAuthed:false, driverIdx:0, driverDate:<Schlüssel> },
  session: { customerId:'me' },                      // 'me' = Besucher dieser Demo, 'c-huber' = Bestandskundin
  regions:  [ { id, name, plz:[…], planned:false, neededPrereg?, bakery:{ name, since, x, y }, area:{ x0,y0,x1,y1 }, clusters:[ { id, name, x, y } ] } ],
  drivers:  [ { id, name } ],
  capacity: { [regionId]: [ { status:'open'|'waitlist'|'closed', drivers, stopsPerDriver, flexQuota, autoNotify:true } ×7 ] },
  products: [ { id, cat, name, desc, price, unit, tags:[…], weekendOnly?, chilled?, season?, active:true, partner } ],
  customers:[ { id, name, street, houseNo, plz, city, regionId, x, y, placement, note, email, phone, since, notify:{ push, email }, kind:'abo'|'flex', registered:true } ],
  subs:     [ { id, customerId, weekday, items:{ [productId]: qty }, since } ],
  skips:    { [customerId]: [ dateKey, … ] },
  pauses:   [ { id, customerId, from, to } ],
  flexOrders:[ { id, customerId, dateKey, items, createdAt, status:'confirmed'|'cancelled' } ],
  waitlist: [ { id, regionId, weekday /* 0–6, null = Gebiets-Vormerkung */, customerId, contact:{ name, plz, email }, channel:'push'|'email',
                createdAt, status:'waiting'|'notified'|'booked'|'expired', notifiedAt, reservedUntil } ],
  notifications:[ { id, customerId /* oder null */, contactName, channel:'push'|'email', kind:'waitlist'|'delivery'|'promo'|'order'|'system',
                    title, body, createdAt, read:false, action:{ view, weekday } } ],
  campaigns:[ { id, title, body, channel, segment, sentAt, recipients } ],
  deliveries:{ [dateKey]: { [customerId]: { status:'delivered'|'problem', at, reason } } },
  bakeryOrders:{ [dateKey]: { sentAt } }, toursSent:{ [regionId+'|'+dateKey]: sentAt },
  draft: { plz:'', regionId:null, mode:'abo'|'flex', abo:{ [weekday]: { [productId]: qty } }, flexDate:null, flex:{ [productId]: qty },
           target:null /* { type:'abo', weekdays:[…] } | { type:'flex' } – aktives Sackerl im Sortiment */,
           step:'plan'|'adresse'|'zahlung'|'fertig', address:{ name, street, houseNo, plz, city, email, phone },
           placement:'tuerschnalle', note:'', notify:{ push:true, email:true }, payment:'sepa'|'karte', lastOrder:null }
}
```

`App.useStore()` gibt den ganzen Zustand zurück und rendert die Komponente bei jeder Änderung neu. Aktionen ersetzen geänderte Zweige durch neue Objekte (nicht in-place mutieren).

### 4.4 Selektoren `App.sel.*(state, …)` – alle rein

| Selektor | Rückgabe |
|---|---|
| `regionForPlz(s, plz)` | `null` bei ungültigem Format, sonst `{ region, demoMapped }`. Bekannte PLZ → ihre Region. Jede andere 4-stellige PLZ wird nach letzter Ziffer zugeordnet (0–5 nord, 6–8 sued, 9 west) mit `demoMapped:true`. |
| `product(s, id)`, `customer(s, id)`, `region(s, id)` | Datensatz |
| `cap(s, regionId, wd)` | `{ status, drivers, stopsPerDriver, flexQuota, autoNotify, max, abo, freeAbo, pct, effective }`. `max = drivers × stopsPerDriver`; `abo` = Kunden mit Abo an diesem Wochentag; `freeAbo = max − flexQuota − abo`; `pct = abo / max`. `effective`: `planned` (Region in Planung) · `closed` (Status closed) · `full` (Status waitlist oder freeAbo ≤ 0) · `few` (freeAbo ≤ fewThreshold) · sonst `free`. |
| `dayStatusFor(s, regionId, wd, customerId)` | wie `cap().effective`, aber `booked`, wenn der Kunde an dem Wochentag schon ein Abo hat, und `reserved`, wenn sein Wartelisten-Eintrag `notified` ist und `reservedUntil` in der Zukunft liegt. |
| `weakDays(s, regionId)` | Wochentage mit `pct < weakBelowPct` und `effective === 'free'` (bekommen die Aktion „Zustellung 4 Wochen gratis“). |
| `utilization(s, regionId)` | 7 × `cap()` plus `wd`. |
| `stopsOn(s, regionId, dateKey)` | `[ { customerId, customer, items, kinds:['abo'|'flex'], total } ]` – Abos des Wochentags ohne Aussetzer/Pausen, plus bestätigte Einmallieferungen; je Kunde ein Stopp. |
| `flexInfo(s, regionId, dateKey, customerId)` | `{ state:'free'|'few'|'full'|'cutoff'|'closed'|'planned', free, cutoff, alreadyStop }`. `free = max − stopsOn().length`. Hat der Kunde an dem Tag schon einen Stopp, ist es bis Bestellschluss immer `free`. `few` bei `free ≤ 3`. |
| `tourPlan(s, regionId, dateKey, driversOverride)` | `{ tours:[ { driver:{ id, name }, stops:[ { customerId, customer, items, kinds, seq, etaMin, legKm, delivery } ], km, startMin, endMin, late } ], stops, km, endMin, deadlineMin, late }` (memoisiert). |
| `forecastEnd(s, regionId, wd, drivers)` | `{ endMin, deadlineMin, late }` für das nächste Datum mit diesem Wochentag. |
| `upcoming(s, customerId, n)` | nächste n Liefertage des Kunden: `[ { dateKey, wd, items, total, fee, kinds, skipped, paused, cutoff, changeable, delivery } ]`. |
| `weeklyPlan(s, customerId)` | `[ { wd, items, total } ]` der Abos. |
| `priceOf(s, items)`, `itemsText(s, items, max)` | Summe · „4 Kaisersemmeln, 2 Buttercroissants“ |
| `feeFor(s, { mode, wd, regionId, customerId })` | Zustellgebühr; 0 an Aktionstagen für Neukunden (`weakDays`), sonst `fees.abo` bzw. `fees.flex`. |
| `draftSummary(s)` | `{ deliveries:[ { wd | dateKey, items, total, fee } ], perWeek, firstDelivery, cutoff, valid, problems:[…] }` |
| `bakeryOrder(s, dateKeys, regionId)` | `[ { product, qty, byDate:{ [dateKey]: qty } } ]`, nach Kategorie sortiert. `bakeryDates(s)` liefert die Daten des nächsten Bestellschlusses (Fr: Sa+So+Mo). |
| `inbox(s, customerId)`, `unreadPush(s, customerId)` | Nachrichten, neueste zuerst |
| `waitlistFor(s, regionId, wd)`, `waitPosition(s, customerId, regionId, wd)` | Einträge · Position |
| `kpis(s, regionId)` | `{ households, weeklyStops, weeklyRevenue, utilMonday, utilMidweek, waitlist, flexNext7 }` |
| `campaignIdeas(s, regionId)` | `[ { id, title, reason, segment, channel, suggestedText, recipients } ]` aus der Auslastung berechnet |
| `segmentCustomers(s, segment)` | Empfängerliste für Kampagnen (`all`, `monday-only`, `weekend-only`, `no-midweek`, `waitlist`) |

### 4.5 Aktionen `App.actions.*` – alle synchron

- Demo/Navigation: `go(role, view)`, `tick()`, `setClock(presetId)`, `resetDemo()`, `loginBackoffice()`, `loginDriver(idx)`, `logout(role)`, `switchCustomer(id)`, `setUi(patch)`.
- Entwurf: `draftCheckPlz(plz)` → Ergebnis von `regionForPlz` und setzt `draft.plz/regionId`; `setDraft(patch)`; `draftToggleDay(wd)`; `draftSetQty(target, productId, qty)` mit `target = { wd } | { flex:true }`; `draftCopyDay(fromWd, toWd)`; `draftSetFlexDate(dateKey)`; `placeOrder()` → `{ ok, problems, firstDelivery, orderNo }`. `placeOrder` registriert den Besucher (`registered:true`, Koordinaten im Gebiet), legt Abos bzw. Einmallieferung an, erzeugt eine Bestätigung (`kind:'order'`), setzt Wartelisten-Einträge für gebuchte Tage auf `booked`, leert den Entwurf, setzt `draft.step='fertig'`.
- Kunde: `joinWaitlist({ regionId, weekday, channel, customerId, contact })`, `leaveWaitlist(id)`, `skipDate(customerId, dateKey)`, `unskipDate(…)`, `setPause(customerId, from, to)`, `clearPause(id)`, `setSubQty(customerId, wd, productId, qty)`, `removeSubDay(customerId, wd)`, `cancelFlex(id)`, `markRead(idOrAll, customerId)`, `updateCustomer(id, patch)`.
- Backoffice: `setCapacity(regionId, wd, patch)` → `{ notified, push, email }` (wird ein Tag `open` und ist `freeAbo > 0`, werden bei `autoNotify` die ersten `freeAbo` Wartenden benachrichtigt: Status `notified`, `reservedUntil = now + reserveHours`, je eine Nachricht `kind:'waitlist'` mit `action:{ view:'lieferplan', weekday }`); `notifyWaitlist(regionId, wd, count)`; `sendCampaign({ title, body, channel, segment })` → `{ recipients }`; `updateProduct(id, patch)`; `sendBakeryOrder(dateKeys)`; `sendTour(regionId, dateKey)`.
- Fahrer: `markStop(dateKey, customerId, 'delivered'|'problem', reason)` (bei `delivered` Push `kind:'delivery'` an den Kunden, sofern Push aktiv), `undoStop(dateKey, customerId)`.

Persistenz: `localStorage['fd-demo-v1'] = { seedDay, state }`, entprellt. Beim Start neu säen, wenn nichts da ist, der Tag gewechselt hat oder das Lesen scheitert.

### 4.6 Beispieldaten (`App.data.seed()`), deterministisch (fester Seed)

- Welt 12 × 8 km (x nach rechts, y nach unten). Regionen: **nord** (PLZ 4020, 4040; Fläche x 0.6–5.6, y 0.6–4.6), **sued** (4030, 4050; x 6.2–11.2, y 3.4–7.4), **west** (4060; `planned:true`, `neededPrereg:25`; x 0.6–4.6, y 5.2–7.6). Je Region 4–5 Siedlungs-Cluster mit Namen (z. B. Sonnenhang, Altstadt, Am Bach, Lindenfeld, Bahnhofsviertel) und passenden Straßennamen. Partnerbäckerei je Region mittig: „Backstube Kornfeld“ (seit 1928).
- Abo-Stopps je Wochentag **exakt**: nord `[64, 31, 29, 33, 36, 70, 82]`, sued `[44, 22, 20, 24, 27, 51, 58]`. Kundenpool nord ca. 140, sued ca. 95; dazu je ca. 15 reine Flex-Kunden.
- Kapazität: Standardwerte; **nord Montag `status:'waitlist'`**; alles andere `open`.
- Einmallieferungen: je 1–4 für die nächsten 7 Tage (nord und sued).
- Warteliste: nord Montag 6 Interessenten (4 Push, 2 E-Mail); west 14 Gebiets-Vormerkungen.
- `me`: Besucher, `registered:false`. `c-huber`: Maria Huber, Lindenweg 12, nord, Abo Mi/Sa/So, 3 Nachrichten im Postfach.
- Fahrer: Jovana, Tobias, Erwin. Zwei vergangene Kampagnen. Ist die Deadline von heute schon vorbei, sind die heutigen Stopps als zugestellt verbucht.
- Kalibrierung (K1 stellt `serviceMin` so ein und prüft es im Test): nord Montag 1 Fahrer endet 06:36–06:55; mit 2 Fahrern spätestens 05:40; Di–Fr spätestens 05:45; Sonntag 07:45–08:20.
- Sortiment (id · Kategorie · Name · Preis; `desc` je ein Satz):
  - gebaeck: `kaisersemmel` Kaisersemmel 0,55 · `handsemmel` Bio-Handsemmel 0,85 · `kornweckerl` Kornweckerl 0,95 · `salzstangerl` Salzstangerl 0,90 · `mohnflesserl` Mohnflesserl 0,95 · `laugenbreze` Laugenbreze 1,20 · `dinkelweckerl` Dinkel-Vollkornweckerl 1,10
  - suess: `buttercroissant` Buttercroissant 1,60 · `topfengolatsche` Topfengolatsche 1,90 · `nussschnecke` Nussschnecke 2,10 · `marillenkrapfen` Marillenkrapfen 1,70 · `briochestriezel` Butter-Briochestriezel 4,90 (`weekendOnly`)
  - brot: `bauernbrot` Bauernbrot 500 g 3,40 · `dinkelbrot` Dinkelvollkornbrot 500 g 3,90 · `nussbrot` Nussbrot 400 g 4,20
  - extras (Partner „Hofladen“, großteils `chilled`): `teebutter` Teebutter 250 g 2,90 · `marillenmarmelade` Marillenmarmelade 220 g 4,50 · `bluetenhonig` Blütenhonig 250 g 5,90 · `beinschinken` Beinschinken 100 g 2,90 · `bergkaese` Bergkäse 150 g 3,80 · `freilandeier` Freilandeier 6 Stück 3,20 · `frischmilch` Frischmilch 1 l Glasflasche 1,90 · `orangensaft` Orangensaft frisch gepresst 0,5 l 3,90 · `naturjoghurt` Naturjoghurt 250 g 1,40 · `liptauer` Liptauer 150 g 2,60 · `roestkaffee` Röstkaffee 250 g 7,90
  - boxen: `box-sonntag` Sonntagsfrühstück für 2 14,90 · `box-familie` Familienfrühstück für 4 24,90 · `box-buero` Büro-Frühstück für 10 59,00 · `box-nikolo` Nikolo-Sackerl 12,90 (`season` bis 6.12.)

### 4.7 `App.routing`

`plan({ depot:{x,y}, stops:[{id,x,y}], drivers, startMin, speedKmh, roadFactor, serviceMin })` → `{ tours:[ { stops:[ { id, seq, etaMin, legKm } ], km, endMin } ], km, endMin }`. Aufteilung auf mehrere Fahrer per Winkel-Sweep um das Depot in gleich große Sektoren; Reihenfolge Nearest-Neighbour ab Depot, dann 2-opt (offener Pfad). Distanz = Luftlinie × `roadFactor`. Rein und deterministisch.

## 5. Gestaltung

**Idee „Morgengrauen“.** Der Dienst passiert zwischen Nacht und Morgen. Hell = kühles Morgenlicht mit nachtblauer Schrift, ein warmer Sonnenaufgangs-Akzent, Wärme kommt von Gebäck und Packpapier. Dunkel = kurz vor Sonnenaufgang. Signatur-Element ist die **Wochenleiste aus Türanhängern**: sieben Anhänger (Loch oben, unten rund) mit Wochentag, Status und Lieferzeit. Zweites Motiv: der **Lieferzettel** (Packpapier-Fläche, Mono-Schrift, gestrichelte Abrisskante) für Bestätigungen, Stopps und Zusammenfassungen. Bewusst nicht: Creme-Hintergrund mit Serifenschrift, alles zentriert, überall gleiche Karten, Akzentbalken an Karten, Verlaufs-Hero in Lila/Blau.

Tokens (K2 übernimmt sie wörtlich nach `css/base.css`; `:root` hell, dann `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … color-scheme: dark } }` und identisch `:root[data-theme="dark"] { … color-scheme: dark }`):

```
Token            hell        dunkel
--bg             #F3F6FA     #0E1424
--surface        #FFFFFF     #172038
--surface-2      #E8EDF5     #1F2A47
--ink            #141B33     #EEF2FB
--ink-2          #3A4563     #C9D2E8
--muted          #5E6987     #97A3C2
--line           #D5DCE9     #2C3858
--night          #141B33     #090D19      dunkle Bänder: Demo-Leiste, Footer
--on-night       #F3F6FA     #EEF2FB
--night-2        #232D4F     #172038
--sun            #FF8A3D     #FF9550      Akzentfläche (Haupt-CTA)
--sun-ink        #3B1A05     #2B1203      Text auf --sun
--sun-text       #B8480B     #FFAB73      Akzent als Text/Link
--butter         #FFD56B     #FFD56B
--butter-soft    #FFF3CF     #3A3115
--kraft          #C7A67A     #B8976B      Packpapier
--kraft-soft     #F1E6D3     #2E2618
--kraft-ink      #5F4526     #E9D3B0
--ok             #167C52     #4FCB92
--ok-soft        #DDF3E8     #12352A
--warn           #8F5500     #F2B552
--warn-soft      #FCEBCB     #3A2C0F
--full           #B93A32     #F58379
--full-soft      #FADFDC     #431D1B
--info           #2B5FB8     #8DB4F5
--info-soft      #DFE9FA     #18294A
--crust-1        #F2C98A     #F2C98A      Illustrationen: Kruste hell
--crust-2        #D99A4E     #D99A4E
--crust-3        #A8672C     #A8672C
--crust-4        #6E3F17     #6E3F17
--crumb          #FBEFD5     #FBEFD5
--berry          #B4344D     #D0566E
--leaf           #5E9B5A     #6FB06A
--yolk           #FFC83D     #FFC83D
--milk           #FDFEFF     #F3F6FA
--tile           #FFF1DC     #2A2436      Kachel hinter Illustrationen
--tile-2         #E4EEFB     #1B2742
--shadow         0 1px 2px rgba(20,27,51,.06), 0 10px 28px rgba(20,27,51,.09)   |   0 1px 2px rgba(0,0,0,.4), 0 10px 28px rgba(0,0,0,.35)
```

Schrift: `--font-display: "Bricolage Grotesque", "Figtree", system-ui, sans-serif` (Überschriften, 600–800, enge Laufweite, `text-wrap: balance`); `--font-body: "Figtree", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` (Fließtext 16 px in Kunden- und Fahrer-App, 14–15 px im Backoffice); `--font-mono: "DM Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace` (Uhrzeiten, Stopp-Nummern, Etiketten in Versalien mit 0.06em Laufweite). Ziffern in Tabellen und Preisen `font-variant-numeric: tabular-nums`. Font-Link: `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=DM+Mono:wght@400;500&family=Figtree:wght@400..800&display=swap`.

Skala: 12 / 14 / 16 / 18 / 22 / 28 / `clamp(34px, 8vw, 60px)`. Radien nach Rolle: Bedienelemente 12 px, Karten 18 px, Bild-Kacheln 22 px, Pillen rund, Lieferzettel 6 px. Schatten sparsam (schwebende Elemente, Sheets), Flächen sonst mit `--line` abgegrenzt.

Statusfarben: frei = ok, wenige Plätze = warn, ausgebucht = full, reserviert/gebucht = info, gesperrt/in Planung = neutral (`--surface-2`/`--muted`). Status immer Farbe **plus** Text.

Seitenregeln aus dem Artefakt-Rahmen (K2 setzt sie in den Shells um): Seiten-Gutter `padding-left: max(16px, env(safe-area-inset-left, 0px))` und rechts entsprechend, einmal je Band-Innenwrapper; Demo-Leiste `position: sticky; top: env(safe-area-inset-top, 0px)` plus `body::before { content:""; position:fixed; inset:0 0 auto; height:env(safe-area-inset-top,0px); z-index:10; background:var(--night) }`; untere Tab-Leiste `bottom:0` mit `padding-bottom: env(safe-area-inset-bottom, 0px)`; `:root`-Padding der Hülle nicht überschreiben; `body { background: var(--bg); color: var(--ink) }`.

Geteilte Komponenten in `App.ui` (K2): `Icon({ name, size })` (eigene Strich-Icons als Inline-SVG: bag, door, clock, check, x, plus, minus, bell, mail, truck, map, route, pin, calendar, pause, gift, users, chart, settings, chevron-left/right/down/up, info, alert, leaf, snow, search, logout, phone, send, refresh, edit, euro, star, home, list, user, basket, megaphone, bread, lock) · `Btn({ variant:'sun'|'primary'|'ghost'|'quiet'|'danger', size:'sm'|'md'|'lg', icon, full, disabled, onClick })` · `Pill({ tone })` · `StatusPill({ effective })` · `Sheet({ open, onClose, title, footer })` (mobil von unten, ab 720 px mittig; Esc schließt) · `toast(text, tone)` + `ToastHost` · `Stepper({ value, onChange, min, max, label })` · `Segmented({ options, value, onChange, label })` · `Tabs` · `Field({ id, label, hint, error, …input })` · `Toggle({ id, label, checked, onChange })` · `DayTag({ wd, dateLabel, effective, sub, promo, selected, disabled, onClick })` und `WeekStrip({ days:[…], onPick })` (Türanhänger; mobil horizontal scrollbar mit Snap, ab 720 px sieben Spalten) · `Ticket({ title, rows, footer })` (Lieferzettel) · `Photo({ id, alt, ratio })` (Foto laut `config.photos`, sonst `App.art.Product`) · `ProductCard({ product, qty, onQty, compact })` · `Bar({ value, max, tone })` · `Kpi({ label, value, sub, tone })` · `PushBanner({ notification, onOpen, onClose })` (Benachrichtigung im Handy-Stil) · `Empty({ icon, title, text, action })` · `Countdown({ to })` · `Logo({ onNight, size })`.

## 6. Module

### K1 – Logik
Alles aus Abschnitt 4. `tools/test-core.mjs` lädt die fünf Logikdateien in Node (fester Zeitpunkt per `App.time.setNow`, Di 24.11.2026 10:00) und prüft: PLZ-Zuordnung; `cap` nord Mo `abo 64 / max 60 / full`, Di `free`, So `few`; Bestellschluss-Regel (Mi → Di 16:30; Sa, So, Mo → Fr 16:30); Kalibrierungswerte aus 4.6; die komplette Leitgeschichte über Aktionen (Warteliste → `setCapacity` → `notified ≥ 7` → `dayStatusFor === 'reserved'` → `placeOrder` → Abo vorhanden, Eintrag `booked`); `flexInfo`; `markStop` erzeugt Push; `bakeryOrder`; `resetDemo`. Test muss grün laufen.

### K2 – UI-Fundament
`index.html`, `css/base.css`, `js/core/lib.js`, `js/core/ui.js`, Shells, `js/app.js`, Stubs, Tools.
- **Demo-Leiste** (nachtblau, schlank, sticky): Kürzel „DEMO“, Segmented „Kunden-App · Backoffice · Fahrer-App · Konzept“ (mobil horizontal scrollbar), Uhr-Chip mit aktueller Demo-Zeit (öffnet Sheet mit `time.presets`), Zurücksetzen (mit Rückfrage im Sheet). Rolle ↔ `location.hash` synchron (`hashchange`). `setInterval` 30 s → `actions.tick()`. `document.documentElement.lang = 'de'`.
- **Kunden-Shell:** Kopf (Logo, Gebiets-Chip sobald PLZ bekannt, Glocke mit Zähler → Konto, Sackerl mit Artikelzahl → Lieferplan); Navigation Start · Sortiment · Lieferplan · Konto als feste Tab-Leiste unten (mobil) bzw. im Kopf (ab 900 px); `PushBanner` für die neueste ungelesene Push-Nachricht des aktuellen Kunden (Tippen führt `action` aus und markiert gelesen); Inhalt max. 1120 px.
- **Backoffice-Shell:** Anmeldekarte mit vorausgefüllten Demo-Zugangsdaten (`loginBackoffice`), danach Seitenleiste (ab 900 px) bzw. scrollbare Tab-Zeile mit den acht Bereichen samt Zählern (Warteliste), Kopf mit Gebietswahl (`ui.boRegion`), Demo-Zeit und Abmelden.
- **Fahrer-Shell:** PIN-Feld (jede 4-stellige PIN, Fahrer wählbar) → `App.views.driver.tour`; ab 720 px als zentrierte Handy-Spalte (max. 440 px).
- `tools/serve.mjs --port N`: statischer Server; `/` liefert `index.html` in dieser Hülle: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>:root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>…</body></html>`.
- `tools/smoke.mjs [--port N] [--only rolle:view,…]`: startet bei Bedarf den Server, öffnet jede Rolle/View bei 390 × 844 und 1280 × 800 (Anmeldungen per Aktion), sammelt Konsolen- und Seitenfehler, prüft „kein horizontales Scrollen“, Exit-Code ≠ 0 bei Fehlern. Fehlgeschlagene Font-Requests ignorieren (lokal gesperrt).
- `tools/shot.mjs --port N --role R --view V --out DATEI [--width 390 --height 844] [--dark] [--full] [--eval "JS vor dem Foto"]`.

### V6 – Illustrationen (`js/core/art.js`)
`App.art = { has(id), Product({ id }), Hero(), Spot({ name }), Mark({ size }) }`. Flacher, leicht geometrischer Stil aus einfachen Formen (Kreise, Ellipsen, abgerundete Rechtecke, kurze Pfade), 2–3 Tonwerte je Objekt, nur Token-Farben per `fill="var(--…)"`. `Product`: ein Motiv je Sortiments-ID, viewBox 120 × 120, Aufsicht oder leichte Schrägsicht, ohne Hintergrund (die Kachel kommt von `Photo`). `Hero`: Szene 480 × 520 – Haustür im Morgengrauen, Papiersackerl hängt an der Türschnalle, Himmel von Nachtblau zu Sonnenaufgang, ein paar verblassende Sterne. `Spot`: `bag-door`, `oven`, `van`, `bell`, `calendar`, `neighbors`, `office`, `gift`, `map-pin`. `Mark`: Semmel mit Kaiserstern und kleinem Heiligenschein.

### V1 – Kunden-App: Start und Sortiment
**Start** (Reihenfolge): (1) Hero: Mono-Zeile „WERKTAGS BIS 06:30 · AM WOCHENENDE BIS 08:30“, H1 = `brand.claim`, kurzer Lead, PLZ-Feld + „Liefertage prüfen“, darunter Demo-Beispiele als Chips „4040 · Montag ausgebucht“, „4050 · alles frei“, „4060 · Gebiet in Planung“; rechts/unten `Photo hero` bzw. `App.art.Hero` mit überlagertem Lieferzettel. (2) Ergebnis direkt darunter: `WeekStrip` für das Gebiet mit Datum des nächsten Liefertags je Wochentag, Aktions-Etikett an `weakDays`, Satz „Gebiet Nord: an 6 von 7 Tagen sind Plätze frei.“; volle Tage mit „Auf die Warteliste“ (Sheet: Kanal Push oder E-Mail, E-Mail-Feld → `joinWaitlist`, danach Position anzeigen); Button „Lieferplan zusammenstellen“. Gebiet in Planung: Fortschritt „14 von 25 Haushalten vorgemerkt“ + Vormerk-Formular. (3) „So funktioniert's“ in drei echten Schritten mit Uhrzeiten (bis 16:30 bestellen · ab 03:30 holen wir frisch vom Bäcker · bis 06:30 hängt das Sackerl an der Tür). (4) „Regelmäßig oder nur einmal“: zwei gleichwertige Optionen mit Preisen aus `config.fees` (Abo: fixer Platz auf der Tour, pausierbar, keine Bindung · Einmalig: solange Plätze frei sind, Mindestbestellwert). (5) Sortiment-Auswahl (horizontal scrollbar) + Kategorien → Sortiment. (6) Saison-Aktion aus `config.season` (nur wenn das Datum noch bestellbar ist; „Vorbestellen“ setzt Einmallieferung für dieses Datum). (7) Partnerbäckerei und Hofladen-Extras. (8) „Nachbarn werben“ mit Code und Guthaben aus `config.promo`. (9) Büro-Frühstück und Frühstück verschenken. (10) Pünktlich-Versprechen (kommt das Sackerl später als 06:30, geht die Zustellung auf uns). (11) FAQ als Akkordeon (Bestellschluss, Urlaub, Montag ausgebucht, einmal bestellen, Bezahlung, Ablageort). (12) Fuß auf `--night` mit Hinweis „Demo mit Beispieldaten“.
**Sortiment:** Kategorien als sticky Tabs, Raster 2 Spalten (mobil) bis 4; `ProductCard` mit Etiketten (Bio, Wochenende, gekühlt, vom Hofladen). Leiste „Sie füllen: Sackerl für Di & Sa – ändern“ (`draft.target`); ohne Ziel fragt das erste „+“ per Sheet nach Tag(en) (Abo-Wochentage mit Status oder ein Einmal-Datum). Unten Zusammenfassung „5 Artikel · € 6,90 je Lieferung – zum Lieferplan“.

### V2 – Kunden-App: Lieferplan und Konto
**Lieferplan:** Gebiet/PLZ (änderbar; ohne PLZ zuerst PLZ-Abfrage), Segmented „Regelmäßig | Einmalig“. Regelmäßig: `WeekStrip` zum An-/Abwählen (statusabhängig; ausgebucht → Wartelisten-Sheet; `reserved` hervorgehoben mit Frist), je gewähltem Tag eine Sackerl-Karte (Positionen mit `Stepper`, „Artikel hinzufügen“ als Sheet mit Sortiment, „wie Dienstag übernehmen“, Tagessumme, Zustellung – an Aktionstagen durchgestrichen und „gratis“). Einmalig: Datumsleiste der nächsten 14 Tage mit `flexInfo` (frei, wenige, ausgebucht, Bestellschluss vorbei), Mindestbestellwert, bei vollem Tag Vorschlag des nächsten freien. Zusammenfassung als Lieferzettel: Lieferungen pro Woche, Summe inkl. Zustellung, erste Lieferung, Bestellschluss mit `Countdown`. Schritte Sackerl → Adresse (inkl. Ablageort als Auswahlkarten und Hinweis-Text, Benachrichtigungen Push/E-Mail) → Bezahlung (SEPA-Lastschrift monatlich oder Karte, Demo-Felder) → Fertig (Lieferzettel, „Zum Konto“, Hinweis auf Backoffice/Fahrer-App). Validierung inline. Für bereits registrierte Kunden entfallen Adresse und Bezahlung.
**Konto:** nicht registriert → Leerzustand mit „Lieferplan zusammenstellen“ und „Demo: als Bestandskundin Maria Huber ansehen“ (`switchCustomer`). Sonst: nächste Lieferungen (je Termin Inhalt, Summe, „Aussetzen“/„Doch liefern“ bis Bestellschluss, Zustell-Status mit Uhrzeit), Urlaubspause (von–bis), Wochenplan bearbeiten (`setSubQty`, Tag entfernen, Tag hinzufügen statusabhängig), Warteliste (Position bzw. „frei – reserviert bis …“ mit „Jetzt buchen“), Nachrichten (Push/E-Mail, gelesen markieren), Nachbarn werben, Zahlungsart und Rechnungen (Beispielzeilen), Ablageort ändern. Umschalter zurück zum Besucher.

### V3 – Backoffice A
**Übersicht:** KPIs aus `kpis`; Diagramm „Auslastung je Wochentag“ maßstabsgetreu (Balken Abo-Stopps gegen Kapazität, Überbuchung in `--full`, Beschriftung „64 / 60“); Empfehlungen in Klartext mit Sprung-Buttons (überbuchter Tag samt `forecastEnd`; freie Plätze Di–Fr → Marketing); „Heute zu tun“ (Bestellschluss-Countdown, Bäckerbestellung, offene Probleme); letzte Bestellungen (auch die aus der Kunden-App).
**Kapazität:** je Wochentag eine Zeile: Status, Auslastung (`Bar` + Zahlen), Fahrer, Stopps je Fahrer, Flex-Kontingent, voraussichtliches Tourende gegen Deadline, Wartende, „Bearbeiten“. Bearbeiten im Sheet mit Live-Prognose (`forecastEnd` für die gewählte Fahrerzahl) und Schalter „Warteliste automatisch benachrichtigen“; Speichern → Toast „Montag freigegeben · 7 Wartende benachrichtigt (5 Push, 2 E-Mail)“. Kurzer Erklärtext zur Regel: Abo-Plätze = Kapazität − Flex-Kontingent; Einmallieferungen nutzen jeden am Datum freien Platz, auch Urlaubsplätze.
**Warteliste:** Einträge je Gebiet/Tag mit Kanal, Datum, Status; „Platz anbieten“ (`notifyWaitlist`); Gebiets-Vormerkungen (west) mit Fortschritt.
**Marketing:** Vorschläge aus `campaignIdeas` (Begründung in Zahlen, Empfängerzahl, „Übernehmen“); Editor (Titel, Text, Kanal, Segment, Vorschau als Push bzw. E-Mail) → `sendCampaign` → Protokoll; Gutscheincodes und Empfehlungen als Beispieltabellen; Saison-Aktion ein/aus.
**Kunden:** Suche + Filter (Gebiet, Abo/Flex, Wochentag), Tabelle, Detail im Sheet (Adresse, Ablageort-Hinweis, Wochenplan, Pausen, Nachrichten).
**Sortiment:** Tabelle mit Preis ändern, aktiv/inaktiv, Kategorie, Partner (`updateProduct`).

### V4 – Backoffice B und Fahrer-App
**Touren:** Datum (nächste 7 Tage, `ui.boDate`), Gebiet, Fahrerzahl (Was-wäre-wenn über `tourPlan(…, driversOverride)` mit „In Kapazität übernehmen“). Kopf: Stopps, km, Start, Tourende gegen Deadline (rot, wenn zu spät, mit Minuten). Schematische Karte als SVG aus `region.area`, `clusters`, Bäckerei und Stopps: dezente Flächen/Straßenzüge, Route je Fahrer in eigener Tonfarbe, nummerierte Punkte (Nummer bei Hover/Tippen und für jeden 5. Stopp), Einmallieferungen markiert, Legende, Hinweis „schematische Karte, Luftlinie × 1,3“. Daneben/darunter die Stoppliste je Fahrer (Nr., ETA, Adresse, Inhalt, Hinweis). „An Fahrer-App senden“ (`sendTour`).
**Bäcker:** Bestellmenge je Artikel für die Daten aus `bakeryDates` (freitags Sa + So + Mo nebeneinander), Countdown bis Bestellschluss, „An Bäckerei senden“ mit Vorschau des Bestelltexts (`sendBakeryOrder`, danach „gesendet um …“); Extras getrennt nach Partner; Packliste je Tour (Stopp → Inhalt).
**Fahrer-App:** Kopf mit Fortschritt („12 von 64“), voraussichtlichem Ende und Deadline; Umschalter Heute/Morgen; Stopps in Reihenfolge als Lieferzettel (Nr., ETA, Adresse, Name, Inhalt, Ablageort-Hinweis, Etikett „einmalig“/„neu“); große Taste „Zugestellt“, „Problem melden“ (Sheet mit Gründen), Rückgängig; Ladeliste (Summe je Artikel). Der nächste offene Stopp ist hervorgehoben.

### V5 – Konzept-Seite und README
Ruhige Textseite (max. 760 px Spalte), Inhalt wörtlich aus `docs/konzept-text.md`. Die „Demo in 7 Schritten“ bekommt je Schritt einen Button, der per `actions.go` direkt in die passende Ansicht springt. `README.md`: Start lokal, Struktur, wo Marke/Gebiete/Preise/Fotos geändert werden.

## 7. Abnahme je Modul

- `node tools/test-core.mjs` grün (K1). `node tools/smoke.mjs --only …` für die eigenen Views ohne Fehler.
- Eigene Screenshots bei 390 × 844 und 1280 × 800, hell und dunkel, selbst angesehen: nichts abgeschnitten, nichts überlappt, kein horizontales Scrollen, Status mit Farbe und Text.
- Abschlussbericht kurz: was fertig ist, was offen blieb, was in fremden Dateien fehlt.
