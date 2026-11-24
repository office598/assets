/* Konfiguration: Marke, Regeln, Preise, Beschriftungen. Änderungen hier wirken überall. */
(function (root) {
  const App = root.App = root.App || {};

  App.config = {
    brand: {
      name: 'Semmelengel',
      claim: 'Frisches Gebäck an Ihrer Tür. Noch bevor Sie aufstehen.',
      domain: 'semmelengel.example'
    },
    cutoff: { h: 16, m: 30 },                       // Bestellschluss am Vortag; für Sa, So und Mo gilt Freitag
    deadlineMin: { weekday: 390, weekend: 510 },    // 06:30 / 08:30
    tour: {
      startMin: { weekday: 210, weekend: 270 },     // 03:30 / 04:30
      speedKmh: 40,
      roadFactor: 1.3,
      serviceMin: 2.0                               // Minuten je Stopp (kalibriert, siehe tools/test-core.mjs)
    },
    capacityDefaults: {
      stopsPerDriver: { weekday: 38, weekend: 55 },
      flexQuota: 3,
      fewThreshold: 4
    },
    // Kundenpreise inkl. USt (netto rund 1,60 / 2,50). freeDeliveryFrom: null = keine Gratis-Zustellung ab Bestellwert.
    fees: { abo: 1.75, aboWeekend: 2.75, flex: 2.50, flexWeekend: 3.50, flexMinOrder: 6.00, freeDeliveryFrom: null },
    // Schätzwerte des Auftraggebers: alle Wirtschaftlichkeits-Beträge netto; Einkauf = Ladenpreis minus purchaseDiscount.
    economics: { driverPerPiece: 0.36, kmCost: 0.50, driverMinPerTour: 50, vatRate: 0.10, shopMarkup: 0.10, purchaseDiscount: 0.25, extrasCostShare: 0.70 },
    promo: { weakBelowPct: 0.6, weakDayFreeWeeks: 4, referralCredit: 5 },
    reserveHours: 24,
    season: { id: 'nikolo', title: 'Nikolo-Sackerl', dateKey: '2026-12-06', productId: 'box-nikolo' },
    photos: {},                                     // Manifest id → Pfad, z. B. { hero: 'img/hero.jpg' }. Leer = Illustrationen.
    labels: {
      allergens: {
        A: 'Glutenhaltiges Getreide', B: 'Krebstiere', C: 'Eier', D: 'Fisch', E: 'Erdnüsse', F: 'Soja', G: 'Milch und Laktose',
        H: 'Schalenfrüchte', L: 'Sellerie', M: 'Senf', N: 'Sesam', O: 'Sulfite', P: 'Lupinen', R: 'Weichtiere'
      },
      effective: {
        free: 'frei', few: 'wenige Plätze', full: 'ausgebucht', closed: 'gesperrt',
        reserved: 'für Sie reserviert', booked: 'gebucht', planned: 'in Planung'
      },
      capStatus: { open: 'Offen', waitlist: 'Warteliste', closed: 'Gesperrt' },
      cat: {
        gebaeck: 'Semmeln & Weckerl', suess: 'Süßes', brot: 'Brot',
        extras: 'Frühstücks-Extras', boxen: 'Frühstücks-Sackerl'
      },
      placement: {
        tuerschnalle: 'Sackerl an die Türschnalle',
        'vor-der-tuer': 'Vor die Wohnungstür',
        box: 'In die Zeitungsbox',
        hinweis: 'Eigener Hinweis'
      }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
