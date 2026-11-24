/* Tourenplanung: Winkel-Sweep auf Fahrer, Nearest-Neighbour, 2-opt (offener Pfad). Rein und deterministisch. */
(function (root) {
  const App = root.App = root.App || {};

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  // Stopps nach Winkel um das Depot sortieren und in gleich große Sektoren teilen.
  // Der Schnitt liegt in der größten Winkellücke, damit Siedlungen möglichst ganz bleiben.
  function splitSectors(depot, stops, k) {
    if (k <= 1 || stops.length === 0) return [stops.slice()];
    const items = stops.map(s => ({ s, a: Math.atan2(s.y - depot.y, s.x - depot.x) }));
    items.sort((p, q) => p.a - q.a || (p.s.id < q.s.id ? -1 : 1));
    let cut = 0, best = -1;
    for (let i = 0; i < items.length; i++) {
      const next = items[(i + 1) % items.length].a + (i + 1 === items.length ? 2 * Math.PI : 0);
      const gap = next - items[i].a;
      if (gap > best) { best = gap; cut = (i + 1) % items.length; }
    }
    const ring = items.slice(cut).concat(items.slice(0, cut)).map(x => x.s);
    const groups = [];
    for (let g = 0; g < k; g++) {
      groups.push(ring.slice(Math.round(g * ring.length / k), Math.round((g + 1) * ring.length / k)));
    }
    return groups;
  }

  function nearestNeighbour(depot, stops) {
    const left = stops.slice(), order = [];
    let cur = depot;
    while (left.length) {
      let bi = 0, bd = Infinity;
      for (let i = 0; i < left.length; i++) {
        const d = dist(cur, left[i]);
        if (d < bd - 1e-12 || (Math.abs(d - bd) <= 1e-12 && left[i].id < left[bi].id)) { bd = d; bi = i; }
      }
      cur = left.splice(bi, 1)[0];
      order.push(cur);
    }
    return order;
  }

  // 2-opt auf offenem Pfad: Depot fest am Anfang, Ende frei.
  function twoOpt(depot, order) {
    const p = [depot].concat(order);
    const n = p.length;
    let improved = true, guard = 0;
    while (improved && guard++ < 60) {
      improved = false;
      for (let i = 1; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
          const before = dist(p[i - 1], p[i]) + (j + 1 < n ? dist(p[j], p[j + 1]) : 0);
          const after = dist(p[i - 1], p[j]) + (j + 1 < n ? dist(p[i], p[j + 1]) : 0);
          if (after < before - 1e-9) {
            for (let a = i, b = j; a < b; a++, b--) { const t = p[a]; p[a] = p[b]; p[b] = t; }
            improved = true;
          }
        }
      }
    }
    return p.slice(1);
  }

  function buildTour(opts, order) {
    const per = opts.roadFactor, speed = opts.speedKmh / 60;   // km pro Minute
    let t = opts.startMin, km = 0, cur = opts.depot;
    const stops = order.map((s, i) => {
      const leg = dist(cur, s) * per;
      t += leg / speed;
      const eta = t;
      t += opts.serviceMin;
      km += leg;
      cur = s;
      return { id: s.id, seq: i + 1, etaMin: Math.round(eta), legKm: Math.round(leg * 10) / 10 };
    });
    return { stops, km: Math.round(km * 10) / 10, endMin: Math.round(t) };
  }

  function plan(opts) {
    const o = Object.assign({ drivers: 1, startMin: 240, speedKmh: 30, roadFactor: 1.3, serviceMin: 1.5 }, opts);
    const groups = splitSectors(o.depot, o.stops || [], Math.max(1, o.drivers | 0));
    const tours = groups.map(g => buildTour(o, twoOpt(o.depot, nearestNeighbour(o.depot, g))));
    return {
      tours,
      km: Math.round(tours.reduce((a, t) => a + t.km, 0) * 10) / 10,
      endMin: tours.reduce((a, t) => Math.max(a, t.endMin), o.startMin)
    };
  }

  App.routing = { plan, dist };
})(typeof window !== 'undefined' ? window : globalThis);
