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
      startMin: { weekday: 240, weekend: 300 },
      speedKmh: 30,
      roadFactor: 1.3,
      serviceMin: 1.7                               // Minuten je Stopp (kalibriert, siehe tools/test-core.mjs)
    },
    capacityDefaults: {
      stopsPerDriver: { weekday: 60, weekend: 95 },
      flexQuota: 6,
      fewThreshold: 8
    },
    fees: { abo: 1.20, flex: 2.40, flexMinOrder: 6.00 },
    promo: { weakBelowPct: 0.6, weakDayFreeWeeks: 4, referralCredit: 5 },
    reserveHours: 24,
    season: { id: 'nikolo', title: 'Nikolo-Sackerl', dateKey: '2026-12-06', productId: 'box-nikolo' },
    photos: {},                                     // Manifest id → Pfad, z. B. { hero: 'img/hero.jpg' }. Leer = Illustrationen.
    labels: {
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
