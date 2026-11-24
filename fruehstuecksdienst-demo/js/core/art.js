/* Semmelengel – Illustrationen (V6). Flache Formen, nur Token-Farben. */
(function (root) {
  const App = root.App = root.App || {};

  /* ---------- Hilfsfunktionen (lesen App.lib erst beim Zeichnen) ---------- */
  const h = (...a) => App.lib.h(...a);
  const col = (t) => (t === 'none' ? 'none' : 'var(--' + t + ')');
  const f1 = (n) => Math.round(n * 10) / 10;
  const C = (cx, cy, r, f, o) => h('circle', { cx, cy, r, fill: col(f), ...o });
  const El = (cx, cy, rx, ry, f, o) => h('ellipse', { cx, cy, rx, ry, fill: col(f), ...o });
  const Rc = (x, y, w, hh, r, f, o) => h('rect', { x, y, width: w, height: hh, rx: r, fill: col(f), ...o });
  const Pa = (d, f, o) => h('path', { d, fill: col(f), ...o });
  const St = (d, c, w, o) => h('path', { d, fill: 'none', stroke: col(c), 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...o });
  const G = (o, ...k) => h('g', o, ...k);
  const op = (n) => ({ 'fill-opacity': n });
  const rot = (a, x, y) => ({ transform: 'rotate(' + a + ' ' + x + ' ' + y + ')' });
  const at = (x, y, s, a) => ({ transform: 'translate(' + x + ' ' + y + ')' + (a ? ' rotate(' + a + ')' : '') + (s && s !== 1 ? ' scale(' + s + ')' : '') });
  const shade = (d) => Pa(d, 'ink', op(0.14));
  const light = (d) => Pa(d, 'milk', op(0.45));
  const ground = (cx, cy, rx, ry) => El(cx, cy, rx, ry || rx * 0.2, 'ink', op(0.15));

  // gleichmäßig gestreute Körner (Goldener Winkel), stretch > 1 = Samen
  function scatter(cx, cy, rx, ry, n, f, r, stretch, o) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = Math.sqrt((i + 0.5) / n), a = i * 2.39996;
      const x = f1(cx + rx * t * Math.cos(a)), y = f1(cy + ry * t * Math.sin(a));
      out.push(El(x, y, r * (stretch || 1), r, f, { ...rot((i * 53) % 180, x, y), ...o }));
    }
    return out;
  }

  // Kaiserstern: fünf geschwungene Einschnitte um den Mittelpunkt
  function star(r, w, color) {
    const out = [];
    for (let i = 0; i < 5; i++) {
      const a = (i * 72 - 90) * Math.PI / 180;
      const p = (rad, da) => f1(rad * Math.cos(a + da)) + ' ' + f1(rad * Math.sin(a + da));
      out.push(St('M' + p(r * 0.1, 0) + ' Q' + p(r * 0.6, -0.6) + ' ' + p(r * 0.95, 0.25), color, w));
    }
    out.push(C(0, 0, r * 0.1, color));
    return out;
  }

  // Sackerl (Papiertüte) mit gefaltetem Rand
  function bag(x, y, w, hh, o) {
    return G(o,
      Rc(x, y, w, hh, 4, 'kraft'),
      Pa('M' + (x + w * 0.74) + ' ' + y + 'h' + (w * 0.26) + 'v' + (hh - 4) + 'q0 4 -4 4h' + (-w * 0.26) + 'z', 'ink', op(0.12)),
      Rc(x + 3, y + hh * 0.2, w * 0.1, hh * 0.72, 3, 'milk', op(0.3)),
      Rc(x, y, w, hh * 0.17, 3, 'kraft'),
      Rc(x, y + hh * 0.14, w, hh * 0.035, 1.5, 'kraft-ink', op(0.4)),
      Rc(x + w * 0.74, y, w * 0.26, hh * 0.17, 3, 'ink', op(0.1)),
      St('M' + (x + w * 0.2) + ' ' + (y + hh * 0.07) + 'h' + (w * 0.3), 'kraft-ink', 1.6, { 'stroke-opacity': 0.45 }));
  }

  // Glas-Kappe / Deckel
  const cap = (x, y, w, hh, f) => G(null, Rc(x, y, w, hh, 3, f), Rc(x + 2, y + 1.5, w * 0.25, hh - 3, 1.5, 'milk', op(0.35)));

  /* ---------- Gebäck ---------- */
  function kaisersemmel() {
    return [ground(60, 100, 38, 7),
      El(60, 66, 41, 36, 'crust-3'), El(59, 61, 39, 34, 'crust-2'), El(57, 58, 35, 30, 'crust-1'),
      El(42, 42, 15, 7, 'crumb', { ...op(0.5), ...rot(-28, 42, 42) }),
      G(at(58, 59, 1), G({ transform: 'scale(1 0.88)' }, star(30, 3.6, 'crust-3'))),
      El(76, 76, 12, 5, 'crust-2', { ...op(0.55), ...rot(-25, 76, 76) })];
  }
  function handsemmel() {
    return [ground(60, 98, 42, 7),
      Pa('M14 82C14 50 36 32 60 32s46 18 46 50c0 12-20 18-46 18S14 94 14 82z', 'crust-3'),
      Pa('M17 80C17 53 37 35 60 35s43 18 43 45c0 9-18 13-43 13S17 89 17 80z', 'crust-2'),
      Pa('M24 66C26 48 40 38 56 38c-12 6-20 18-22 32z', 'crust-1'),
      St('M52 46C68 56 70 72 62 90', 'crust-3', 3.2),
      scatter(52, 54, 26, 14, 16, 'crumb', 1.6, 1, op(0.9)),
      G(null, St('M98 96C100 88 102 84 108 80', 'leaf', 2.4), El(100, 84, 8, 4, 'leaf', rot(-50, 100, 84)), El(108, 94, 8, 4, 'leaf', { ...rot(30, 108, 94), ...op(0.8) }))];
  }
  function kornweckerl() {
    return [ground(60, 100, 40, 7),
      G(rot(-18, 60, 62),
        El(60, 68, 46, 25, 'crust-3'), El(60, 64, 45, 23, 'crust-2'), El(56, 61, 38, 17, 'crust-1'),
        St('M24 60Q60 50 96 60', 'crust-3', 3, { 'stroke-opacity': 0.6 }),
        scatter(58, 62, 38, 15, 34, 'crust-4', 1.9, 1.7),
        scatter(60, 64, 36, 14, 18, 'yolk', 1.7, 1.7),
        scatter(58, 60, 34, 13, 12, 'crumb', 1.6, 1.7),
        El(34, 50, 14, 4, 'crumb', op(0.4)))];
  }
  function salzstangerl() {
    const body = 'M6 66C30 44 90 44 114 66C90 86 30 86 6 66z';
    return [ground(60, 100, 42, 6),
      G(rot(-20, 60, 64),
        Pa(body, 'crust-3', { transform: 'translate(0 5)' }),
        Pa(body, 'crust-2'),
        Pa('M12 63C34 48 86 48 108 63C86 56 34 56 12 63z', 'crust-1'),
        [26, 38, 50, 62, 74, 86, 98].map((x) => St('M' + (x - 3) + ' ' + (58 + Math.abs(60 - x) * 0.12) + 'Q' + (x + 3) + ' 68 ' + (x - 3) + ' ' + (78 - Math.abs(60 - x) * 0.14), 'crust-3', 2.4, { 'stroke-opacity': 0.85 })),
        scatter(60, 58, 42, 6, 24, 'milk', 1.9, 1.2))];
  }
  function mohnflesserl() {
    return [ground(60, 100, 40, 7),
      G(rot(-14, 60, 62),
        El(60, 66, 44, 26, 'crust-3'), El(60, 62, 43, 24, 'crust-2'),
        [0, 1, 2, 3, 4].map((i) => El(26 + i * 17, 62, 11, 22, i % 2 ? 'crust-2' : 'crust-1', rot(i % 2 ? -22 : 22, 26 + i * 17, 62))),
        [0, 1, 2, 3].map((i) => St('M' + (34 + i * 17) + ' 42Q' + (40 + i * 17) + ' 62 ' + (34 + i * 17) + ' 82', 'crust-3', 2.2, { 'stroke-opacity': 0.7 })),
        scatter(60, 60, 36, 17, 44, 'night-2', 1.6, 1),
        El(34, 46, 14, 3.5, 'crumb', op(0.45)))];
  }
  function laugenbreze() {
    const arch = 'M22 98C6 62 22 24 60 24s54 38 38 74';
    const a1 = 'M22 98C40 74 66 60 94 54', a2 = 'M98 98C80 74 54 60 26 54';
    return [ground(60, 106, 40, 5),
      St(arch, 'crust-4', 13), St(a1, 'crust-4', 13), St(a2, 'crust-4', 13),
      St(arch, 'crust-3', 8, { transform: 'translate(-1.5 -1.5)' }), St(a1, 'crust-3', 8, { transform: 'translate(-1 -1.5)' }), St(a2, 'crust-3', 8, { transform: 'translate(-1 -1.5)' }),
      St('M30 40C38 30 48 27 58 27', 'crust-2', 3, { 'stroke-opacity': 0.8 }),
      [[26, 52], [34, 36], [86, 36], [96, 52], [48, 62], [72, 62], [60, 26], [96, 74], [24, 76]].map((p) => El(p[0], p[1], 2.3, 1.6, 'milk', rot(p[0] * 3, p[0], p[1])))];
  }
  function dinkelweckerl() {
    return [ground(60, 100, 40, 7),
      G(rot(12, 60, 64),
        El(60, 68, 42, 28, 'crust-4'), El(60, 64, 41, 26, 'crust-3'), El(57, 61, 34, 20, 'crust-2'),
        scatter(58, 62, 33, 17, 30, 'crumb', 1.8, 1.7, op(0.85)),
        scatter(60, 64, 30, 14, 14, 'crust-1', 1.7, 1.7),
        St('M28 62Q60 50 92 62', 'crust-4', 2.6, { 'stroke-opacity': 0.8 }),
        El(36, 48, 12, 3.5, 'crumb', op(0.4))),
      G(null, St('M96 100C97 88 97 78 98 66', 'leaf', 2),
        [0, 1, 2].map((i) => G(null, El(93, 88 - i * 9, 3, 5.5, 'yolk', rot(-25, 93, 88 - i * 9)), El(101, 84 - i * 9, 3, 5.5, 'yolk', rot(25, 101, 84 - i * 9)))),
        El(98, 62, 3, 6, 'yolk'))];
  }

  /* ---------- Süßes ---------- */
  function buttercroissant() {
    const R = 36, cx = 60, cy = 98;
    const ts = [-1, 1, -0.5, 0.5, 0];
    const pos = (t) => { const th = 270 + t * 62, a = th * Math.PI / 180; return [cx + R * Math.cos(a), cy + R * Math.sin(a), th - 270, Math.abs(t)]; };
    const seg = (t, f, dx, dy, sc) => { const p = pos(t); const x = f1(p[0] + dx), y = f1(p[1] + dy); return El(x, y, f1((13 + 6 * (1 - p[3])) * sc), f1((11 + 16 * (1 - p[3] * p[3])) * sc), f, rot(f1(p[2]), x, y)); };
    return [ground(60, 102, 42, 7),
      ts.map((t) => seg(t, 'crust-3', 1.5, 3, 1)),
      ts.map((t) => seg(t, 'crust-2', 0, 0, 1)),
      ts.map((t) => seg(t, 'crust-1', -2, -3.5, 0.62)),
      ts.map((t) => { const p = pos(t); const x = f1(p[0] - 3), y = f1(p[1] - 9 * (1 - p[3] * 0.4)); return El(x, y, 4, 1.8, 'crumb', { ...op(0.65), ...rot(f1(p[2]), x, y) }); })];
  }
  function topfengolatsche() {
    return [ground(60, 102, 40, 6),
      G(rot(-8, 60, 60),
        Rc(18, 20, 84, 82, 12, 'crust-3', { transform: 'translate(0 4)' }),
        Rc(18, 20, 84, 82, 12, 'crust-2'),
        Rc(23, 24, 62, 60, 9, 'crust-1', op(0.55)),
        Pa('M60 30L96 62 60 94 24 62z', 'milk'),
        Pa('M60 30L96 62 60 94 24 62z', 'none', { stroke: col('crust-3'), 'stroke-width': 2.4, 'stroke-linejoin': 'round' }),
        Pa('M60 38L74 62 60 86 46 62z', 'butter', op(0.5)),
        [[24, 24, 36, 40], [96, 24, 84, 40], [24, 100, 36, 84], [96, 100, 84, 84]].map((p) => St('M' + p[0] + ' ' + p[1] + 'L' + p[2] + ' ' + p[3], 'crust-3', 2.6, { 'stroke-opacity': 0.7 })),
        El(36, 34, 8, 3, 'crumb', { ...op(0.55), ...rot(-35, 36, 34) }))];
  }
  function nussschnecke() {
    const sp = (r0, k, turns, off) => {
      let d = '';
      for (let i = 0; i <= turns * 24; i++) {
        const th = i * Math.PI / 12, r = r0 + k * th;
        d += (i ? 'L' : 'M') + f1(60 + off + r * Math.cos(th)) + ' ' + f1(58 + off + r * Math.sin(th));
      }
      return d;
    };
    return [ground(60, 100, 40, 7),
      C(61, 62, 40, 'crust-4'), C(60, 58, 40, 'crust-3'), C(59, 56, 36, 'crust-2'),
      St(sp(3, 1.7, 3.6, 0), 'crust-4', 5.2, { 'stroke-opacity': 0.9 }),
      St(sp(3, 1.7, 3.6, -1.5), 'crust-1', 2.2, { 'stroke-opacity': 0.9 }),
      [[44, 36], [78, 44], [38, 70], [74, 82], [58, 26], [86, 66]].map((p, i) => El(p[0], p[1], 5, 3.2, i % 2 ? 'crust-4' : 'crust-3', rot(i * 40, p[0], p[1]))),
      El(40, 36, 14, 5, 'crumb', { ...op(0.4), ...rot(-35, 40, 36) })];
  }
  function marillenkrapfen() {
    return [ground(60, 102, 38, 6),
      C(60, 62, 40, 'crust-3'), C(59, 60, 38, 'crust-2'),
      Pa('M23 66C22 50 36 38 60 38s38 12 37 28C80 74 40 74 23 66z', 'crust-1', op(0.55)),
      Pa('M22 62C21 74 38 84 60 84s39-10 38-22C80 70 40 70 22 62z', 'crumb', { ...op(0.9), transform: 'translate(0 1)' }),
      Pa('M22 64C40 72 80 72 98 64', 'none', { stroke: col('crust-2'), 'stroke-width': 1.6 }),
      scatter(56, 42, 22, 9, 22, 'milk', 1.8, 1),
      C(60, 46, 11, 'crust-2'), C(60, 46, 8, 'sun'), El(57, 43.5, 3.5, 2, 'butter', rot(-30, 57, 43.5)),
      El(36, 54, 8, 3.5, 'crumb', { ...op(0.45), ...rot(-45, 36, 54) })];
  }
  function briochestriezel() {
    const rows = [0, 1, 2, 3, 4, 5, 6];
    return [ground(60, 102, 44, 6),
      G(rot(-24, 60, 62),
        Rc(10, 44, 100, 38, 19, 'crust-3', { transform: 'translate(0 4)' }),
        rows.map((i) => El(20 + i * 13.3, 62, 8.5, 21, i % 2 ? 'crust-2' : 'crust-1', rot(i % 2 ? 24 : -24, 20 + i * 13.3, 62))),
        rows.slice(0, 6).map((i) => El(27 + i * 13.3, 62, 7.5, 20, i % 2 ? 'crust-1' : 'crust-2', rot(i % 2 ? -24 : 24, 27 + i * 13.3, 62))),
        El(60, 50, 40, 3.4, 'butter', op(0.55)),
        scatter(60, 64, 40, 12, 20, 'milk', 2, 1.4))];
  }

  /* ---------- Brot ---------- */
  function bauernbrot() {
    return [ground(60, 100, 44, 7),
      El(60, 66, 46, 34, 'crust-4'), El(60, 62, 45, 32, 'crust-3'), El(58, 59, 41, 28, 'crust-2'),
      El(44, 44, 16, 6, 'crust-1', { ...op(0.7), ...rot(-25, 44, 44) }),
      St('M36 52L84 76M80 48L40 78', 'crust-1', 4.4, { 'stroke-opacity': 0.9 }),
      St('M36 52L84 76M80 48L40 78', 'crumb', 1.6, { 'stroke-opacity': 0.8 }),
      scatter(60, 60, 34, 20, 28, 'crumb', 1.4, 1, op(0.55))];
  }
  function slice(cx, cy, sc, f) {
    return G(at(cx, cy, sc),
      Pa('M-18 22V-6C-18-22-6-26 0-26s18 4 18 20V22c0 3-2 4-5 4h-26c-3 0-5-1-5-4z', 'crust-3'),
      Pa('M-14 21V-5C-14-18-5-21 0-21s14 3 14 16V21z', f || 'crumb'),
      [[-6, -8], [6, 0], [-4, 8], [5, 14], [-8, 16]].map((p) => C(p[0], p[1], 1.5, 'crust-1', op(0.9))));
  }
  function dinkelbrot() {
    return [ground(60, 102, 46, 7),
      Rc(10, 44, 76, 50, 22, 'crust-4'), Rc(10, 40, 76, 50, 22, 'crust-3'), Rc(12, 40, 72, 42, 20, 'crust-2'),
      [0, 1, 2].map((i) => St('M' + (26 + i * 18) + ' 46l10 24', 'crust-1', 4.5)),
      [0, 1, 2].map((i) => St('M' + (26 + i * 18) + ' 46l10 24', 'crumb', 1.5, { 'stroke-opacity': 0.7 })),
      scatter(48, 74, 28, 6, 14, 'crumb', 1.4, 1.6, op(0.8)),
      El(26, 50, 10, 3.2, 'crumb', { ...op(0.4), ...rot(-20, 26, 50) }),
      slice(92, 74, 0.9),
      G(null, St('M104 100C105 92 106 84 106 76', 'leaf', 1.8), [0, 1].map((i) => El(103, 90 - i * 8, 2.4, 4.5, 'yolk', rot(-20, 103, 90 - i * 8))))];
  }
  function walnut(x, y, s, a) {
    return G(at(x, y, s, a), Pa('M-12 2C-14-10-4-15 0-15s14 5 12 17C10 12 4 14 0 14S-9 12-12 2z', 'crust-3'),
      St('M0-14V13', 'crust-4', 1.6), St('M-6-6c2 3 2 8 0 12M6-6c-2 3-2 8 0 12', 'crust-4', 1.2, { 'stroke-opacity': 0.8 }),
      El(-6, -8, 3.5, 2, 'crust-1', op(0.6)));
  }
  function nussbrot() {
    return [ground(60, 102, 46, 7),
      Pa('M12 92V60C12 40 30 32 52 32s42 8 42 28v32c0 4-3 6-6 6H18c-3 0-6-2-6-6z', 'crust-4'),
      Pa('M14 86V60C14 42 31 35 52 35s40 7 40 25v26z', 'crust-3'),
      Pa('M16 60C17 46 32 38 50 38c-14 6-22 16-24 30-4 0-9-2-10-8z', 'crust-2', op(0.8)),
      walnut(40, 58, 1, -10), walnut(64, 52, 1, 15), walnut(52, 74, 0.9, 5), walnut(78, 74, 0.9, -15),
      scatter(54, 56, 34, 22, 14, 'crust-1', 1.6, 1.4, op(0.8)),
      walnut(104, 90, 1.1, 20)];
  }

  /* ---------- Extras ---------- */
  function teebutter() {
    return [ground(60, 102, 46, 6),
      Pa('M8 98L22 76H108L96 100z', 'kraft'), shade('M96 100L108 76V80L98 104z'),
      Pa('M22 62H80V92H22z', 'butter'), light('M24 64h5v26h-5z'),
      Pa('M22 62L38 46H96L80 62z', 'butter'), Pa('M22 62L38 46H96L80 62z', 'milk', op(0.5)),
      Pa('M80 62L96 46V76L80 92z', 'butter'), shade('M80 62L96 46V76L80 92z'),
            St('M34 78h16M34 84h10', 'crust-2', 2, { 'stroke-opacity': 0.55 }),
      El(42, 54, 14, 2.4, 'milk', { ...op(0.7), ...rot(-18, 42, 54) })];
  }
  function jarBase(x, y, w, hh, fill) {
    return [Rc(x, y, w, hh, 12, fill), shade('M' + (x + w * 0.72) + ' ' + (y + 2) + 'h' + (w * 0.28 - 12) + 'q12 0 12 12v' + (hh - 24) + 'q0 12-12 12h' + (-(w * 0.28 - 12)) + 'z'),
      Rc(x + 6, y + 8, 5, hh - 22, 2.5, 'milk', op(0.5))];
  }
  function marillenmarmelade() {
    return [ground(60, 102, 36, 6),
      jarBase(30, 48, 60, 54, 'sun'),
      Rc(30, 48, 60, 8, 4, 'crust-3', op(0.35)),
      El(60, 76, 15, 14, 'milk'), El(60, 76, 15, 14, 'none', { stroke: col('kraft'), 'stroke-width': 1.6 }),
      C(60, 77, 7, 'sun'), El(57.5, 75, 2.6, 1.6, 'butter', rot(-30, 57.5, 75)), El(66, 68, 5, 2.5, 'leaf', rot(-30, 66, 68)),
      // Stoffhaube
      Pa('M26 52C26 44 34 42 40 42c4-4 36-4 40 0 6 0 14 2 14 10-6 4-10-2-14 0-4 3-8 0-13 0s-9 3-13 0c-4-2-8 4-14 0z', 'berry'),
      light('M32 46h18'), C(40, 46, 2, 'milk', op(0.6)), C(60, 45, 2, 'milk', op(0.6)), C(80, 46, 2, 'milk', op(0.6)),
      Rc(28, 54, 64, 3.5, 1.7, 'kraft-ink')];
  }
  function bluetenhonig() {
    return [ground(60, 102, 38, 6),
      jarBase(26, 48, 62, 54, 'yolk'),
      Pa('M26 60h62v6c-8 4-14 0-20 0s-12 4-20 0-14 2-22 0z', 'crust-2', op(0.3)),
      Rc(24, 38, 66, 12, 4, 'kraft-ink'), Rc(28, 40, 8, 8, 2, 'milk', op(0.3)),
      Pa('M44 50v12a4 4 0 008 0V50z', 'yolk'),
      Pa('M40 92l-6-10 0-10 6-6h12l6 6v10l-6 10z', 'milk', { transform: 'translate(10 -2)' }),
      Pa('M50 87l-4-7v-7l4-4h8l4 4v7l-4 7z', 'yolk'),
      // Honiglöffel
      St('M100 98L92 54', 'crust-3', 3.2), Rc(87, 36, 14, 22, 6, 'crust-2', rot(8, 94, 47)),
      [40, 46, 52].map((y) => St('M88 ' + y + 'h12', 'crust-3', 1.6, rot(8, 94, 47)))];
  }
  function beinschinken() {
    const sl = (cx, cy, a, k) => G(rot(a, cx, cy),
      El(cx + 1, cy + 3, 34, 24, 'ink', op(0.1)),
      El(cx, cy, 34, 24, 'milk'), El(cx, cy, 30, 20, 'berry', op(0.7 + k)),
      El(cx - 6, cy - 6, 14, 6, 'milk', op(0.25)),
      St('M' + (cx - 20) + ' ' + (cy + 4) + 'q10-8 20 0t20-2', 'milk', 1.8, { 'stroke-opacity': 0.5 }));
    return [ground(60, 102, 44, 6),
      G(rot(-30, 94, 40), Rc(78, 34, 30, 10, 5, 'crumb'), C(78, 39, 8, 'crumb'), C(110, 39, 7, 'crumb'), C(108, 33, 4, 'crumb'), C(108, 45, 4, 'crumb')),
      sl(48, 54, -18, 0), sl(62, 66, 6, 0.12), sl(54, 80, -6, 0.2),
      El(98, 94, 9, 4, 'leaf', rot(-30, 98, 94)), El(106, 88, 8, 4, 'leaf', rot(-70, 106, 88))];
  }
  function bergkaese() {
    return [ground(60, 100, 46, 6),
      Pa('M12 76L96 50V92H12z', 'yolk'),
      Pa('M12 76L96 50L110 58L30 84z', 'yolk'), light('M12 76L96 50L110 58L30 84z'),
      Pa('M96 50L110 58V90L96 92z', 'crust-2'), Pa('M96 50L110 58V90L96 92z', 'crust-3', op(0.45)),
      Rc(12, 86, 84, 6, 2, 'crust-2', op(0.7)),
      El(36, 82, 6, 4, 'crust-2', op(0.5)), El(62, 76, 8, 5, 'crust-2', op(0.5)), El(78, 84, 4.5, 3, 'crust-2', op(0.5)), El(52, 87, 3, 2, 'crust-2', op(0.5)),
      El(44, 66, 4, 2.4, 'crust-2', op(0.5)), El(70, 59, 4.5, 2.8, 'crust-2', op(0.5)),
      El(24, 68, 8, 2.4, 'milk', { ...op(0.5), ...rot(-14, 24, 68) })];
  }
  function freilandeier() {
    const egg = (x, y, f, big) => G(null, El(x, y, big ? 14 : 13, big ? 17 : 16, f), El(x + 4, y + 4, 9, 11, 'ink', op(0.1)), El(x - 4, y - 6, 4, 6, 'milk', { ...op(0.7), ...rot(20, x - 4, y - 6) }));
    return [ground(60, 102, 50, 6),
      Rc(10, 52, 100, 36, 6, 'kraft'),
      egg(32, 54, 'crumb'), egg(60, 50, 'crust-1'), egg(88, 54, 'crumb'),
      egg(34, 66, 'crust-1', 1), egg(60, 68, 'crumb', 1), egg(86, 66, 'crumb', 1),
      Pa('M8 70H112l-4 28c0 3-2 4-5 4H17c-3 0-5-1-5-4z', 'kraft'), shade('M80 70H112l-4 28c0 3-2 4-5 4H80z'),
      Pa('M8 70H112V76H8z', 'kraft-ink', op(0.28)),
      [24, 46, 68, 90].map((x) => Pa('M' + x + ' 76q8 8 16 0', 'none', { stroke: col('kraft-ink'), 'stroke-width': 2, 'stroke-opacity': 0.5 })),
      Rc(14, 78, 5, 16, 2.5, 'milk', op(0.3))];
  }
  function frischmilch() {
    return [ground(60, 104, 26, 5),
      Pa('M52 20h16v10c0 6 12 10 12 24v38c0 8-5 12-12 12H52c-7 0-12-4-12-12V54c0-14 12-18 12-24z', 'milk'),
      Pa('M52 20h16v10c0 6 12 10 12 24v38c0 8-5 12-12 12H52c-7 0-12-4-12-12V54c0-14 12-18 12-24z', 'none', { stroke: col('info'), 'stroke-width': 2, 'stroke-opacity': 0.55 }),
      shade('M68 44c6 4 12 10 12 22v26c0 8-5 12-12 12z'),
      Rc(50, 14, 20, 11, 4, 'info'), Rc(52, 16, 5, 7, 2, 'milk', op(0.4)),
      Rc(40, 64, 40, 26, 0, 'info'), Rc(46, 64, 6, 26, 0, 'milk', op(0.25)),
      Pa('M60 70c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z', 'milk'),
      Rc(45, 44, 4, 14, 2, 'ink', op(0.07)), Rc(46, 36, 4, 8, 2, 'info', op(0.25))];
  }
  function orangensaft() {
    return [ground(60, 104, 46, 6),
      Pa('M32 26h14v14c0 6 8 8 8 22v34c0 6-4 8-8 8H32c-4 0-8-2-8-8V62c0-14 8-16 8-22z', 'butter', { transform: 'translate(0 -2)' }),
      Pa('M30 26h14v14c0 6 8 8 8 22v34c0 6-4 8-8 8H30c-4 0-8-2-8-8V62c0-14 8-16 8-22z', 'sun'),
      shade('M44 40c0 6 8 8 8 22v34c0 6-4 8-8 8z'),
      Rc(28, 18, 18, 10, 3, 'leaf'), Rc(30, 20, 5, 6, 2, 'milk', op(0.4)),
      Rc(27, 66, 6, 28, 3, 'milk', op(0.5)),
      Rc(22, 74, 30, 14, 0, 'milk', op(0.9)), C(37, 81, 4, 'sun'),
      C(80, 78, 26, 'crust-3'), C(80, 76, 25, 'sun'), El(70, 64, 10, 6, 'butter', { ...op(0.6), ...rot(-35, 70, 64) }),
      shade('M96 66c6 14-2 32-20 36 26 2 38-26 20-36z'),
      El(80, 55, 3, 2, 'crust-3', op(0.7)),
      El(90, 52, 11, 5, 'leaf', rot(-25, 90, 52)), St('M82 54Q88 52 96 50', 'leaf', 1.4, { stroke: col('ink'), 'stroke-opacity': 0.25 })];
  }
  function naturjoghurt() {
    return [ground(58, 104, 34, 5),
      Pa('M27 42H89L82 96q-1 7-8 7H42q-7 0-8-7z', 'milk'),
      Pa('M27 42H89L87 54H29z', 'none'),
      shade('M72 42H89L82 96q-1 7-8 7H70z'),
      Pa('M29.5 58H86.5L84.5 80H31.5z', 'info'), Rc(35, 58, 5, 22, 0, 'milk', op(0.3)),
      Pa('M58 64c3 4 5 6 5 9a5 5 0 01-10 0c0-3 2-5 5-9z', 'milk'),
      Rc(24, 34, 68, 10, 4, 'line'), Rc(28, 36, 20, 3, 1.5, 'milk', op(0.5)),
      Pa('M82 36l10-8c4-2 8 2 4 6l-6 4z', 'line'),
      G(null, C(100, 92, 8, 'berry'), El(100, 84, 6, 3, 'leaf', rot(-20, 100, 84)), El(97, 90, 2.4, 1.6, 'milk', op(0.6)))];
  }
  function liptauer() {
    return [ground(60, 102, 46, 6),
      Rc(14, 56, 92, 42, 12, 'kraft'), shade('M82 56h12q12 0 12 12v18q0 12-12 12H82z'),
      Rc(14, 68, 92, 8, 0, 'kraft-ink', op(0.35)),
      Rc(20, 62, 5, 28, 2.5, 'milk', op(0.35)),
      El(60, 56, 46, 15, 'kraft'), El(60, 56, 46, 15, 'none', { stroke: col('kraft-ink'), 'stroke-width': 1.6, 'stroke-opacity': 0.5 }),
      El(60, 57, 38, 10.5, 'sun'), El(56, 55, 28, 6, 'butter', op(0.55)),
      St('M34 57q10-5 20 0t20 0t12-2', 'sun', 2, { stroke: col('crust-2'), 'stroke-opacity': 0.8 }),
      scatter(60, 57, 34, 8, 14, 'berry', 1.5, 1, op(0.9)),
      [[44, 52], [58, 50], [72, 53], [82, 56]].map((p, i) => St('M' + p[0] + ' ' + p[1] + 'l' + (i % 2 ? 4 : -3) + ' -22', 'leaf', 2.2)),
      El(60, 56, 46, 15, 'none')];
  }
  function roestkaffee() {
    const bean = (x, y, a, s) => G(at(x, y, s, a), El(0, 0, 8, 5.4, 'crust-4'), El(-1, -1.4, 6, 2.4, 'crust-3', op(0.8)), St('M-7 0q4-3 7 0t7 0', 'crust-1', 1.1, { 'stroke-opacity': 0.6 }));
    return [ground(60, 104, 44, 6),
      Pa('M30 36H90L96 96c0 6-3 8-8 8H32c-5 0-8-2-8-8z', 'crust-4'),
      Pa('M66 36H90L96 96c0 6-3 8-8 8H66z', 'ink', op(0.18)),
      Rc(34, 44, 5, 50, 2.5, 'milk', op(0.22)),
      Pa('M26 36l4-14h60l4 14z', 'kraft'), Rc(26, 32, 68, 5, 2, 'kraft-ink', op(0.45)),
      St('M38 26h44', 'kraft-ink', 1.6, { 'stroke-opacity': 0.45 }),
      C(60, 70, 20, 'kraft'), C(60, 70, 20, 'none', { stroke: col('kraft-ink'), 'stroke-width': 1.6, 'stroke-opacity': 0.5 }),
      G(at(60, 70, 1.7, -30), El(0, 0, 8, 5.4, 'crust-4'), St('M-7 0q4-3 7 0t7 0', 'kraft', 1.5)),
      bean(100, 102, 20, 0.8), bean(16, 104, -25, 0.7)];
  }

  /* ---------- Boxen und Sackerl ---------- */
  function sackerlBeine(x, y, w) { return El(x, y, w, w * 0.4, 'ink', op(0.15)); }
  function boxSonntag() {
    return [ground(60, 102, 50, 6),
      G(null, St('M96 66Q92 40 98 22', 'leaf', 2.4), El(92, 44, 8, 3.5, 'leaf', rot(-40, 92, 44)), C(98, 20, 6, 'berry'), C(98, 20, 2.4, 'yolk'),
        C(92, 15, 5, 'berry'), C(104, 15, 5, 'berry'), C(92, 25, 5, 'berry'), C(104, 25, 5, 'berry'), C(98, 20, 3, 'yolk')),
      G(null, El(30, 58, 17, 15, 'crust-3'), El(30, 55, 16, 13, 'crust-2'), El(27, 52, 10, 7, 'crust-1', op(0.7)), G(at(30, 55, 0.3), star(26, 5, 'crust-3'))),
      G(null, El(60, 60, 14, 17, 'milk'), El(64, 63, 9, 11, 'ink', op(0.1)), El(56, 52, 3.5, 5, 'milk', op(0.8)), El(60, 58, 5, 5.4, 'yolk', op(0.0))),
      G(null, El(60, 50, 13, 6, 'crust-1'), El(60, 50, 9, 3.6, 'yolk')),
      Pa('M10 66H110L102 98c-1 4-3 5-7 5H25c-4 0-6-1-7-5z', 'kraft'), shade('M80 66H110L102 98c-1 4-3 5-7 5H80z'),
      Rc(10, 66, 100, 7, 3, 'kraft-ink', op(0.35)),
      Rc(48, 80, 24, 12, 6, 'berry'), Rc(52, 82, 5, 8, 2.5, 'milk', op(0.3)),
      Rc(16, 76, 5, 16, 2.5, 'milk', op(0.3))];
  }
  function boxFamilie() {
    return [ground(60, 104, 50, 6),
      G(rot(-12, 62, 50), Rc(20, 20, 70, 20, 10, 'crust-3'), Rc(20, 18, 70, 18, 9, 'crust-2'), St('M34 22l6 10M52 20l6 12M70 20l6 12', 'crust-1', 3.4)),
      Pa('M82 36h10v8c0 3 6 4 6 12v26H76V56c0-8 6-9 6-12z', 'milk'), Rc(80, 30, 12, 8, 3, 'info'),
      Pa('M32 40h12v10c0 4 6 5 6 12v30H26V62c0-7 6-8 6-12z', 'sun'), Rc(30, 34, 16, 8, 3, 'leaf'),
      G(null, Rc(52, 26, 24, 28, 7, 'berry'), Rc(52, 26, 24, 7, 3, 'kraft-ink'), Rc(56, 40, 8, 10, 4, 'milk', op(0.4))),
      Pa('M8 56H112L104 100c-1 4-3 5-7 5H23c-4 0-6-1-7-5z', 'kraft'), shade('M82 56H112L104 100c-1 4-3 5-7 5H82z'),
      Rc(8, 56, 104, 8, 3, 'kraft-ink', op(0.35)),
      Rc(14, 66, 5, 28, 2.5, 'milk', op(0.3)),
      Rc(40, 68, 40, 18, 5, 'milk'), St('M46 77h28', 'kraft-ink', 2, { 'stroke-opacity': 0.5 }), C(50, 77, 3.5, 'berry'), C(70, 77, 3.5, 'leaf')];
  }
  function boxBuero() {
    const buns = [];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) {
      const x = 24 + c * 18, y = 50 + r * 24, t = (r + c) % 3;
      buns.push(C(x, y + 3, 8.5, 'crust-3'), C(x, y, 8.5, 'crust-2'), El(x - 2, y - 2.5, 4.5, 3, 'crust-1', op(0.8)), G(at(x, y, 0.19), star(26, 6, 'crust-3')));
    }
    return [ground(60, 100, 54, 6),
      Pa('M6 30H114L108 90c-1 6-4 8-9 8H21c-5 0-8-2-9-8z', 'kraft-ink', op(0.9)),
      Pa('M6 30H114L111 40H9z', 'kraft'),
      Pa('M10 40H110L106 88c-1 4-3 6-7 6H21c-4 0-6-2-7-6z', 'kraft-ink'), Pa('M10 40H110L109 46H11z', 'ink', op(0.2)),
      buns,
      Rc(2, 90, 116, 12, 4, 'kraft'), Rc(2, 95, 116, 2.5, 1, 'kraft-ink', op(0.4)), Rc(4, 91, 30, 3, 1.5, 'milk', op(0.35)),
      Rc(50, 90, 20, 12, 3, 'berry', op(1)), Rc(53, 92, 5, 8, 2, 'milk', op(0.3))];
  }
  function boxNikolo() {
    return [ground(60, 104, 40, 6),
      Pa('M60 8l3.6 7.6 8.2 1.1-6 5.7 1.5 8.2L60 26.600l-7.300 3.700 1.500-8.200-6-5.700 8.200-1.100z', 'yolk'),
      C(44, 44, 12, 'sun'), El(40, 40, 4.5, 3, 'butter', rot(-30, 40, 40)), El(48, 33, 5, 2.6, 'leaf', rot(-30, 48, 33)),
      walnut(76, 44, 1.15, 12),
      bag(28, 48, 64, 56),
      Rc(28, 66, 64, 7, 0, 'berry'), Rc(28, 66, 64, 2, 0, 'milk', op(0.25)),
      Pa('M60 69C48 56 36 62 44 70c6 3 14-1 16-1z', 'berry'), Pa('M60 69C72 56 84 62 76 70c-6 3-14-1-16-1z', 'berry'),
      Pa('M56 72l-8 20 7-3 3 6z', 'berry'), Pa('M64 72l8 20-7-3-3 6z', 'berry'), C(60, 70, 5, 'berry'), C(58.500, 68.500, 1.800, 'milk', op(0.5)),
      Pa('M42 86l5-8 5 8z', 'butter'), Pa('M70 92l5-8 5 8z', 'butter', op(0.8))];
  }
  function neutral() {
    return [ground(60, 102, 36, 6),
      G(null, Rc(52, 22, 22, 22, 11, 'crust-2'), El(60, 30, 5, 9, 'crust-1', op(0.7))),
      bag(30, 36, 62, 64),
      Rc(46, 60, 30, 22, 11, 'milk', op(0.55)), Pa('M61 64l4 6 6 1-4.5 4.5 1 6-6.5-3-6.5 3 1-6-4.5-4.5 6-1z', 'sun', op(1))];
  }

  const PRODUCTS = {
    kaisersemmel, handsemmel, kornweckerl, salzstangerl, mohnflesserl, laugenbreze, dinkelweckerl,
    buttercroissant, topfengolatsche, nussschnecke, marillenkrapfen, briochestriezel,
    bauernbrot, dinkelbrot, nussbrot,
    teebutter, marillenmarmelade, bluetenhonig, beinschinken, bergkaese, freilandeier, frischmilch, orangensaft, naturjoghurt, liptauer, roestkaffee,
    'box-sonntag': boxSonntag, 'box-familie': boxFamilie, 'box-buero': boxBuero, 'box-nikolo': boxNikolo
  };

  /* ---------- Hero ---------- */
  function heroSky() {
    const stars = [[40, 30, 2.2, 0.95], [96, 62, 1.6, 0.8], [150, 22, 1.8, 0.9], [210, 54, 1.4, 0.6], [262, 18, 2.4, 0.9], [318, 46, 1.6, 0.6], [372, 24, 2, 0.8], [430, 58, 1.6, 0.5], [452, 20, 1.4, 0.7], [70, 108, 1.4, 0.45], [190, 100, 1.3, 0.35], [296, 98, 1.5, 0.4], [410, 102, 1.2, 0.3], [24, 150, 1.2, 0.25], [124, 140, 1.2, 0.25]];
    return [
      h('defs', null, h('linearGradient', { id: 'art-sky', x1: 0, y1: 0, x2: 0, y2: 1 },
        h('stop', { offset: 0, style: 'stop-color:var(--night)' }), h('stop', { offset: 0.38, style: 'stop-color:var(--night-2)' }),
        h('stop', { offset: 0.66, style: 'stop-color:var(--info)', 'stop-opacity': 0.8 }), h('stop', { offset: 0.88, style: 'stop-color:var(--sun)' }), h('stop', { offset: 1, style: 'stop-color:var(--butter)' }))),
      Rc(0, 0, 480, 260, 0, 'none', { fill: 'url(#art-sky)' }),
      stars.map((s) => C(s[0], s[1], s[2], 'milk', op(s[3]))),
      [[240, 40], [330, 80]].map((p) => Pa('M' + p[0] + ' ' + (p[1] - 7) + 'v14M' + (p[0] - 7) + ' ' + p[1] + 'h14', 'none', { stroke: col('milk'), 'stroke-width': 1.2, 'stroke-opacity': 0.5 })),
      // Sonne am Horizont mit weichen Ringen
      C(372, 238, 74, 'sun', op(0.12)), C(372, 238, 52, 'sun', op(0.2)), C(372, 238, 34, 'butter', op(0.9)),
      // Wolkenstreifen
      Rc(60, 176, 120, 8, 4, 'berry', op(0.35)), Rc(100, 192, 150, 7, 3.5, 'sun', op(0.35)), Rc(280, 164, 110, 6, 3, 'butter', op(0.4)),
      // ferne Hügel / Dächer
      Pa('M0 232C60 214 120 222 180 230s140-10 200-4 100 8 100 8V270H0z', 'night-2'),
      Pa('M0 246C80 232 150 244 230 244s170-8 250 0V280H0z', 'night')];
  }
  function heroHouse() {
    const win = (x, y, w, hh) => G(null, Rc(x, y, w, hh, 4, 'night'), Rc(x + 4, y + 4, w - 8, hh - 8, 2, 'butter', op(0.9)), Rc(x + w / 2 - 1.5, y + 4, 3, hh - 8, 0, 'night'), Rc(x + 4, y + hh / 2 - 1.5, w - 8, 3, 0, 'night'));
    return [
      // Hauswand
      Rc(0, 232, 480, 288, 0, 'night-2'),
      Rc(0, 232, 480, 288, 0, 'sun', op(0.07)),
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => Rc(0, 262 + i * 22, 480, 1.6, 0, 'ink', op(0.07))),
      // Dachrand
      Rc(0, 218, 480, 22, 0, 'night'), Rc(0, 238, 480, 6, 0, 'ink', op(0.25)), Rc(0, 218, 480, 4, 0, 'sun', op(0.35)),
      // Fenster
      win(40, 292, 80, 96), Rc(32, 388, 96, 8, 3, 'night'), win(368, 292, 80, 96), Rc(360, 388, 96, 8, 3, 'night'),
      // Wandlampe
      G(null, C(144, 330, 38, 'butter', op(0.1)), C(144, 330, 22, 'butter', op(0.18)), Rc(138, 312, 12, 6, 2, 'night'), Rc(136, 318, 16, 24, 5, 'butter'), Rc(138, 340, 12, 6, 2, 'night'), Rc(139, 322, 4, 16, 2, 'milk', op(0.5)))];
  }
  function heroDoor() {
    return [
      // Rahmen und Türblatt
      Rc(166, 262, 148, 206, 3, 'night'), Rc(158, 250, 164, 16, 3, 'night'), Rc(158, 250, 164, 4, 2, 'sun', op(0.35)),
      Rc(176, 270, 128, 198, 4, 'berry'),
      Rc(176, 270, 20, 198, 0, 'milk', op(0.12)), Rc(284, 270, 20, 198, 0, 'ink', op(0.14)),
      Rc(192, 284, 96, 44, 6, 'butter', op(0.2)), Rc(198, 290, 84, 32, 4, 'butter'), Rc(198, 290, 84, 6, 4, 'milk', op(0.45)),
      Rc(238, 290, 4, 32, 0, 'berry'),
      [[192, 344, 44, 56], [244, 344, 44, 56], [192, 410, 44, 48], [244, 410, 44, 48]].map((p) => G(null, Rc(p[0], p[1], p[2], p[3], 5, 'ink', op(0.18)), Rc(p[0] + 3, p[1] + 3, p[2] - 6, p[3] - 6, 3, 'berry'), Rc(p[0] + 3, p[1] + 3, p[2] - 6, 4, 2, 'milk', op(0.18)))),
      // Schnalle
      Rc(272, 342, 12, 34, 6, 'butter'), Rc(274, 344, 4, 28, 2, 'milk', op(0.5)), C(278, 362, 9, 'butter'), C(275, 359, 3, 'milk', op(0.5)),
      // Stufen
      Rc(150, 468, 180, 18, 3, 'line'), Rc(150, 468, 180, 5, 2, 'milk', op(0.3)), Rc(136, 486, 208, 22, 3, 'line'), Rc(136, 486, 208, 5, 2, 'milk', op(0.3)),
      Rc(136, 502, 208, 6, 0, 'ink', op(0.2)),
      Rc(186, 474, 108, 8, 3, 'kraft-ink')];
  }
  function heroBag() {
    return [
      // Schlaufe an der Schnalle, Sackerl hängt darunter
      G(rot(3, 282, 372),
        St('M278 364C268 372 262 376 260 392M278 364C290 372 298 378 302 392', 'kraft-ink', 3),
        // Gebäck schaut heraus
        G(null, El(278, 396, 14, 12, 'crust-2'), El(274, 392, 6, 4, 'crust-1', op(0.8)), G(rot(24, 296, 396), Rc(286, 388, 34, 12, 6, 'crust-2'), St('M292 391l6 8M302 390l6 8', 'crust-3', 2))),
        bag(250, 392, 64, 76, null),
        Rc(262, 424, 38, 28, 8, 'milk', op(0.55)), Pa('M281 429l4 7 7 1-5.200 5 1.400 7-7.200-3.500-7.200 3.500 1.400-7-5.200-5 7-1z', 'sun'))];
  }
  function heroDeco() {
    return [
      // Pflanzkübel links
      Pa('M70 470h56l-6 36c-1 3-3 4-6 4H82c-3 0-5-1-6-4z', 'crust-3'), Rc(66, 464, 64, 10, 4, 'crust-2'), shade('M104 470h22l-6 36c-1 3-3 4-6 4h-12z'),
      [[98, 440, 30, -30], [86, 446, 26, -62], [112, 444, 26, 30], [98, 428, 24, 0], [104, 452, 22, 55]].map((p) => El(p[0], p[1], 7, p[2] / 2 + 2, 'leaf', rot(p[3], 98, 462))),
      // Milchkiste rechts (nur Andeutung) / Fußmatte
      Rc(196, 456, 88, 12, 5, 'kraft-ink', op(0.9)),
      El(284, 507, 60, 4, 'ink', op(0.0))];
  }
  function Hero() {
    const html = App.lib.html;
    return html`<svg viewBox="0 0 480 520" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Haustür im Morgengrauen, an der Schnalle hängt ein Sackerl mit Gebäck" focusable="false" class="art-hero">
      ${heroSky()}${heroHouse()}${heroDoor()}${heroDeco()}${heroBag()}
    </svg>`;
  }

  /* ---------- Spots ---------- */
  const back = (f) => C(80, 62, 52, f || 'tile-2');
  function spotBagDoor() {
    return [back(), Rc(48, 12, 64, 100, 5, 'night'), Rc(53, 17, 54, 95, 3, 'berry'), Rc(53, 17, 8, 95, 0, 'milk', op(0.14)),
      Rc(60, 26, 40, 16, 4, 'butter'), Rc(60, 26, 40, 4, 2, 'milk', op(0.4)),
      Rc(62, 54, 16, 24, 4, 'ink', op(0.16)), Rc(82, 54, 16, 24, 4, 'ink', op(0.16)),
      Rc(94, 64, 5, 14, 2.5, 'butter'), C(96.5, 74, 4, 'butter'),
      St('M96 78Q104 86 110 74', 'kraft-ink', 2),
      bag(100, 76, 36, 38), Rc(108, 92, 20, 14, 5, 'milk', op(0.5)),
      Rc(36, 110, 88, 8, 2, 'line'), El(80, 119, 52, 3, 'ink', op(0.12))];
  }
  function spotOven() {
    return [back(),
      Pa('M32 112V58a48 40 0 0196 0v54z', 'crust-4'), Pa('M32 112V58a48 40 0 0196 0v54z', 'crust-3', op(0.0)),
      [0, 1, 2].map((i) => [0, 1, 2, 3].map((j) => Rc(40 + j * 20 + (i % 2) * 10, 62 + i * 14, 18, 11, 3, 'crust-3', op(0.55)))),
      Pa('M52 112V78a28 24 0 0156 0v34z', 'night'), Pa('M60 112V84a20 18 0 0140 0v28z', 'sun'), Pa('M68 112V92a12 12 0 0124 0v20z', 'butter'),
      G(null, El(70, 96, 9, 5, 'crust-2'), El(92, 100, 8, 5, 'crust-2')),
      Rc(36, 40, 14, 20, 3, 'crust-4'), Rc(34, 36, 18, 6, 3, 'crust-3'), C(44, 26, 5, 'milk', op(0.5)), C(50, 16, 4, 'milk', op(0.35)),
      St('M118 112L140 70', 'crust-3', 3.2), Rc(128, 54, 22, 20, 10, 'crust-3', rot(30, 139, 64)), El(138, 60, 10, 6, 'crust-1', rot(30, 138, 60)),
      Rc(26, 110, 108, 8, 2, 'crust-3')];
  }
  function spotVan() {
    return [back(), Rc(14, 106, 132, 6, 3, 'line'),
      El(80, 112, 60, 4, 'ink', op(0.14)),
      Pa('M20 96V48c0-5 3-8 8-8h70c5 0 8 3 8 8v48z', 'milk'),
      Pa('M106 40h18c4 0 7 2 9 6l10 22c1 3 2 4 2 8v20H106z', 'info'),
      Pa('M112 48h10c3 0 5 1 6 4l7 15h-23z', 'info-soft'), Rc(112, 48, 4, 19, 0, 'milk', op(0.5)),
      shade('M96 40h10v56H96z'),
      Rc(20, 90, 126, 8, 3, 'berry'), Rc(20, 62, 86, 4, 0, 'sun', op(0.0)),
      bag(48, 50, 24, 28, null), Rc(52, 61, 16, 10, 4, 'milk', op(0.5)),
      Rc(84, 54, 10, 6, 3, 'butter'), C(147, 82, 3, 'butter'),
      [38, 124].map((x) => G(null, C(x, 98, 12, 'night'), C(x, 98, 6.5, 'line'), C(x, 98, 2.4, 'night'))),
      St('M8 70h10M4 80h12M10 60h8', 'sun', 2.2, { 'stroke-opacity': 0.7 })];
  }
  function spotBell() {
    return [back(),
      Pa('M80 20c-22 0-30 18-30 40 0 12-4 18-10 24h80c-6-6-10-12-10-24 0-22-8-40-30-40z', 'yolk'),
      Pa('M86 20c22 6 24 26 24 40 0 12 4 18 10 24h-24c6-6 4-12 4-24 0-14-6-34-14-40z', 'crust-2', op(0.35)),
      Pa('M58 34c-6 6-8 14-8 26 0 8-2 14-5 18', 'none', { stroke: col('milk'), 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-opacity': 0.7 }),
      Rc(34, 82, 92, 8, 4, 'crust-2'), C(80, 18, 6, 'crust-2'), C(80, 100, 8, 'crust-3'), C(78, 98, 3, 'milk', op(0.5)),
      St('M30 40C22 52 22 66 30 78', 'sun', 3.4), St('M20 32C8 52 8 70 20 88', 'sun', 3.4, { 'stroke-opacity': 0.55 }),
      St('M130 40C138 52 138 66 130 78', 'sun', 3.4), St('M140 32C152 52 152 70 140 88', 'sun', 3.4, { 'stroke-opacity': 0.55 })];
  }
  function spotCalendar() {
    const cells = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const x = 46 + c * 22, y = 56 + r * 17, on = [1, 3, 6, 9, 10].includes(r * 4 + c);
      cells.push(Rc(x, y, 16, 12, 3.5, on ? 'sun' : 'surface-2'), on ? Rc(x + 3, y + 2.5, 10, 2.5, 1.2, 'milk', op(0.55)) : null);
    }
    return [back(), Rc(34, 22, 92, 90, 9, 'ink', op(0.14)),
      Rc(34, 18, 92, 90, 9, 'surface'), Pa('M34 56V27c0-5 4-9 9-9h74c5 0 9 4 9 9v29z', 'berry'), Rc(34, 40, 92, 16, 0, 'berry'),
      Rc(34, 20, 92, 5, 0, 'milk', op(0.2)),
      [52, 80, 108].map((x) => G(null, Rc(x - 3, 10, 6, 18, 3, 'kraft-ink'), Rc(x - 1.5, 12, 3, 8, 1.5, 'milk', op(0.4)))),
      Rc(46, 28, 36, 5, 2.5, 'milk', op(0.8)),
      cells];
  }
  function house(x, w, body, roof, door, bagToo) {
    const hh = 52, y = 106 - hh;
    return G(null, Pa('M' + (x - 4) + ' ' + y + 'L' + (x + w / 2) + ' ' + (y - 24) + 'L' + (x + w + 4) + ' ' + y + 'z', roof), Rc(x, y, w, hh, 2, body), Rc(x + w - 9, y, 9, hh, 0, 'ink', op(0.12)),
      Rc(x + 6, y + 8, 12, 12, 2, 'butter'), Rc(x + w / 2 - 2, y + 22, 14, 30, 3, door), Rc(x + w / 2 + 6, y + 36, 3, 6, 1.5, 'butter'),
      bagToo ? bag(x + w / 2 + 10, y + 34, 12, 14, null) : null);
  }
  function spotNeighbors() {
    return [back(), Rc(12, 106, 136, 6, 3, 'line'),
      house(14, 36, 'kraft-soft', 'berry', 'info', true), house(58, 42, 'surface', 'crust-3', 'leaf', true), house(110, 36, 'butter-soft', 'info', 'berry', true),
      G(null, Rc(104, 92, 3, 14, 1, 'crust-4'), C(105, 86, 9, 'leaf')),
      Pa('M76 20c0-7 8-9 12-4 4-5 12-3 12 4 0 6-8 12-12 16-4-4-12-10-12-16z', 'berry', { transform: 'translate(-12 -4) scale(0.9)' })];
  }
  function spotOffice() {
    const wins = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) wins.push(Rc(42 + c * 17, 22 + r * 17, 11, 11, 2, (r * 3 + c * 2) % 5 === 0 ? 'butter' : 'info-soft'));
    return [back(), Rc(30, 108, 100, 5, 2, 'line'),
      Rc(34, 12, 76, 96, 4, 'night-2'), Rc(34, 12, 76, 5, 0, 'milk', op(0.15)), shade('M96 12h14v96H96z'), wins,
      Rc(66, 90, 18, 18, 3, 'night'), Rc(69, 93, 12, 15, 2, 'butter', op(0.9)),
      Rc(112, 70, 36, 38, 3, 'kraft'), shade('M136 70h12v38h-12z'), Rc(112, 70, 36, 7, 3, 'kraft-ink', op(0.4)), Rc(122, 82, 16, 12, 4, 'milk', op(0.5)),
      Rc(116, 54, 28, 18, 3, 'kraft'), Rc(116, 54, 28, 5, 2, 'kraft-ink', op(0.4)),
      Rc(10, 92, 16, 16, 3, 'crust-3'), G(null, El(18, 82, 5, 10, 'leaf'), El(11, 86, 4, 8, 'leaf', rot(-30, 11, 86)), El(25, 86, 4, 8, 'leaf', rot(30, 25, 86)))];
  }
  function spotGift() {
    return [back(),
      Rc(34, 56, 92, 52, 6, 'berry'), shade('M108 56h12q6 0 6 6v40q0 6-6 6h-12z'), Rc(34, 56, 92, 6, 3, 'milk', op(0.2)),
      Rc(28, 40, 104, 22, 6, 'berry'), Rc(28, 40, 104, 5, 2.5, 'milk', op(0.28)),
      Rc(72, 40, 16, 68, 0, 'butter'), Rc(72, 40, 5, 68, 0, 'milk', op(0.35)),
      G(null, Pa('M80 40c-8-18-34-22-34-10s20 14 34 10z', 'butter'), Pa('M80 40c8-18 34-22 34-10s-20 14-34 10z', 'butter'), shade('M80 40c8-18 34-22 34-10s-20 14-34 10z'), C(80, 38, 6, 'butter'), C(78, 36, 2, 'milk', op(0.6))),
      G(null, El(62, 24, 7, 5, 'crust-2'), El(60, 22, 3, 2, 'crust-1')),
      [[24, 22, 6], [136, 30, 5], [18, 70, 4], [144, 76, 5]].map((p) => Pa('M' + p[0] + ' ' + (p[1] - p[2]) + 'l' + (p[2] * 0.3) + ' ' + (p[2] * 0.7) + ' ' + (p[2]) + ' ' + (p[2] * 0.3) + ' -' + p[2] + ' ' + (p[2] * 0.3) + ' -' + (p[2] * 0.3) + ' ' + (p[2] * 0.7) + ' -' + (p[2] * 0.3) + ' -' + (p[2] * 0.7) + ' -' + p[2] + ' -' + (p[2] * 0.3) + ' ' + p[2] + ' -' + (p[2] * 0.3) + 'z', 'yolk'))];
  }
  function spotMapPin() {
    return [back(),
      Pa('M20 38l40-8 40 8 40-8v70l-40 8-40-8-40 8z', 'surface'), Pa('M60 30V92M100 38V100', 'none', { stroke: col('line'), 'stroke-width': 1.6 }),
      Pa('M20 38l40-8v62l-40 8z', 'info-soft', op(0.7)),
      Rc(24, 74, 28, 10, 3, 'leaf', op(0.8)), Rc(104, 48, 24, 18, 4, 'leaf', op(0.8)),
      St('M26 90C46 60 60 80 78 62S104 74 128 54', 'sun', 3, { 'stroke-dasharray': '2 6' }),
      El(100, 100, 18, 4, 'ink', op(0.18)),
      Pa('M100 98C88 80 84 74 84 62a16 16 0 0132 0c0 12-4 18-16 36z', 'berry'), Pa('M104 98C114 82 116 72 112 58l4 10c0 10-4 16-12 30z', 'ink', op(0.15)),
      C(100, 62, 6.5, 'milk'), G(null, Pa('M30 62l8-8 8 8v10H30z', 'butter'), Pa('M28 62l10-10 10 10z', 'crust-3'))];
  }
  const SPOTS = { 'bag-door': spotBagDoor, oven: spotOven, van: spotVan, bell: spotBell, calendar: spotCalendar, neighbors: spotNeighbors, office: spotOffice, gift: spotGift, 'map-pin': spotMapPin };

  /* ---------- Marke ---------- */
  function Mark(props) {
    const html = App.lib.html;
    const size = (props && props.size) || 32;
    return html`<svg viewBox="0 0 64 64" width=${size} height=${size} role="img" aria-label="Semmelengel" focusable="false" class="art-mark">
      ${El(32, 44, 25, 22, 'ink', op(0.14))}
      ${C(32, 39, 24, 'crust-3')}${C(31, 37.5, 22.5, 'crust-2')}${C(29.5, 36, 19.5, 'crust-1')}
      ${El(21, 26, 8, 3.6, 'crumb', { ...op(0.55), ...rot(-35, 21, 26) })}
      ${G(at(30, 37, 0.62), star(26, 4.6, 'crust-3'))}
      ${El(32, 10, 15, 4.5, 'none', { stroke: col('crust-3'), 'stroke-width': 5.5, ...rot(-10, 32, 10) })}
      ${El(32, 10, 15, 4.5, 'none', { stroke: col('yolk'), 'stroke-width': 3.2, ...rot(-10, 32, 10) })}
    </svg>`;
  }

  /* ---------- API ---------- */
  function Product(props) {
    const html = App.lib.html;
    const id = props && props.id;
    const draw = PRODUCTS[id] || neutral;
    return html`<svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true" focusable="false" class="art-product" data-art=${PRODUCTS[id] ? id : 'neutral'}>${draw()}</svg>`;
  }
  function Spot(props) {
    const html = App.lib.html;
    const name = props && props.name;
    const draw = SPOTS[name] || spotBagDoor;
    return html`<svg viewBox="0 0 160 120" width="100%" height="100%" aria-hidden="true" focusable="false" class="art-spot" data-art=${name}>${draw()}</svg>`;
  }

  App.art = { has: (id) => Object.prototype.hasOwnProperty.call(PRODUCTS, id), Product, Hero, Spot, Mark };
})(typeof window !== 'undefined' ? window : globalThis);
