# Semmelengel – Demo eines Frühstücks-Lieferdienstes

Klickbare Demo eines Lieferdienstes für frisches Gebäck vom Partnerbäcker (werktags bis 06:30 Uhr, am Wochenende bis 08:30 Uhr an der Haustür). Vier Bereiche in einer Seite, oben umschaltbar: Kunden-App, Backoffice, Fahrer-App und Konzept. „Semmelengel“ ist ein Arbeitstitel. Die Konzept-Seite führt in sieben Schritten durch die Demo.

Reine statische Web-App: kein Build-Schritt, kein Server, Preact und htm liegen unter `js/vendor/`.

## Lokal starten

```
node tools/serve.mjs --port 4100
```

Dann `http://127.0.0.1:4100` im Browser öffnen. Der Bereich steht im Hash (`#kunde`, `#backoffice`, `#fahrer`, `#konzept`).

Prüfen:

```
node tools/test-core.mjs     # Logik (Kapazität, Bestellschluss, Touren, Leitgeschichte)
node tools/smoke.mjs         # jede Ansicht bei 390 × 844 und 1280 × 800, Fehler und horizontales Scrollen
```

Optional: `--only backoffice:touren,konzept:konzept` beim Rauchtest, und `node tools/shot.mjs --role kunde --view start --out start.png` für Screenshots.

## Ordner

```
index.html     Seitenfragment (Titel, CSS-Links, #app, Skripte)
css/           base.css (Farben, Schrift, geteilte ui-*-Klassen) und eine Datei je Bereich
js/core/       Logik und Daten: config, time, data, routing, store; dazu art, photos, ui, lib
js/customer/   Kunden-App    js/backoffice/  Backoffice
js/driver/     Fahrer-App    js/concept/     Konzept-Seite
js/app.js      Demo-Leiste, Rollenwechsel, Start
img/           Fotos und Bildnachweise
docs/          Bauplan und Text der Konzept-Seite
tools/         serve, smoke, shot, test-core
```

## Was wo ändern

- **Markenname, Claim, Fristen, Gebühren:** `js/core/config.js` (`brand`, `cutoff`, `deadlineMin`, `fees`, `economics` (Kalkulationsannahmen: Fahrervergütung, USt, Einkauf), `capacityDefaults`, `promo`, `season`, `labels`).
- **Gebiete und Postleitzahlen, Kunden, Sortiment und Preise, Mengenaktionen:** `js/core/data.js` (Regionen mit `plz`, Produktliste mit `price`, `offers`). Die Zahl der Abo-Stopps je Wochentag steht dort ebenfalls.
- **Fotos:** Bilddateien in `img/` ablegen und in `js/core/photos.js` unter der Produkt-ID bzw. Szene (`hero`, `baecker`, `hofladen`, `buero`, `geschenk`, `fruehstueck`) eintragen; Bildnachweise in `App.photoCredits` und `img/CREDITS.md`. Ohne Eintrag zeigt die Demo Illustrationen aus `js/core/art.js`.
- **Farben und Schriften:** Tokens am Anfang von `css/base.css`.

## Hinweise

Alle Kunden, Adressen, Zahlen, Preise und Gebiete sind Beispieldaten. Push-Nachrichten und E-Mails werden nur simuliert, der Zustand liegt im Browser (`localStorage`) und lässt sich in der Demo-Leiste zurücksetzen. `index.html` ist ein Seitenfragment ohne `<html>`, `<head>` und `<body>`; `tools/serve.mjs` wickelt es für die lokale Vorschau in ein vollständiges Dokument.

## Einzelne Datei zum Weitergeben

`node tools/build-single.mjs` baut `dist/semmelengel-demo.html`: alle Styles, Skripte und Fotos stecken in dieser einen Datei. Sie läuft ohne Server per Doppelklick in jedem aktuellen Browser (Chrome, Edge, Safari, Firefox am Computer). Ohne Internet fehlen nur die Webschriften; dann wird eine Systemschrift verwendet. Nach Änderungen an der Demo die Datei neu bauen.
