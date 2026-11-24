/* Beispieldaten: deterministisch (fester Seed), Daten relativ zu App.time.today(). */
(function (root) {
  const App = root.App = root.App || {};
  const C = App.config, T = App.time;

  // ---------------------------------------------------------------- Zufall
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  const randInt = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
  const round1 = n => Math.round(n * 10) / 10;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function weightedIndex(rng, weights) {
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum <= 0) return -1;
    let r = rng() * sum;
    for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0) return i; }
    return weights.length - 1;
  }

  // ---------------------------------------------------------------- Welt
  function worldRegions() {
    const bakery = (x, y) => ({ name: 'Backstube Kornfeld', since: 1928, x, y });
    const cl = (id, name, x, y, spread, w, plz, city, streets) => ({ id, name, x, y, spread, w, plz, city, streets });
    const rural = ['Dorfstraße', 'Hauptstraße', 'Bachweg', 'Kirchenweg', 'Birkenweg', 'Am Anger'];
    return [
      {
        id: 'nord', name: 'Flachgau Ost', plz: ['5303', '5322', '5321', '5301', '5302', '5202', '5203', '5300', '5023'], planned: false,
        bakery: bakery(7.6, 4.4), area: { x0: 0.6, y0: 0.6, x1: 16.6, y1: 10.6 },
        clusters: [
          cl('thalgau', 'Thalgau', 7.4, 3.8, 0.9, 0.20, '5303', 'Thalgau', ['Lindenweg', 'Kirchengasse', 'Marktstraße', 'Bachstraße', 'Gartenstraße']),
          cl('hof', 'Hof bei Salzburg', 13.2, 2.0, 0.8, 0.14, '5322', 'Hof bei Salzburg', ['Hauptstraße', 'Seeweg', 'Wiesenweg', 'Waldweg']),
          cl('koppl', 'Koppl', 2.3, 0.5, 0.7, 0.10, '5321', 'Koppl', rural),
          cl('eugendorf', 'Eugendorf', 4.2, 6.2, 0.8, 0.12, '5301', 'Eugendorf', ['Salzburger Straße', 'Schulweg', 'Fliederweg', 'Ahornweg']),
          cl('henndorf', 'Henndorf', 10.1, 7.4, 0.7, 0.10, '5302', 'Henndorf am Wallersee', rural),
          cl('neumarkt', 'Neumarkt', 15.4, 7.1, 0.8, 0.10, '5202', 'Neumarkt am Wallersee', ['Marktplatz', 'Bahnhofstraße', 'Seestraße', 'Gewerbeweg']),
          cl('koestendorf', 'Köstendorf', 12.3, 8.6, 0.6, 0.08, '5203', 'Köstendorf', rural),
          cl('hallwang', 'Hallwang', 0.8, 4.4, 0.6, 0.08, '5300', 'Hallwang', rural),
          cl('gnigl', 'Salzburg-Gnigl', 1.3, 8.6, 0.6, 0.08, '5023', 'Salzburg', ['Gniglerstraße', 'Eichstraße', 'Parkweg', 'Kuenburgstraße'])
        ]
      },
      {
        id: 'sued', name: 'Mondseeland', plz: ['5310', '5311'], planned: false,
        bakery: bakery(19.2, 12.6), area: { x0: 15.0, y0: 9.0, x1: 24.0, y1: 16.0 },
        clusters: [
          cl('mondsee-markt', 'Mondsee Markt', 17.2, 11.0, 0.6, 0.25, '5310', 'Mondsee', ['Kirchengasse', 'Marktplatz', 'Schulstraße', 'Hirtengasse']),
          cl('tiefgraben', 'Tiefgraben', 21.4, 11.3, 0.6, 0.20, '5310', 'Mondsee', ['Siedlerweg', 'Fliederweg', 'Rainstraße', 'Kleeweg']),
          cl('st-lorenz', 'St. Lorenz', 17.8, 14.0, 0.6, 0.20, '5310', 'Mondsee', ['Seestraße', 'Uferweg', 'Schilfgasse', 'Teichweg']),
          cl('schwarzindien', 'Schwarzindien', 21.2, 14.2, 0.6, 0.15, '5310', 'Mondsee', ['Bachstraße', 'Pfarrgasse', 'Friedhofweg', 'Glockengasse']),
          cl('loibichl', 'Loibichl', 19.4, 15.0, 0.4, 0.20, '5311', 'Loibichl', ['Dorfstraße', 'Lindenweg', 'Wiesenweg', 'Birkenweg'])
        ]
      },
      {
        id: 'west', name: 'Fuschlsee', plz: ['5330', '5340'], planned: true, neededPrereg: 25,
        bakery: bakery(4.5, 12.5), area: { x0: 0.6, y0: 9.6, x1: 9.0, y1: 15.4 },
        clusters: [
          cl('fuschl', 'Fuschl am See', 3.0, 11.6, 0.6, 0.5, '5330', 'Fuschl am See', ['Seestraße', 'Waldweg']),
          cl('st-gilgen', 'St. Gilgen', 6.6, 13.2, 0.6, 0.5, '5340', 'St. Gilgen', ['Hauptstraße', 'Hangweg'])
        ]
      }
    ];
  }

  const DRIVERS = [{ id: 'd-jovana', name: 'Jovana' }, { id: 'd-tobias', name: 'Tobias' }, { id: 'd-erwin', name: 'Erwin' }];

  function worldProducts() {
    const B = 'Backstube Kornfeld', H = 'Hofladen';
    const p = (id, cat, name, plural, price, unit, desc, o) => Object.assign(
      { id, cat, name, plural, desc, price, unit, tags: [], active: true, partner: cat === 'extras' ? H : B }, o || {});
    return [
      p('kaisersemmel', 'gebaeck', 'Kaisersemmel', 'Kaisersemmeln', 0.65, 'Stück', 'Knusprig gebacken, außen kross, innen weich.'),
      p('handsemmel', 'gebaeck', 'Bio-Handsemmel', 'Bio-Handsemmeln', 1.30, 'Stück', 'Von Hand geformt, aus Bio-Weizen und mit langer Teigruhe.', { tags: ['bio'] }),
      p('kornweckerl', 'gebaeck', 'Kornweckerl', 'Kornweckerl', 1.50, 'Stück', 'Mit Roggen, Sonnenblumen- und Leinsamen.'),
      p('salzstangerl', 'gebaeck', 'Salzstangerl', 'Salzstangerl', 1.40, 'Stück', 'Mit grobem Salz und Kümmel bestreut.'),
      p('mohnflesserl', 'gebaeck', 'Mohnflesserl', 'Mohnflesserl', 1.45, 'Stück', 'Reichlich Mohn, ein Klassiker zum Frühstücksei.'),
      p('laugenbreze', 'gebaeck', 'Laugenbreze', 'Laugenbrezen', 1.50, 'Stück', 'Dunkel gebacken, mit Salzkristallen.'),
      p('dinkelweckerl', 'gebaeck', 'Dinkel-Vollkornweckerl', 'Dinkel-Vollkornweckerl', 1.60, 'Stück', 'Saftig, mit ganzem Dinkelkorn.', { tags: ['bio'] }),
      p('buttercroissant', 'suess', 'Buttercroissant', 'Buttercroissants', 2.20, 'Stück', 'Viel Butter, mürbe Blätterschichten.'),
      p('topfengolatsche', 'suess', 'Topfengolatsche', 'Topfengolatschen', 2.60, 'Stück', 'Blätterteig mit cremiger Topfenfülle.'),
      p('nussschnecke', 'suess', 'Nussschnecke', 'Nussschnecken', 2.80, 'Stück', 'Germteig mit Haselnussfülle und Zuckerglasur.'),
      p('marillenkrapfen', 'suess', 'Marillenkrapfen', 'Marillenkrapfen', 2.40, 'Stück', 'Fluffig, mit Marillenmarmelade gefüllt.'),
      p('briochestriezel', 'suess', 'Butter-Briochestriezel', 'Butter-Briochestriezel', 6.90, 'Stück', 'Zopf aus Briocheteig für den Wochenendtisch.', { weekendOnly: true }),
      p('bauernbrot', 'brot', 'Bauernbrot', 'Bauernbrote', 3.20, '500 g', 'Roggen-Weizen-Sauerteig, kräftige Kruste.'),
      p('dinkelbrot', 'brot', 'Dinkelvollkornbrot', 'Dinkelvollkornbrote', 4.00, '500 g', 'Saftiges Vollkornbrot, ohne Zusätze gebacken.', { tags: ['bio'] }),
      p('nussbrot', 'brot', 'Nussbrot', 'Nussbrote', 4.60, '400 g', 'Mit Walnüssen und Haselnüssen.'),
      p('teebutter', 'extras', 'Teebutter', 'Teebutter', 2.90, '250 g', 'Süßrahmbutter vom Bauernhof.', { chilled: true }),
      p('marillenmarmelade', 'extras', 'Marillenmarmelade', 'Marillenmarmeladen', 4.50, '220 g', 'Aus Wachauer Marillen, im Kupferkessel eingekocht.'),
      p('bluetenhonig', 'extras', 'Blütenhonig', 'Blütenhonige', 5.90, '250 g', 'Cremig gerührt, vom Imker aus der Nachbarschaft.', { tags: ['regional'] }),
      p('beinschinken', 'extras', 'Beinschinken', 'Beinschinken', 2.90, '100 g', 'Zart geschnitten, ohne Phosphat.', { chilled: true }),
      p('bergkaese', 'extras', 'Bergkäse', 'Bergkäse', 3.80, '150 g', 'Würzig, mindestens sechs Monate gereift.', { chilled: true }),
      p('freilandeier', 'extras', 'Freilandeier', 'Freilandeier', 3.20, '6 Stück', 'Von Hühnern mit Auslauf, Größe M.', { chilled: true }),
      p('frischmilch', 'extras', 'Frischmilch', 'Frischmilch', 1.90, '1 l Glasflasche', 'Pfand inklusive, wir nehmen die leere Flasche mit.', { chilled: true }),
      p('orangensaft', 'extras', 'Orangensaft frisch gepresst', 'Orangensäfte', 3.90, '0,5 l', 'Am Vorabend gepresst, ohne Zucker.', { chilled: true }),
      p('naturjoghurt', 'extras', 'Naturjoghurt', 'Naturjoghurts', 1.40, '250 g', 'Mild und cremig, aus Vollmilch.', { chilled: true }),
      p('liptauer', 'extras', 'Liptauer', 'Liptauer', 2.60, '150 g', 'Pikanter Aufstrich mit Paprika und Zwiebel.', { chilled: true }),
      p('roestkaffee', 'extras', 'Röstkaffee', 'Röstkaffee', 7.90, '250 g', 'Ganze Bohnen, in kleiner Trommel geröstet.'),
      p('box-sonntag', 'boxen', 'Sonntagsfrühstück für 2', 'Sonntagsfrühstück für 2', 16.90, 'Sackerl', 'Semmeln, Croissants, Butter, Marmelade, Eier und Saft.'),
      p('box-familie', 'boxen', 'Familienfrühstück für 4', 'Familienfrühstück für 4', 27.90, 'Sackerl', 'Reichlich Gebäck, Aufstriche, Milch und Eier für vier.'),
      p('box-buero', 'boxen', 'Büro-Frühstück für 10', 'Büro-Frühstück für 10', 69.00, 'Sackerl', 'Gebäck-Auswahl, Aufschnitt, Käse und Aufstriche für zehn.'),
      p('box-nikolo', 'boxen', 'Nikolo-Sackerl', 'Nikolo-Sackerl', 13.90, 'Sackerl', 'Lebkuchen, Nüsse, Mandarinen und ein Nikolo aus Germteig.', { season: C.season.id })
    ].map(withCost).map(withFlags);
  }

  const FOCUS = ['bauernbrot', 'dinkelbrot', 'nussbrot', 'briochestriezel', 'box-sonntag', 'box-familie', 'box-buero', 'box-nikolo', 'buttercroissant'];
  const BESTSELLER = ['kaisersemmel', 'kornweckerl', 'buttercroissant', 'bauernbrot', 'teebutter', 'box-sonntag'];
  const NEW_IDS = ['dinkelweckerl', 'liptauer', 'box-nikolo'];
  const ALLERGENS = {'kaisersemmel': 'A', 'handsemmel': 'A', 'kornweckerl': 'A N', 'salzstangerl': 'A', 'mohnflesserl': 'A', 'laugenbreze': 'A', 'dinkelweckerl': 'A', 'buttercroissant': 'A C G', 'topfengolatsche': 'A C G', 'nussschnecke': 'A C G H', 'marillenkrapfen': 'A C G', 'briochestriezel': 'A C G', 'bauernbrot': 'A', 'dinkelbrot': 'A', 'nussbrot': 'A H', 'teebutter': 'G', 'marillenmarmelade': '', 'bluetenhonig': '', 'beinschinken': '', 'bergkaese': 'G', 'freilandeier': 'C', 'frischmilch': 'G', 'orangensaft': '', 'naturjoghurt': 'G', 'liptauer': 'G M', 'roestkaffee': '', 'box-sonntag': 'A C G', 'box-familie': 'A C G H', 'box-buero': 'A C G H', 'box-nikolo': 'A C G H'};
  function withFlags(pr) {
    pr.allergens = (ALLERGENS[pr.id] || '').split(' ').filter(Boolean);
    pr.bestseller = BESTSELLER.includes(pr.id);
    pr.isNew = NEW_IDS.includes(pr.id);
    pr.focus = FOCUS.includes(pr.id);
    return pr;
  }

  // Einkaufspreis netto aus config.economics (eine Stelle für alle Schätzwerte).
  function unitCost(pr) {
    const e = C.economics, net = pr.price / (1 + e.vatRate);
    const v = pr.cat === 'extras' ? net * e.extrasCostShare : net / (1 + e.shopMarkup) * (1 - e.purchaseDiscount);
    return Math.round(v * 10000) / 10000;
  }
  function withCost(pr) {
    pr.cost = unitCost(pr);
    return pr;
  }

  function worldOffers() {
    const o = (id, title, active, buy, get, weekdays, note) => ({ id, title, active, buy, get, weekdays, note });
    return [
      o('butter-marmelade', 'Zur Teebutter: Marillenmarmelade −10 %', true,
        { kind: 'product', ref: 'teebutter', qty: 1 }, { productId: 'marillenmarmelade', qty: 1, pct: 10 }, null, 'Aufstrich-Kombination.'),
      o('striezel-wochenende', 'Am Wochenende ab 4 Semmeln & Weckerl: Briochestriezel −10 %', true,
        { kind: 'cat', ref: 'gebaeck', qty: 4 }, { productId: 'briochestriezel', qty: 1, pct: 10 }, [5, 6], 'Macht das Wochenend-Sackerl größer.'),
      o('semmel-5-1', '5 Kaisersemmeln + 1 gratis', false,
        { kind: 'product', ref: 'kaisersemmel', qty: 5 }, { productId: 'kaisersemmel', qty: 1, pct: 100 }, null, 'Vorlage: Die Kalkulation zeigt den Verlust.'),
      o('croissant-2-1', '2 Buttercroissants + 1 gratis', false,
        { kind: 'product', ref: 'buttercroissant', qty: 2 }, { productId: 'buttercroissant', qty: 1, pct: 100 }, [1, 2, 3, 4], 'Vorlage, nur an den schwachen Tagen Di–Fr.')
    ];
  }

  // ---------------------------------------------------------------- Personen
  const FIRST_F = ['Anna', 'Maria', 'Elisabeth', 'Katharina', 'Johanna', 'Sabine', 'Claudia', 'Birgit', 'Martina', 'Barbara', 'Eva', 'Julia', 'Christina', 'Andrea', 'Monika', 'Renate', 'Karin', 'Lisa', 'Verena', 'Theresa', 'Sophie', 'Gabriele', 'Ingrid', 'Silvia'];
  const FIRST_M = ['Franz', 'Josef', 'Johann', 'Markus', 'Stefan', 'Andreas', 'Thomas', 'Michael', 'Peter', 'Wolfgang', 'Christian', 'Gerhard', 'Herbert', 'Manfred', 'Georg', 'Lukas', 'Florian', 'Daniel', 'Martin', 'Alexander', 'Reinhard', 'Helmut', 'Dominik', 'Paul'];
  const LAST = ['Berger', 'Gruber', 'Wimmer', 'Bauer', 'Leitner', 'Mayer', 'Steiner', 'Moser', 'Hofer', 'Fuchs', 'Egger', 'Pichler', 'Eder', 'Wagner', 'Brunner', 'Reiter', 'Aigner', 'Lang', 'Fischer', 'Schwarz', 'Winkler', 'Haas', 'Ebner', 'Maier', 'Kraus', 'Auer', 'Baumgartner', 'Holzer', 'Koller', 'Mair', 'Binder', 'Lechner', 'Kainz', 'Ortner', 'Prinz', 'Resch', 'Strasser', 'Pölzl', 'Hackl', 'Zauner', 'Lehner', 'Hinterberger', 'Schober', 'Knoll', 'Neuhold', 'Gstöttner', 'Mitterlehner', 'Stadler', 'Haider', 'Kogler'];
  const NOTES = [
    { placement: 'box', note: 'Bitte ins Zeitungsrohr' },
    { placement: 'hinweis', note: 'Seiteneingang, Sackerl auf die Bank' },
    { placement: 'hinweis', note: 'Hund im Garten – Sackerl ans Gartentor' },
    { placement: 'hinweis', note: 'Bitte nicht klingeln, das Baby schläft' },
    { placement: 'hinweis', note: 'Hintereingang über den Hof, Sackerl an die linke Türschnalle' },
    { placement: 'hinweis', note: 'Sackerl im Windfang ablegen, die Tür ist offen' }
  ];
  const PLACEMENTS = ['tuerschnalle', 'tuerschnalle', 'tuerschnalle', 'vor-der-tuer', 'vor-der-tuer', 'box'];

  const slug = s => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');

  // ---------------------------------------------------------------- Wochentags-Zuordnung (exakte Spaltensummen)
  const dayClass = wd => (wd === 0 ? 0 : wd < 5 ? 1 : 2);

  function assignDays(rng, count, quotas, preset) {
    const rem = quotas.slice();
    const days = Array.from({ length: count }, () => []);
    const fixed = new Set();
    Object.keys(preset).forEach(i => { days[i] = preset[i].slice(); fixed.add(+i); preset[i].forEach(w => { rem[w]--; }); });
    const free = [];
    for (let i = 0; i < count; i++) if (!fixed.has(i)) free.push(i);
    // 1. jeder freie Kunde bekommt einen Hauptwochentag
    free.forEach(i => {
      const w = weightedIndex(rng, rem.map(r => Math.max(0, r)));
      days[i].push(w); rem[w]--;
    });
    // 2. restliche Plätze je Wochentag verteilen, bevorzugt an Kunden mit ähnlichem Rhythmus
    [6, 5, 0, 1, 2, 3, 4].forEach(w => {
      const cand = free.filter(i => !days[i].includes(w));
      const weights = cand.map(i => 1 + 4 * days[i].filter(d => dayClass(d) === dayClass(w)).length);
      while (rem[w] > 0 && cand.length) {
        const k = weightedIndex(rng, weights);
        days[cand[k]].push(w); rem[w]--;
        cand.splice(k, 1); weights.splice(k, 1);
      }
    });
    days.forEach(d => d.sort((a, b) => a - b));
    return days;
  }

  // ---------------------------------------------------------------- Warenkörbe
  // Mischung nach Stück: rund 23 % Semmeln, 57 % Weckerl/Stangerl, 16 % Süßes, 4 % Brot; im Mittel rund 5 Stück.
  const MIX = [
    { w: 0.23, ids: ['kaisersemmel', 'kaisersemmel', 'kaisersemmel', 'kaisersemmel', 'kaisersemmel', 'kaisersemmel', 'kaisersemmel', 'kaisersemmel', 'kaisersemmel', 'handsemmel'] },
    { w: 0.57, ids: ['kornweckerl', 'kornweckerl', 'kornweckerl', 'kornweckerl', 'salzstangerl', 'salzstangerl', 'salzstangerl', 'salzstangerl', 'salzstangerl', 'salzstangerl', 'mohnflesserl', 'mohnflesserl', 'mohnflesserl', 'laugenbreze', 'laugenbreze', 'laugenbreze', 'dinkelweckerl', 'dinkelweckerl'] },
    { w: 0.16, ids: ['buttercroissant', 'buttercroissant', 'buttercroissant', 'buttercroissant', 'topfengolatsche', 'topfengolatsche', 'nussschnecke', 'marillenkrapfen', 'marillenkrapfen'] },
    { w: 0.04, ids: ['bauernbrot', 'bauernbrot', 'bauernbrot', 'dinkelbrot', 'nussbrot'] }
  ];
  function randBasket(rng, wd) {
    const items = {};
    const add = (id, q) => { items[id] = (items[id] || 0) + (q || 1); };
    let n = pick(rng, wd >= 5 ? [4, 5, 5, 6, 6, 5] : [3, 4, 5, 5, 6, 5, 4, 6]);
    if (wd >= 5 && rng() < 0.07 && n > 2) { add('briochestriezel'); n--; }
    if (wd === 6 && rng() < 0.04 && n > 2) { add('box-sonntag'); n--; }
    if (rng() < 0.05 && n > 2) { add(pick(rng, ['teebutter', 'marillenmarmelade', 'freilandeier', 'naturjoghurt'])); n--; }
    for (let i = 0; i < n; i++) {
      const g = MIX[weightedIndex(rng, MIX.map(m => m.w))];
      add(pick(rng, g.ids));
    }
    return items;
  }

  function flexBasket(rng, products) {
    const price = id => products.find(p => p.id === id).price;
    const items = {};
    let sum = 0;
    const pool = ['kaisersemmel', 'handsemmel', 'kornweckerl', 'buttercroissant', 'topfengolatsche', 'laugenbreze', 'bauernbrot'];
    while (sum < 6.5) {
      const id = pick(rng, pool), q = randInt(rng, 1, 4);
      items[id] = (items[id] || 0) + q; sum += price(id) * q;
    }
    return items;
  }

  // ---------------------------------------------------------------- Kunden
  function makeCustomerFactory(rng, today) {
    const used = new Set(['Maria Huber']);
    let n = 0;
    function uniqueName() {
      for (;;) {
        const first = rng() < 0.55 ? pick(rng, FIRST_F) : pick(rng, FIRST_M);
        const name = first + ' ' + pick(rng, LAST);
        if (!used.has(name)) { used.add(name); return name; }
      }
    }
    function make(region, kind, o) {
      o = o || {};
      const cl = o.cluster || region.clusters[weightedIndex(rng, region.clusters.map(c => c.w))];
      const a = region.area;
      const g = () => (rng() + rng() + rng() - 1.5) * 2 * cl.spread;
      const x = o.x != null ? o.x : Math.round(clamp(cl.x + g(), a.x0, a.x1) * 100) / 100;
      const y = o.y != null ? o.y : Math.round(clamp(cl.y + g(), a.y0, a.y1) * 100) / 100;
      const name = o.name || uniqueName();
      const nt = rng() < 0.12 ? pick(rng, NOTES) : null;
      const isNew = o.since ? false : rng() < 0.07;
      const since = o.since || T.addDays(today, -(isNew ? randInt(rng, 2, 24) : randInt(rng, 30, 520)));
      n++;
      return {
        id: o.id || ('c-' + (kind === 'flex' ? 'f' : 'a') + String(n).padStart(3, '0')),
        name,
        street: o.street || pick(rng, cl.streets),
        houseNo: o.houseNo || String(randInt(rng, 1, 48)) + (rng() < 0.15 ? pick(rng, ['a', 'b']) : ''),
        plz: cl.plz, city: cl.city, regionId: region.id, x, y,
        placement: o.placement || (nt ? nt.placement : pick(rng, PLACEMENTS)),
        note: o.note != null ? o.note : (nt ? nt.note : ''),
        email: slug(name) + '@mail.example',
        phone: '+43 660 55' + String(randInt(rng, 10000, 99999)),
        since, notify: { push: rng() < 0.7, email: rng() < 0.8 }, kind, registered: true
      };
    }
    return { make };
  }

  function buildPopulation(rng, regions, products, today) {
    const customers = [], subs = [], flexOnlyByRegion = {};
    const factory = makeCustomerFactory(rng, today);
    const plans = {
      nord: { quotas: [41, 19, 18, 21, 22, 38, 50], pool: 85, flex: 10 },
      sued: { quotas: [26, 12, 11, 13, 14, 24, 30], pool: 55, flex: 10 }
    };
    Object.keys(plans).forEach(rid => {
      const region = regions.find(r => r.id === rid), plan = plans[rid];
      const preset = {};
      if (rid === 'nord') preset[0] = [2, 5, 6];
      const days = assignDays(rng, plan.pool, plan.quotas, preset);
      for (let i = 0; i < plan.pool; i++) {
        let c;
        if (rid === 'nord' && i === 0) {
          const cl = region.clusters.find(x => x.id === 'thalgau');
          c = factory.make(region, 'abo', { id: 'c-huber', name: 'Maria Huber', street: 'Lindenweg', houseNo: '12', cluster: cl,
            placement: 'tuerschnalle', note: '', since: T.addDays(today, -430) });
          c.email = 'maria.huber@mail.example'; c.notify = { push: true, email: true };
        } else c = factory.make(region, 'abo');
        customers.push(c);
        days[i].forEach(wd => {
          let items = randBasket(rng, wd);
          if (c.id === 'c-huber') {
            items = wd === 2 ? { kaisersemmel: 2, buttercroissant: 1 }
              : wd === 5 ? { kaisersemmel: 3, kornweckerl: 2, salzstangerl: 1, topfengolatsche: 1 }
                : { kaisersemmel: 3, buttercroissant: 2, salzstangerl: 1, freilandeier: 1 };
          }
          subs.push({ id: 's-' + c.id + '-' + wd, customerId: c.id, weekday: wd, items,
            since: c.since > T.addDays(today, -14) ? c.since : T.addDays(c.since, randInt(rng, 0, 20)) });
        });
      }
      flexOnlyByRegion[rid] = [];
      for (let i = 0; i < plan.flex; i++) { const c = factory.make(region, 'flex'); customers.push(c); flexOnlyByRegion[rid].push(c); }
    });
    return { customers, subs, flexOnlyByRegion };
  }

  function buildFlexOrders(rng, today, flexOnly, products) {
    const orders = [], dates = T.nextDates(7, today);
    Object.keys(flexOnly).forEach(rid => {
      const pool = flexOnly[rid]; let ptr = 0;
      if (!pool.length) return;
      dates.forEach(k => {
        const cnt = randInt(rng, 0, 2);
        for (let i = 0; i < cnt; i++) {
          const c = pool[ptr++ % pool.length];
          orders.push({ id: 'f-' + (orders.length + 1), customerId: c.id, dateKey: k, items: flexBasket(rng, products),
            createdAt: new Date(T.now().getTime() - randInt(rng, 2, 40) * 3600000).toISOString(), status: 'confirmed' });
        }
      });
    });
    return orders;
  }

  // ---------------------------------------------------------------- Wartelisten, Nachrichten, Kampagnen
  function buildWaitlist(rng, today) {
    const ago = d => new Date(T.now().getTime() - d * 86400000 - randInt(rng, 0, 40000) * 1000).toISOString();
    const nordMon = [
      ['Sabine Kogler', 'push'], ['Dominik Aigner', 'push'], ['Theresa Brandl', 'email'],
      ['Gerhard Hammer', 'push'], ['Ingrid Poschacher', 'email'], ['Lukas Stiegler', 'push']
    ].map((e, i) => ({
      id: 'w-n' + (i + 1), regionId: 'nord', weekday: 0, customerId: null,
      contact: { name: e[0], plz: i % 2 ? '5303' : '5322', email: slug(e[0]) + '@mail.example' },
      channel: e[1], createdAt: ago(9 - i), status: 'waiting', notifiedAt: null, reservedUntil: null
    }));
    const westNames = ['Hannah Obermayr', 'Rudolf Ploier', 'Carina Weidinger', 'Bernhard Sageder', 'Nina Dorfer', 'Walter Rosenberger', 'Petra Hofstätter',
      'Tamara Url', 'Josef Humer', 'Sandra Ecker', 'Kurt Mühlbacher', 'Livia Traunfellner', 'Roland Pammer', 'Anja Kiesenhofer'];
    const west = westNames.map((nm, i) => ({
      id: 'w-w' + (i + 1), regionId: 'west', weekday: null, customerId: null,
      contact: { name: nm, plz: i % 2 ? '5330' : '5340', email: slug(nm) + '@mail.example' },
      channel: i % 3 === 0 ? 'push' : 'email', createdAt: ago(20 - i), status: 'waiting', notifiedAt: null, reservedUntil: null
    }));
    return nordMon.concat(west);
  }

  function buildHuberInbox(today) {
    const at = (d, h, m) => { const x = T.fromKey(T.addDays(today, -d)); x.setHours(h, m, 0, 0); return x.toISOString(); };
    const base = { customerId: 'c-huber', contactName: 'Maria Huber', action: null };
    return [
      Object.assign({}, base, { id: 'n-h1', channel: 'push', kind: 'delivery', title: 'Ihr Frühstück ist da',
        body: 'Das Sackerl hängt an Ihrer Türschnalle. Guten Appetit!', createdAt: at(4, 5, 41), read: true }),
      Object.assign({}, base, { id: 'n-h2', channel: 'email', kind: 'order', title: 'Ihr Wochenplan ist angelegt',
        body: 'Wir liefern jeden Mittwoch, Samstag und Sonntag bis spätestens 06:30 beziehungsweise 08:30 Uhr.', createdAt: at(60, 18, 12), read: true }),
      Object.assign({}, base, { id: 'n-h3', channel: 'email', kind: 'promo', title: 'Nikolo-Sackerl vorbestellen',
        body: 'Bis 4. Dezember 16:30 Uhr können Sie das Nikolo-Sackerl für den 6. Dezember als Einmallieferung dazubuchen.',
        createdAt: at(1, 9, 5), read: false, action: { view: 'sortiment', weekday: null } })
    ];
  }

  function buildTodayDeliveries(rng, today, subs, customers) {
    const wd = T.weekday(today);
    if (T.now().getHours() * 60 + T.now().getMinutes() < T.deadlineMin(today)) return {};
    const byId = new Map(customers.map(c => [c.id, c]));
    const dl = T.deadlineMin(today), day = T.fromKey(today), out = {};
    let problemDone = false;
    subs.filter(s => s.weekday === wd).forEach(s => {
      const c = byId.get(s.customerId);
      const t = new Date(day.getTime() + (dl - randInt(rng, 25, 110)) * 60000);
      const problem = !problemDone && c.regionId === 'nord' && c.placement === 'hinweis';
      if (problem) problemDone = true;
      out[s.customerId] = problem
        ? { status: 'problem', at: t.toISOString(), reason: 'Haustür nicht erreichbar, Sackerl wurde beim Nachbarn abgegeben' }
        : { status: 'delivered', at: t.toISOString(), reason: '' };
    });
    const res = {}; res[today] = out; return res;
  }

  function pastCampaigns(customers, subs) {
    const wk = new Map();
    subs.forEach(s => { if (!wk.has(s.customerId)) wk.set(s.customerId, []); wk.get(s.customerId).push(s.weekday); });
    let weekendOnly = 0;
    wk.forEach(d => { if (d.every(w => w >= 5)) weekendOnly++; });
    const ago = d => new Date(T.now().getTime() - d * 86400000).toISOString();
    return [
      { id: 'k-1', title: 'Sonntagsfrühstück für 2', body: 'Neu für den Wochenendtisch: Semmeln, Butter, Marmelade, Eier und Saft in einem Sackerl.',
        channel: 'push', segment: 'weekend-only', sentAt: ago(12), recipients: weekendOnly },
      { id: 'k-2', title: 'Neu: Bio-Handsemmel', body: 'Von Hand geformt und lange gereift. Ab sofort in Ihrem Sackerl zubuchbar.',
        channel: 'email', segment: 'all', sentAt: ago(27), recipients: customers.length }
    ];
  }

  // ---------------------------------------------------------------- Entwurf, Kapazität, Seed
  function draftDefaults() {
    return {
      plz: '', regionId: null, mode: 'abo', abo: {}, flexDate: null, flex: {}, target: null, step: 'plan',
      address: { name: '', street: '', houseNo: '', plz: '', city: '', email: '', phone: '' },
      placement: 'tuerschnalle', note: '', notify: { push: true, email: true }, payment: 'sepa', lastOrder: null
    };
  }

  function defaultCapacity() {
    const d = C.capacityDefaults, out = {};
    ['nord', 'sued', 'west'].forEach(rid => {
      out[rid] = [0, 1, 2, 3, 4, 5, 6].map(wd => ({
        status: rid === 'nord' && wd === 0 ? 'waitlist' : 'open', drivers: 1,
        stopsPerDriver: wd >= 5 ? d.stopsPerDriver.weekend : d.stopsPerDriver.weekday,
        flexQuota: d.flexQuota, autoNotify: true
      }));
    });
    return out;
  }

  function seed() {
    const rng = mulberry32(20261141);
    const today = T.today();
    const regions = worldRegions();
    const products = worldProducts();
    const pop = buildPopulation(rng, regions, products, today);
    const me = {
      id: 'me', name: 'Besucher', street: '', houseNo: '', plz: '', city: '', regionId: null, x: 0, y: 0,
      placement: 'tuerschnalle', note: '', email: '', phone: '', since: today,
      notify: { push: true, email: true }, kind: 'abo', registered: false
    };
    const customers = pop.customers.concat([me]);
    const flexOrders = buildFlexOrders(rng, today, pop.flexOnlyByRegion, products);
    // Beispiel für Aussetzer und Pause (nur unter der Woche, damit die Kalibrierung stabil bleibt)
    const skips = {};
    const midSub = pop.subs.filter(s => s.weekday === 3 && s.customerId !== 'c-huber').slice(0, 2);
    midSub.forEach(s => { skips[s.customerId] = [T.nextDateForWeekday(3)]; });
    const pauseSub = pop.subs.filter(s => s.weekday === 2 && s.customerId !== 'c-huber')[3];
    const pauses = pauseSub ? [{ id: 'p-1', customerId: pauseSub.customerId, from: T.addDays(today, 1), to: T.addDays(today, 10) }] : [];
    return {
      regions, drivers: DRIVERS.map(d => Object.assign({}, d)), capacity: defaultCapacity(), products,
      offers: worldOffers(),
      weeklySpecial: { productId: 'nussbrot', title: 'Brot der Woche', text: 'Mit Walnüssen und Haselnüssen, frisch aus dem Ofen.', pct: 0 }, customers, subs: pop.subs, skips, pauses, flexOrders,
      waitlist: buildWaitlist(rng, today),
      notifications: buildHuberInbox(today),
      campaigns: pastCampaigns(pop.customers, pop.subs),
      deliveries: buildTodayDeliveries(rng, today, pop.subs, customers),
      bakeryOrders: {}, toursSent: {}
    };
  }

  App.data = { seed, draftDefaults, mulberry32, unitCost };
})(typeof window !== 'undefined' ? window : globalThis);
