/* Zustand, Persistenz, Selektoren (App.sel) und Aktionen (App.actions). Kein DOM-Zugriff beim Laden. */
(function (root) {
  const App = root.App = root.App || {};
  const C = App.config, T = App.time;
  const STORAGE_KEY = 'fd-demo-v2';
  const CUSTOMER_VIEWS = ['start', 'sortiment', 'lieferplan', 'konto'];
  const BO_VIEWS = ['uebersicht', 'kapazitaet', 'touren', 'baecker', 'kunden', 'warteliste', 'marketing', 'sortiment'];
  const CAT_ORDER = ['gebaeck', 'suess', 'brot', 'extras', 'boxen'];

  // ======================================================================= Store
  let state = null;
  const listeners = new Set();
  let saveTimer = null;

  const hasStorage = () => { try { return typeof localStorage !== 'undefined' && !!localStorage; } catch (e) { return false; } };
  const nowIso = () => T.now().toISOString();

  function defaultDriverDate() {
    const t = T.today();
    const mins = T.now().getHours() * 60 + T.now().getMinutes();
    return mins < T.deadlineMin(t) + 120 ? t : T.addDays(t, 1);
  }
  function defaultUi() {
    return {
      role: 'kunde', customerView: 'start', backofficeView: 'uebersicht', boAuthed: false, boRegion: 'nord',
      boDate: T.addDays(T.today(), 1), driverAuthed: false, driverIdx: 0, driverDate: defaultDriverDate()
    };
  }
  function buildState() {
    return Object.assign({
      tick: 0, clockPreset: 'echt', clockOffset: 0, seq: 1000, seedDay: T.today(),
      economics: Object.assign({}, C.economics), ui: defaultUi(), session: { customerId: 'me' }, draft: App.data.draftDefaults()
    }, App.data.seed());
  }

  function load() {
    if (!hasStorage()) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      const st = saved && saved.state;
      if (!st || !Array.isArray(st.regions) || !st.draft || !st.ui || !st.capacity || !st.weeklySpecial || !st.offers || !st.economics) return null;
      T.setOffset(st.clockOffset || 0);
      if (saved.seedDay !== T.today()) { T.setOffset(0); return null; }
      return st;
    } catch (e) { T.setOffset(0); return null; }
  }
  function save() {
    saveTimer = null;
    if (!hasStorage() || !state) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ seedDay: state.seedDay, state })); } catch (e) { /* voll oder gesperrt */ }
  }
  function scheduleSave() {
    if (!hasStorage() || typeof setTimeout === 'undefined') return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 400);
  }
  function ensure() { if (!state) state = load() || buildState(); return state; }

  function getState() { return ensure(); }
  function setState(updaterOrPatch) {
    const cur = ensure();
    const patch = typeof updaterOrPatch === 'function' ? updaterOrPatch(cur) : updaterOrPatch;
    if (!patch) return cur;
    state = Object.assign({}, cur, patch);
    scheduleSave();
    listeners.forEach(fn => { try { fn(state); } catch (e) { /* Hörer dürfen den Store nicht stören */ } });
    return state;
  }
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function reset() {
    T.setOffset(0);
    state = null;
    if (hasStorage()) { try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignorieren */ } }
    ensure();
    scheduleSave();
    listeners.forEach(fn => { try { fn(state); } catch (e) { /* ignorieren */ } });
    return state;
  }

  function useStore() {
    const L = App.lib;
    const rendered = getState();
    const bump = L.useState(0)[1];
    L.useEffect(() => {
      const off = subscribe(() => bump(n => n + 1));
      if (getState() !== rendered) bump(n => n + 1);
      return off;
    }, []);
    return rendered;
  }

  App.store = { getState, setState, subscribe, reset };
  App.useStore = useStore;

  function newId(prefix) { const s = ensure(); s.seq = (s.seq || 1000) + 1; return prefix + '-' + s.seq; }

  // ======================================================================= Selektoren
  const sel = {};

  const caches = {};
  function cached(name, refs, build) {
    const c = caches[name];
    if (c && c.refs.length === refs.length && c.refs.every((r, i) => r === refs[i])) return c.value;
    const value = build();
    caches[name] = { refs, value };
    return value;
  }
  function keyed(name, refs, key, build) {
    let c = caches[name];
    if (!c || c.refs.length !== refs.length || !c.refs.every((r, i) => r === refs[i])) c = caches[name] = { refs, map: new Map() };
    if (!c.map.has(key)) c.map.set(key, build());
    return c.map.get(key);
  }

  const idx = (s, list) => cached('idx:' + list, [s[list]], () => new Map(s[list].map(x => [x.id, x])));
  const custIndex = s => cached('custIdx', [s.customers], () => new Map(s.customers.map((c, i) => [c.id, i])));

  sel.product = (s, id) => idx(s, 'products').get(id) || null;
  sel.customer = (s, id) => idx(s, 'customers').get(id) || null;
  sel.region = (s, id) => (s.regions.find(r => r.id === id)) || null;

  sel.regionForPlz = (s, plz) => {
    const p = String(plz == null ? '' : plz).trim();
    if (!/^\d{4}$/.test(p)) return null;
    const region = s.regions.find(r => r.plz.includes(p));
    return region ? { region, outside: false } : { region: null, outside: true };
  };

  // ----- Kapazität
  const aboCounts = s => cached('abo', [s.subs, s.customers], () => {
    const out = {};
    s.subs.forEach(sub => {
      const c = sel.customer(s, sub.customerId);
      if (!c || !c.regionId) return;
      (out[c.regionId] = out[c.regionId] || [0, 0, 0, 0, 0, 0, 0])[sub.weekday]++;
    });
    return out;
  });

  sel.cap = (s, regionId, wd) => {
    const base = (s.capacity[regionId] || [])[wd] || { status: 'open', drivers: 1, stopsPerDriver: 60, flexQuota: C.capacityDefaults.flexQuota, autoNotify: true };
    const region = sel.region(s, regionId);
    const max = base.drivers * base.stopsPerDriver;
    const abo = (aboCounts(s)[regionId] || [])[wd] || 0;
    const freeAbo = max - base.flexQuota - abo;
    const pct = max ? abo / max : 0;
    let effective = 'free';
    if (region && region.planned) effective = 'planned';
    else if (base.status === 'closed') effective = 'closed';
    else if (base.status === 'waitlist' || freeAbo <= 0) effective = 'full';
    else if (freeAbo <= C.capacityDefaults.fewThreshold) effective = 'few';
    return Object.assign({}, base, { max, abo, freeAbo, pct, effective });
  };

  sel.dayStatusFor = (s, regionId, wd, customerId) => {
    if (customerId && s.subs.some(x => x.customerId === customerId && x.weekday === wd)) return 'booked';
    const nowMs = T.now().getTime();
    const res = s.waitlist.some(w => w.customerId === customerId && w.regionId === regionId && w.weekday === wd &&
      w.status === 'notified' && w.reservedUntil && new Date(w.reservedUntil).getTime() > nowMs);
    if (customerId && res) return 'reserved';
    return sel.cap(s, regionId, wd).effective;
  };

  sel.utilization = (s, regionId) => [0, 1, 2, 3, 4, 5, 6].map(wd => Object.assign({ wd }, sel.cap(s, regionId, wd)));
  sel.weakDays = (s, regionId) => sel.utilization(s, regionId)
    .filter(u => u.pct <= C.promo.weakBelowPct + 1e-9 && u.effective === 'free').map(u => u.wd);

  // ----- Preise und Mengenaktionen
  const round2 = n => Math.round(n * 100) / 100;
  const orderedItems = (s, items) => s.products.filter(p => items && items[p.id] > 0);

  sel.priceOf = (s, items) => round2(orderedItems(s, items).reduce((a, p) => a + p.price * items[p.id], 0));

  function offerApplies(o, wd) {
    if (!o.active) return false;
    if (!o.weekdays) return true;
    return wd != null && o.weekdays.includes(wd);
  }
  function boughtQty(s, items, buy) {
    if (buy.kind === 'cat') return orderedItems(s, items).filter(p => p.cat === buy.ref).reduce((a, p) => a + items[p.id], 0);
    return (items && items[buy.ref]) || 0;
  }
  const sameProduct = o => o.buy.kind === 'product' && o.buy.ref === o.get.productId;

  sel.priceBag = (s, items, opts) => {
    const wd = opts && opts.wd != null ? opts.wd : null;
    const lines = orderedItems(s, items).map(p => ({ product: p, qty: items[p.id], sum: round2(p.price * items[p.id]) }));
    const subtotal = round2(lines.reduce((a, l) => a + l.sum, 0));
    const discounts = [], hints = [];
    (s.offers || []).filter(o => offerApplies(o, wd)).forEach(o => {
      const gp = sel.product(s, o.get.productId);
      if (!gp) return;
      const have = (items && items[gp.id]) || 0, bought = boughtQty(s, items, o.buy);
      let free, missing = 0, text = '';
      if (sameProduct(o)) {
        const per = o.buy.qty + o.get.qty;
        free = Math.floor(have / per) * o.get.qty;
        const r = have % per;
        if (have > 0 && r > 0) { missing = per - r; text = 'Noch ' + missing + ' ' + (missing === 1 ? gp.name : gp.plural) + ' bis zum nächsten Gratis-Stück'; }
      } else {
        const n = Math.floor(bought / o.buy.qty), entitled = n * o.get.qty;
        free = Math.min(have, entitled);
        const bp = o.buy.kind === 'product' ? sel.product(s, o.buy.ref) : null;
        if (entitled > have) {
          missing = entitled - have;
          text = o.get.pct >= 100 ? missing + ' ' + (missing === 1 ? gp.name : gp.plural) + ' gratis dazulegen' : gp.name + ' dazu: −' + o.get.pct + ' %';
        }
        else if (bought > 0) {
          missing = o.buy.qty - (bought % o.buy.qty);
          text = 'Noch ' + missing + ' ' + (bp ? (missing === 1 ? bp.name : bp.plural) : (C.labels.cat[o.buy.ref] || 'Artikel')) + ' bis ' + (o.get.pct >= 100 ? o.get.qty + ' ' + gp.name + ' gratis' : gp.name + ' −' + o.get.pct + ' %');
        }
      }
      if (free > 0) discounts.push({ offerId: o.id, title: o.title, productId: gp.id, freeQty: free, amount: round2(free * gp.price * o.get.pct / 100) });
      if (text) hints.push({ offerId: o.id, title: o.title, text, missing, giftProductId: gp.id });
    });
    const ws = s.weeklySpecial;
    if (ws && ws.pct > 0 && items && items[ws.productId] > 0) {
      const wp = sel.product(s, ws.productId);
      if (wp) discounts.push({ offerId: 'weekly-special', title: ws.title, productId: wp.id, freeQty: items[wp.id], amount: round2(items[wp.id] * wp.price * ws.pct / 100) });
    }
    const total = round2(subtotal - discounts.reduce((a, d) => a + d.amount, 0));
    return { lines, subtotal, discounts, total, hints };
  };

  sel.offersForProduct = (s, productId, wd) => {
    const p = sel.product(s, productId);
    if (!p) return [];
    return (s.offers || []).filter(o => o.active && (wd == null || !o.weekdays || o.weekdays.includes(wd)) &&
      ((o.buy.kind === 'product' && o.buy.ref === productId) || (o.buy.kind === 'cat' && o.buy.ref === p.cat) || o.get.productId === productId))
      .map(o => {
        let badge;
        if (sameProduct(o)) badge = o.buy.qty + ' + ' + o.get.qty + (o.get.pct >= 100 ? ' gratis' : ' mit ' + o.get.pct + ' % Rabatt');
        else if (o.get.productId === productId) badge = (o.get.pct >= 100 ? 'Gratis' : '−' + o.get.pct + ' %') + ' ab ' + o.buy.qty + ' ' + ((sel.product(s, o.buy.ref) || {}).plural || C.labels.cat[o.buy.ref] || 'Artikeln');
        else badge = 'Ab ' + o.buy.qty + ': ' + (sel.product(s, o.get.productId) || {}).name + (o.get.pct >= 100 ? ' gratis' : ' −' + o.get.pct + ' %');
        return Object.assign({}, o, { badge });
      });
  };

  sel.offerCalc = (s, o) => {
    const avg = (list, f) => list.length ? list.reduce((a, p) => a + p[f], 0) / list.length : 0;
    const buyList = o.buy.kind === 'cat' ? s.products.filter(p => p.cat === o.buy.ref && p.active) : [sel.product(s, o.buy.ref)].filter(Boolean);
    const gp0 = sel.product(s, o.get.productId) || { price: 0, cat: 'gebaeck' };
    const gp = { price: net(s, gp0.price), cost: gp0.id ? sel.costOf(s, gp0) : 0 };
    const d = E(s).driverPerPiece;
    const normalRevenue = o.buy.qty * net(s, avg(buyList, 'price')), normalCost = o.buy.qty * (buyList.reduce((a, p) => a + sel.costOf(s, p), 0) / (buyList.length || 1) + d);
    const giftUnitMargin = gp.price * (1 - o.get.pct / 100) - gp.cost - d;
    const offerRevenue = normalRevenue + o.get.qty * gp.price * (1 - o.get.pct / 100);
    const offerCost = normalCost + o.get.qty * (gp.cost + d);
    const normalMargin = normalRevenue - normalCost, offerMargin = offerRevenue - offerCost;
    const delta = offerMargin - normalMargin;
    const r = x => Math.round(x * 100) / 100;
    return {
      normalRevenue: r(normalRevenue), normalCost: r(normalCost), normalMargin: r(normalMargin),
      offerRevenue: r(offerRevenue), offerCost: r(offerCost), offerMargin: r(offerMargin),
      deltaPerBundle: r(delta), giftUnitMargin: r(giftUnitMargin), discountPerUnit: r(gp.price * o.get.pct / 100), driverPerPiece: d,
      verdict: giftUnitMargin < -0.004 ? 'loss' : giftUnitMargin > 0.004 ? 'gain' : 'neutral',
      marginDropPct: normalMargin ? Math.round((normalMargin - offerMargin) / normalMargin * 1000) / 10 : 0,
      breakEvenUpliftPct: normalMargin > 0 && offerMargin > 0 && delta < -0.004 ? Math.round((normalMargin / offerMargin - 1) * 1000) / 10 : null
    };
  };

  sel.itemsText = (s, items, max) => {
    const list = orderedItems(s, items);
    const lim = max || 3;
    const txt = list.slice(0, lim).map(p => items[p.id] + ' ' + (items[p.id] === 1 ? p.name : p.plural)).join(', ');
    return list.length > lim ? txt + ' + ' + (list.length - lim) + ' weitere' : txt;
  };

  sel.feeFor = (s, o) => {
    const from = C.fees.freeDeliveryFrom;
    if (from && o.total != null && o.total >= from - 1e-9) return 0;
    const we = o.wd != null && o.wd >= 5;
    if (o.mode === 'flex') return we ? C.fees.flexWeekend : C.fees.flex;
    const c = o.customerId ? sel.customer(s, o.customerId) : null;
    const isNew = !c || !c.registered || c.since >= T.addDays(T.today(), -C.promo.weakDayFreeWeeks * 7);
    if (isNew && o.wd != null && sel.weakDays(s, o.regionId).includes(o.wd)) return 0;
    return we ? C.fees.aboWeekend : C.fees.abo;
  };

  // ----- Stopps und Touren
  const custPaused = (s, cid, k) => s.pauses.some(p => p.customerId === cid && p.from <= k && k <= p.to);

  sel.stopsOn = (s, regionId, dateKey) => keyed('stops', [s.subs, s.flexOrders, s.skips, s.pauses, s.customers, s.products, s.offers],
    regionId + '|' + dateKey, () => {
      const wd = T.weekday(dateKey), map = new Map();
      const add = (cid, items, kind) => {
        const c = sel.customer(s, cid);
        if (!c || c.regionId !== regionId) return;
        let e = map.get(cid);
        if (!e) { e = { customerId: cid, customer: c, items: {}, kinds: [] }; map.set(cid, e); }
        Object.keys(items).forEach(id => { e.items[id] = (e.items[id] || 0) + items[id]; });
        if (!e.kinds.includes(kind)) e.kinds.push(kind);
      };
      s.subs.forEach(sub => {
        if (sub.weekday !== wd) return;
        if ((s.skips[sub.customerId] || []).includes(dateKey) || custPaused(s, sub.customerId, dateKey)) return;
        add(sub.customerId, sub.items, 'abo');
      });
      s.flexOrders.forEach(f => { if (f.status === 'confirmed' && f.dateKey === dateKey) add(f.customerId, f.items, 'flex'); });
      const ci = custIndex(s);
      return Array.from(map.values()).sort((a, b) => ci.get(a.customerId) - ci.get(b.customerId))
        .map(e => Object.assign(e, { total: sel.priceBag(s, e.items, { wd }).total }));
    });

  sel.flexInfo = (s, regionId, dateKey, customerId) => {
    const region = sel.region(s, regionId), wd = T.weekday(dateKey), cutoff = T.cutoffFor(dateKey);
    const stops = region ? sel.stopsOn(s, regionId, dateKey) : [];
    const alreadyStop = !!customerId && stops.some(x => x.customerId === customerId);
    const cap = sel.cap(s, regionId, wd);
    const free = Math.max(0, cap.max - stops.length);
    let state = 'free';
    if (!region || region.planned) state = 'planned';
    else if (!T.isOpenFor(dateKey)) state = 'cutoff';
    else if (alreadyStop) state = 'free';
    else if (cap.status === 'closed') state = 'closed';
    else if (free <= 0) state = 'full';
    else if (free <= 3) state = 'few';
    return { state, free, cutoff, alreadyStop };
  };

  const driverFor = (s, i) => s.drivers[i] || { id: 'd-' + (i + 1), name: 'Fahrer ' + (i + 1) };

  sel.tourPlan = (s, regionId, dateKey, driversOverride) => {
    const region = sel.region(s, regionId);
    const wd = T.weekday(dateKey);
    const drivers = driversOverride || sel.cap(s, regionId, wd).drivers;
    const stops = sel.stopsOn(s, regionId, dateKey);
    const dRef = s.deliveries[dateKey];
    const ck = regionId + '|' + dateKey + '|' + drivers + '|' + C.tour.serviceMin;
    const hit = caches.tours && caches.tours.get(ck);
    if (hit && hit.stops === stops && hit.dRef === dRef) return hit.value;
    const wk = T.isWeekend(dateKey);
    const startMin = wk ? C.tour.startMin.weekend : C.tour.startMin.weekday;
    const deadline = T.deadlineMin(dateKey);
    const plan = App.routing.plan({
      depot: region.bakery, drivers, startMin, speedKmh: C.tour.speedKmh, roadFactor: C.tour.roadFactor, serviceMin: C.tour.serviceMin,
      stops: stops.map(st => ({ id: st.customerId, x: st.customer.x, y: st.customer.y }))
    });
    const byId = new Map(stops.map(st => [st.customerId, st]));
    const tours = plan.tours.map((t, i) => ({
      driver: driverFor(s, i), startMin, km: t.km, endMin: t.endMin, late: t.endMin > deadline,
      stops: t.stops.map(x => {
        const st = byId.get(x.id);
        return { customerId: st.customerId, customer: st.customer, items: st.items, kinds: st.kinds, seq: x.seq,
          etaMin: x.etaMin, legKm: x.legKm, delivery: dRef ? dRef[st.customerId] : undefined };
      })
    }));
    const value = { tours, stops: stops.length, km: plan.km, endMin: plan.endMin, deadlineMin: deadline, late: plan.endMin > deadline };
    if (!caches.tours) caches.tours = new Map();
    if (caches.tours.size > 200) caches.tours.clear();
    caches.tours.set(ck, { stops, dRef, value });
    return value;
  };

  const E = s => s.economics || C.economics;
  sel.costOf = (s, p) => (p.costOverride != null ? p.costOverride : App.data.unitCost(p, E(s)));
  const net = (s, v) => v / (1 + E(s).vatRate);
  // Vergütung je Fahrer und Tour: mindestens driverMinPerTour (nur, wenn überhaupt Stück geliefert werden).
  const driverPayFor = (s, pieces) => (pieces > 0 ? Math.max(pieces * E(s).driverPerPiece, E(s).driverMinPerTour || 0) : 0);
  sel.pieces = items => Object.keys(items || {}).reduce((a, id) => a + (items[id] > 0 ? items[id] : 0), 0);
  const goodsCostOf = (s, items) => orderedItems(s, items).reduce((a, p) => a + sel.costOf(s, p) * items[p.id], 0);

  sel.tourEconomics = (s, regionId, dateKey, driversOverride) => {
    const plan = sel.tourPlan(s, regionId, dateKey, driversOverride), wd = T.weekday(dateKey);
    let pieces = 0, rev = 0, fees = 0, goods = 0, paySum = 0;
    const perDriver = plan.tours.map(t => {
      let pc = 0;
      t.stops.forEach(st => {
        const p = sel.pieces(st.items), total = sel.priceBag(s, st.items, { wd }).total;
        pc += p; rev += total; goods += goodsCostOf(s, st.items);
        fees += sel.feeFor(s, { mode: st.kinds.includes('abo') ? 'abo' : 'flex', wd, regionId, customerId: st.customerId, total });
      });
      pieces += pc;
      paySum += driverPayFor(s, pc);
      const pieceBased = pc * E(s).driverPerPiece, pay = driverPayFor(s, pc), kmc = t.km * E(s).kmCost, hours = Math.max(0, (t.endMin - t.startMin) / 60);
      return { driver: t.driver, stops: t.stops.length, pieces: pc, pay: round2(pay), pieceBased: round2(pieceBased), minApplied: pc > 0 && pay > pieceBased + 1e-9, km: t.km, kmCost: round2(kmc), afterKm: round2(pay - kmc),
        hours: Math.round(hours * 100) / 100, perHour: hours > 0 ? round2((pay - kmc) / hours) : 0, stopsPerKm: t.km > 0 ? Math.round(t.stops.length / t.km * 100) / 100 : 0 };
    });
    const driverPay = round2(paySum);
    rev = net(s, rev); fees = net(s, fees);
    return { stops: plan.stops, pieces, productRevenue: round2(rev), fees: round2(fees), goodsCost: round2(goods), driverPay,
      margin: round2(rev + fees - goods - driverPay), perDriver };
  };

  sel.weekdayEconomics = (s, regionId) => [0, 1, 2, 3, 4, 5, 6].map(wd => {
    const dateKey = T.nextDateForWeekday(wd), te = sel.tourEconomics(s, regionId, dateKey), n = te.perDriver.length || 1;
    const avg = f => te.perDriver.reduce((a, d) => a + d[f], 0) / n;
    const kmAvg = avg('km'), pay = avg('pay'), kmc = avg('kmCost'), hours = avg('hours');
    return { wd, dateKey, drivers: te.perDriver.length, stops: te.stops, pieces: te.pieces, km: round2(kmAvg), businessMargin: te.margin,
      driverPay: round2(pay), kmCost: round2(kmc), afterKm: round2(pay - kmc), hours: round2(hours), perHour: hours > 0 ? round2((pay - kmc) / hours) : 0 };
  });

  sel.marginalStop = (s, regionId) => {
    const k = sel.kpis(s, regionId);
    let pcs = 0;
    s.subs.forEach(x => { const c = sel.customer(s, x.customerId); if (c && c.regionId === regionId && c.registered) pcs += sel.pieces(x.items); });
    const n = k.weeklyStops || 1, pieces = pcs / n;
    return { business: round2(k.weeklyMargin / n), driver: round2(pieces * E(s).driverPerPiece), pieces: Math.round(pieces * 100) / 100 };
  };

  sel.forecastEnd = (s, regionId, wd, drivers) => {
    const dateKey = T.nextDateForWeekday(wd);
    const p = sel.tourPlan(s, regionId, dateKey, drivers);
    return { endMin: p.endMin, deadlineMin: p.deadlineMin, late: p.late, dateKey };
  };

  // ----- Kunde
  sel.weeklyPlan = (s, customerId) => s.subs.filter(x => x.customerId === customerId).sort((a, b) => a.weekday - b.weekday)
    .map(x => ({ wd: x.weekday, items: x.items, total: sel.priceBag(s, x.items, { wd: x.weekday }).total }));

  sel.upcoming = (s, customerId, n) => {
    const c = sel.customer(s, customerId);
    const out = [];
    if (!c) return out;
    const t = T.today();
    const nowMin = T.now().getHours() * 60 + T.now().getMinutes();
    for (let i = 0; i < 120 && out.length < n; i++) {
      const k = T.addDays(t, i), wd = T.weekday(k);
      if (i === 0 && nowMin >= T.deadlineMin(k)) continue;
      const sub = s.subs.find(x => x.customerId === customerId && x.weekday === wd);
      const flex = s.flexOrders.filter(f => f.customerId === customerId && f.dateKey === k && f.status === 'confirmed');
      if (!sub && !flex.length) continue;
      const items = {};
      const kinds = [];
      if (sub) { Object.keys(sub.items).forEach(id => { items[id] = (items[id] || 0) + sub.items[id]; }); kinds.push('abo'); }
      flex.forEach(f => Object.keys(f.items).forEach(id => { items[id] = (items[id] || 0) + f.items[id]; }));
      if (flex.length) kinds.push('flex');
      const skipped = (s.skips[customerId] || []).includes(k), paused = custPaused(s, customerId, k);
      const fee = skipped || paused ? 0 : sel.feeFor(s, { mode: sub ? 'abo' : 'flex', wd, regionId: c.regionId, customerId, total: sel.priceBag(s, items, { wd }).total });
      out.push({ dateKey: k, wd, items, total: sel.priceBag(s, items, { wd }).total, fee, kinds, skipped, paused,
        cutoff: T.cutoffFor(k), changeable: T.isOpenFor(k), delivery: (s.deliveries[k] || {})[customerId] || null });
    }
    return out;
  };

  function missingForFree(s, o, total) {
    const from = C.fees.freeDeliveryFrom;
    if (!from || sel.feeFor(s, o) === 0 || total >= from - 1e-9) return 0;
    return round2(from - total);
  }

  // ----- Entwurf
  function evalDraft(s) {
    const d = s.draft, plan = [], addr = [];
    const region = d.regionId ? sel.region(s, d.regionId) : null;
    const cid = s.session.customerId, cust = sel.customer(s, cid);
    const deliveries = [];
    let firstDelivery = null, cutoff = null;
    if (!region) plan.push('no-region');
    else if (region.planned) plan.push('region-planned');
    if (region && !region.planned) {
      if (d.mode === 'abo') {
        const wds = Object.keys(d.abo).map(Number).sort((a, b) => a - b);
        if (!wds.length) plan.push('no-days');
        wds.forEach(wd => {
          const items = d.abo[wd] || {};
          const bag = sel.priceBag(s, items, { wd });
          const filled = Object.keys(items).some(id => items[id] > 0);
          if (!filled) plan.push('empty-day:' + wd);
          const st = sel.dayStatusFor(s, d.regionId, wd, cid);
          if (st === 'full' || st === 'closed') plan.push('day-full:' + wd);
          const fee = sel.feeFor(s, { mode: 'abo', wd, regionId: d.regionId, customerId: cid, total: bag.total });
          if (!filled) return;
          deliveries.push({ wd, items, subtotal: bag.subtotal, total: bag.total, fee, discounts: bag.discounts, hints: bag.hints,
            freeDeliveryMissing: missingForFree(s, { mode: 'abo', wd, regionId: d.regionId, customerId: cid }, bag.total) });
          const k = T.nextDateForWeekday(wd);
          if (!firstDelivery || k < firstDelivery) firstDelivery = k;
        });
      } else {
        const k = d.flexDate, items = d.flex || {};
        if (!k) plan.push('flex-no-date');
        if (!Object.keys(items).some(id => items[id] > 0)) plan.push('flex-empty');
        const wd = k ? T.weekday(k) : null;
        const bag = sel.priceBag(s, items, { wd });
        if (Object.keys(items).some(id => items[id] > 0) && bag.total < C.fees.flexMinOrder - 1e-9) plan.push('flex-min');
        if (k) {
          const fi = sel.flexInfo(s, d.regionId, k, cid);
          if (fi.state === 'full' || fi.state === 'closed') plan.push('flex-full');
          if (fi.state === 'cutoff') plan.push('flex-cutoff');
          firstDelivery = k;
        }
        const ffee = sel.feeFor(s, { mode: 'flex', wd, regionId: d.regionId, customerId: cid, total: bag.total });
        deliveries.push({ dateKey: k, items, subtotal: bag.subtotal, total: bag.total, fee: ffee, discounts: bag.discounts, hints: bag.hints,
          freeDeliveryMissing: missingForFree(s, { mode: 'flex', wd, regionId: d.regionId, customerId: cid }, bag.total) });
      }
      if (firstDelivery) cutoff = T.cutoffFor(firstDelivery);
    }
    if (!cust || !cust.registered) {
      const a = d.address;
      const ok = a.name.trim() && a.street.trim() && a.houseNo.trim() && /^\d{4}$/.test(a.plz.trim()) && a.city.trim() && /^\S+@\S+\.\S+$/.test(a.email.trim());
      if (!ok) addr.push('address-incomplete');
    }
    return { plan, addr, deliveries, firstDelivery, cutoff };
  }

  sel.draftSummary = s => {
    const ev = evalDraft(s);
    const needsAddr = s.draft.step === 'adresse' || s.draft.step === 'zahlung';
    const problems = ev.plan.concat(needsAddr ? ev.addr : []);
    const sum = ev.deliveries.reduce((a, x) => a + x.total + x.fee, 0);
    // Gruppen: Tage mit identischem Inhalt
    const groups = [], byKey = {};
    ev.deliveries.filter(x => x.wd != null).forEach(x => {
      const key = JSON.stringify(Object.keys(x.items).filter(id => x.items[id] > 0).sort().map(id => [id, x.items[id]]));
      let g = byKey[key];
      if (!g) { g = byKey[key] = { wds: [], items: x.items, total: x.total, fee: x.fee, discounts: x.discounts }; groups.push(g); }
      g.wds.push(x.wd);
    });
    let savePerWeek = 0;
    if (s.draft.mode === 'abo') {
      ev.deliveries.forEach(x => {
        savePerWeek += sel.feeFor(s, { mode: 'flex', wd: x.wd, regionId: s.draft.regionId, customerId: s.session.customerId, total: x.total }) - x.fee;
      });
    }
    savePerWeek = Math.max(0, round2(savePerWeek));
    return {
      groups, saving: { perWeek: savePerWeek, text: savePerWeek > 0 ? 'Mit dem Abo sparen Sie ' + App.fmt.eur(savePerWeek) + ' pro Woche gegenüber Einmalbestellungen.' : '' },
      deliveries: ev.deliveries, count: ev.deliveries.length,
      perWeek: s.draft.mode === 'abo' ? round2(sum) : 0, total: round2(sum),
      firstDelivery: ev.firstDelivery, cutoff: ev.cutoff,
      planProblems: ev.plan, planValid: ev.plan.length === 0, addressValid: ev.addr.length === 0,
      valid: problems.length === 0, problems
    };
  };

  // ----- Bäcker
  sel.bakeryDates = s => {
    const t = T.today();
    let first = null;
    for (let i = 1; i <= 9 && !first; i++) if (T.isOpenFor(T.addDays(t, i))) first = T.addDays(t, i);
    if (!first) return [];
    const c = T.cutoffFor(first).getTime(), out = [first];
    for (let i = 1; i < 4; i++) { const k = T.addDays(first, i); if (T.cutoffFor(k).getTime() === c) out.push(k); else break; }
    return out;
  };

  sel.bakeryOrder = (s, dateKeys, regionId) => {
    const acc = {};
    s.regions.filter(r => !r.planned && (!regionId || r.id === regionId)).forEach(r => {
      dateKeys.forEach(k => sel.stopsOn(s, r.id, k).forEach(st => {
        Object.keys(st.items).forEach(id => {
          const e = acc[id] = acc[id] || { product: sel.product(s, id), qty: 0, byDate: {} };
          e.qty += st.items[id]; e.byDate[k] = (e.byDate[k] || 0) + st.items[id];
        });
      }));
    });
    // Gratis-Stücke gehören dazu: die Bäckerei backt sie ja
    return Object.keys(acc).map(id => acc[id]).filter(e => e.product)
      .sort((a, b) => CAT_ORDER.indexOf(a.product.cat) - CAT_ORDER.indexOf(b.product.cat) || s.products.indexOf(a.product) - s.products.indexOf(b.product));
  };

  // ----- Nachrichten, Warteliste
  sel.inbox = (s, customerId) => s.notifications.map((n, i) => [n, i]).filter(x => x[0].customerId === customerId)
    .sort((a, b) => (a[0].createdAt < b[0].createdAt ? 1 : a[0].createdAt > b[0].createdAt ? -1 : b[1] - a[1])).map(x => x[0]);
  sel.unreadPush = (s, customerId) => sel.inbox(s, customerId).filter(n => n.channel === 'push' && !n.read);

  sel.waitlistFor = (s, regionId, wd) => s.waitlist.filter(w => w.regionId === regionId && w.weekday === wd && (w.status === 'waiting' || w.status === 'notified'));
  sel.waitPosition = (s, customerId, regionId, wd) => {
    const list = sel.waitlistFor(s, regionId, wd).slice().sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    const i = list.findIndex(w => w.customerId === customerId);
    return i < 0 ? null : i + 1;
  };

  // ----- Kennzahlen, Kampagnen
  sel.kpis = (s, regionId) => {
    const util = sel.utilization(s, regionId);
    const cust = s.customers.filter(c => c.regionId === regionId && c.registered);
    const ids = new Set(cust.map(c => c.id));
    let rev = 0, fees = 0, goods = 0, pcs = 0;
    const pcsWd = [0, 0, 0, 0, 0, 0, 0];
    s.subs.forEach(x => {
      if (!ids.has(x.customerId)) return;
      const total = sel.priceBag(s, x.items, { wd: x.weekday }).total;
      rev += total; goods += goodsCostOf(s, x.items); pcs += sel.pieces(x.items); pcsWd[x.weekday] += sel.pieces(x.items);
      fees += sel.feeFor(s, { mode: 'abo', wd: x.weekday, regionId, customerId: x.customerId, total });
    });
    let pay = 0;
    pcsWd.forEach((p, wd) => { const n = Math.max(1, sel.cap(s, regionId, wd).drivers); pay += n * driverPayFor(s, p / n); });
    rev = net(s, rev); fees = net(s, fees);
    const next7 = T.nextDates(7);
    return {
      households: cust.length, weeklyStops: util.reduce((a, u) => a + u.abo, 0), weeklyRevenue: round2(rev + fees),
      weeklyProductRevenue: round2(rev), weeklyFees: round2(fees), weeklyGoodsCost: round2(goods), weeklyDriverPay: round2(pay),
      weeklyMargin: round2(rev + fees - goods - pay),
      utilMonday: util[0].pct, utilMidweek: (util[1].pct + util[2].pct + util[3].pct + util[4].pct) / 4,
      waitlist: s.waitlist.filter(w => w.regionId === regionId && w.status === 'waiting').length,
      flexNext7: s.flexOrders.filter(f => f.status === 'confirmed' && next7.includes(f.dateKey) && ids.has(f.customerId)).length
    };
  };

  sel.segmentCustomers = (s, segment, regionId) => {
    const days = new Map();
    s.subs.forEach(x => { if (!days.has(x.customerId)) days.set(x.customerId, []); days.get(x.customerId).push(x.weekday); });
    const rec = c => ({ customerId: c.id, name: c.name, channel: c.notify.push ? 'push' : 'email' });
    if (segment === 'waitlist') {
      return s.waitlist.filter(w => w.status === 'waiting' && (!regionId || w.regionId === regionId))
        .map(w => ({ customerId: w.customerId, name: (sel.customer(s, w.customerId) || {}).name || w.contact.name, channel: w.channel }));
    }
    return s.customers.filter(c => c.registered && (!regionId || c.regionId === regionId)).filter(c => {
      const d = days.get(c.id) || [];
      if (segment === 'monday-only') return d.length > 0 && d.every(w => w === 0);
      if (segment === 'weekend-only') return d.length > 0 && d.every(w => w >= 5);
      if (segment === 'no-midweek') return d.length > 0 && !d.some(w => w >= 1 && w <= 4);
      return true;
    }).map(rec);
  };

  sel.campaignIdeas = (s, regionId) => {
    const util = sel.utilization(s, regionId), region = sel.region(s, regionId);
    const ideas = [];
    const mk = (id, title, reason, segment, channel, text) => ideas.push({
      id, title, reason, segment, channel, suggestedText: text, recipients: sel.segmentCustomers(s, segment, regionId).length });
    const weak = sel.weakDays(s, regionId).filter(w => w >= 1 && w <= 4);
    if (weak.length >= 2) {
      const stops = weak.reduce((a, w) => a + util[w].abo, 0), max = weak.reduce((a, w) => a + util[w].max, 0);
      mk('midweek-free', 'Unter der Woche: Zustellung ' + C.promo.weakDayFreeWeeks + ' Wochen gratis',
        T.WD[weak[0]] + '–' + T.WD[weak[weak.length - 1]] + ' sind nur zu ' + Math.round(stops / max * 100) + ' % ausgelastet (' + stops + ' von ' + max + ' Plätzen).',
        'no-midweek', 'push', 'Frisches Gebäck auch unter der Woche: Wer jetzt einen Liefertag von Dienstag bis Freitag dazubucht, zahlt ' + C.promo.weakDayFreeWeeks + ' Wochen lang keine Zustellung.');
    }
    if (util[0].effective === 'full' && util[0].abo > util[0].max - util[0].flexQuota) {
      mk('monday-shift', 'Montag entlasten', 'Montag ist zu ' + Math.round(util[0].pct * 100) + ' % ausgelastet (' + util[0].abo + ' / ' + util[0].max + '). Wer nur montags bestellt, kann auf einen freien Tag wechseln.',
        'monday-only', 'email', 'Am Montag ist es bei uns eng. Wechseln Sie Ihren Liefertag auf Dienstag, wir schenken Ihnen die Zustellung für ' + C.promo.weakDayFreeWeeks + ' Wochen.');
    }
    const we = sel.segmentCustomers(s, 'weekend-only', regionId).length;
    if (we > 0) {
      mk('weekend-box', 'Sonntagsfrühstück für 2', we + ' Kunden liefern nur am Wochenende. Das Sackerl mit Eiern, Butter und Marmelade passt zu ihrem Rhythmus.',
        'weekend-only', 'push', 'Gemütlich frühstücken: Das Sonntagsfrühstück für 2 mit Semmeln, Butter, Marmelade, Eiern und Saft hängt bis 08:30 an Ihrer Tür.');
    }
    if (T.isOpenFor(C.season.dateKey)) {
      mk('season', C.season.title + ' vorbestellen', 'Bestellschluss für den ' + T.fmt.dayLong(C.season.dateKey) + ' ist ' + T.fmt.dateTime(T.cutoffFor(C.season.dateKey)) + '.',
        'all', 'email', 'Zum Nikolo: Bestellen Sie das ' + C.season.title + ' als Einmallieferung für den 6. Dezember.');
    }
    if (region && region.planned) {
      mk('prereg', 'Gebiet ' + region.name + ' vormerken', sel.waitlistFor(s, regionId, null).length + ' von ' + region.neededPrereg + ' Haushalten vorgemerkt.',
        'waitlist', 'email', 'Fast geschafft: Mit ' + region.neededPrereg + ' Vormerkungen starten wir bei Ihnen. Erzählen Sie es Ihren Nachbarn.');
    }
    return ideas;
  };

  // ----- Verkaufsförderung
  const STARTER = [
    { id: 'klassiker', title: 'Klassiker', text: 'Der Frühstückstisch für zwei, schnell gepackt.', items: { kaisersemmel: 3, kornweckerl: 2, salzstangerl: 1 } },
    { id: 'brotzeit', title: 'Brotzeit', text: 'Bauernbrot, Stangerl und Butter für eine gemütliche Jause.', popular: true, items: { bauernbrot: 1, salzstangerl: 2, teebutter: 1 } },
    { id: 'sonntag', title: 'Sonntag', text: 'Das Sonntagsfrühstück für zwei mit Butter-Briochestriezel.', anchor: true, items: { 'box-sonntag': 1, briochestriezel: 1 } }
  ];
  sel.starterBags = s => STARTER.map(b => {
    const items = {};
    Object.keys(b.items).forEach(id => { const p = sel.product(s, id); if (p && p.active !== false) items[id] = b.items[id]; });
    if (!Object.keys(items).length) return null;
    const bag = sel.priceBag(s, items, {});
    return { id: b.id, title: b.title, text: b.text, items, total: bag.total, saving: round2(bag.subtotal - bag.total), popular: !!b.popular, anchor: !!b.anchor };
  }).filter(Boolean);

  // Deckungsbeitrag je Stück: Nettopreis minus Einkauf minus Fahrervergütung.
  sel.unitMargin = (s, p) => round2(net(s, p.price) - sel.costOf(s, p) - E(s).driverPerPiece);
  const um = (s, p) => net(s, p.price) - sel.costOf(s, p) - E(s).driverPerPiece;

  sel.focusProposal = (s, n) => s.products.filter(p => p.active !== false).slice()
    .sort((a, b) => um(s, b) - um(s, a) || s.products.indexOf(a) - s.products.indexOf(b)).slice(0, n || 5);

  sel.suggestions = (s, items, max) => {
    const have = items || {}, inBag = id => have[id] > 0;
    const cats = orderedItems(s, have).map(p => p.cat);
    const ids = Object.keys(have).filter(inBag);
    const order = [];
    const spread = ['teebutter', 'marillenmarmelade', 'bluetenhonig', 'liptauer'];
    if (ids.includes('buttercroissant') || ids.includes('topfengolatsche') || ids.includes('nussschnecke')) order.push('marillenmarmelade', 'orangensaft');
    if (cats.includes('brot')) order.push('bergkaese', 'beinschinken');
    if (cats.includes('gebaeck') && !spread.some(inBag)) order.push('teebutter', 'marillenmarmelade');
    s.products.filter(p => (p.bestseller || p.focus) && p.active !== false).forEach(p => order.push(p.id));
    const seen = new Set();
    const cand = order.filter(id => { if (seen.has(id) || inBag(id)) return false; seen.add(id); return true; })
      .map(id => sel.product(s, id)).filter(p => p && p.active !== false && p.cat !== 'boxen' && !p.season && !p.weekendOnly);
    const rank = new Map(cand.map((p, i) => [p.id, i]));
    cand.sort((a, b) => (b.focus ? 1 : 0) - (a.focus ? 1 : 0) || um(s, b) - um(s, a) || rank.get(a.id) - rank.get(b.id));
    return cand.slice(0, max || 3);
  };

  const SWAPS = [['kaisersemmel', 'handsemmel'], ['salzstangerl', 'laugenbreze'], ['kornweckerl', 'dinkelweckerl'], ['topfengolatsche', 'nussschnecke'], ['bauernbrot', 'dinkelbrot']];
  sel.tradeUps = (s, items) => {
    const out = [];
    SWAPS.forEach(pair => {
      const from = sel.product(s, pair[0]), to = sel.product(s, pair[1]);
      if (!from || !to || to.active === false || !(items && items[from.id] > 0) || um(s, to) <= um(s, from)) return;
      const diff = round2(to.price - from.price);
      out.push({ fromId: from.id, toId: to.id, qty: items[from.id], diffPerPiece: diff,
        text: 'Lieber ' + to.name + ' statt ' + from.name + '? ' + (diff >= 0 ? '+' : '−') + App.fmt.eur(Math.abs(diff)) + ' je Stück' });
    });
    return out;
  };

  sel.regionStats = (s, regionId) => {
    const households = s.customers.filter(c => c.regionId === regionId && c.registered).length;
    return { households, deliveriesPerWeek: (aboCounts(s)[regionId] || []).reduce((a, b) => a + b, 0) };
  };

  // ----- Navigation (Google Maps)
  const addressOf = c => c.street + ' ' + c.houseNo + ', ' + c.plz + ' ' + c.city;
  sel.mapsUrl = (s, customerId) => {
    const c = sel.customer(s, customerId);
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(c ? addressOf(c) : '') + '&travelmode=driving';
  };
  sel.mapsRouteUrl = (s, customerIds) => {
    const list = customerIds.slice(0, 10).map(id => sel.customer(s, id)).filter(Boolean).map(addressOf);
    if (!list.length) return '';
    let url = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(list[list.length - 1]);
    if (list.length > 1) url += '&waypoints=' + encodeURIComponent(list.slice(0, -1).join('|'));
    return url + '&travelmode=driving';
  };

  App.sel = sel;

  // ======================================================================= Aktionen
  const A = {};
  const get = () => getState();
  const mapBy = (list, id, fn) => list.map(x => (x.id === id ? fn(x) : x));

  function makeNote(o) {
    return Object.assign({ id: newId('n'), customerId: null, contactName: '', channel: 'push', kind: 'system', title: '', body: '',
      createdAt: nowIso(), read: false, action: null }, o);
  }

  // ----- Demo / Navigation
  A.go = (role, view) => {
    const ui = Object.assign({}, get().ui, { role });
    if (role === 'kunde' && CUSTOMER_VIEWS.includes(view)) ui.customerView = view;
    if (role === 'backoffice' && BO_VIEWS.includes(view)) ui.backofficeView = view;
    setState({ ui });
  };
  function expireReservations(s) {
    const t = T.now().getTime();
    if (!s.waitlist.some(w => w.status === 'notified' && w.reservedUntil && new Date(w.reservedUntil).getTime() <= t)) return null;
    return s.waitlist.map(w => (w.status === 'notified' && w.reservedUntil && new Date(w.reservedUntil).getTime() <= t ? Object.assign({}, w, { status: 'expired' }) : w));
  }
  A.tick = () => {
    const s = get(), wl = expireReservations(s);
    setState(wl ? { tick: s.tick + 1, waitlist: wl } : { tick: s.tick + 1 });
  };
  A.setClock = presetId => {
    const s = get(), offset = T.offsetForPreset(presetId);
    T.setOffset(offset);
    const ui = Object.assign({}, s.ui, { driverDate: defaultDriverDate() });
    if (ui.boDate < T.today()) ui.boDate = T.addDays(T.today(), 1);
    const patch = { clockPreset: presetId, clockOffset: offset, tick: s.tick + 1, ui };
    const wl = expireReservations(s);
    if (wl) patch.waitlist = wl;
    setState(patch);
  };
  A.resetDemo = () => { reset(); };
  A.loginBackoffice = () => setState({ ui: Object.assign({}, get().ui, { boAuthed: true }) });
  A.loginDriver = idx => setState({ ui: Object.assign({}, get().ui, { driverAuthed: true, driverIdx: idx || 0 }) });
  A.logout = role => {
    const ui = Object.assign({}, get().ui);
    if (role === 'backoffice') ui.boAuthed = false;
    if (role === 'fahrer') ui.driverAuthed = false;
    setState({ ui });
  };
  A.switchCustomer = id => { if (sel.customer(get(), id)) setState({ session: { customerId: id } }); };
  A.setUi = patch => setState({ ui: Object.assign({}, get().ui, patch) });

  // ----- Entwurf
  const setDraftPatch = patch => setState({ draft: Object.assign({}, get().draft, patch) });
  A.setDraft = patch => setDraftPatch(patch);
  A.draftCheckPlz = plz => {
    const s = get(), p = String(plz == null ? '' : plz).trim(), r = sel.regionForPlz(s, p);
    const patch = { plz: p, regionId: r && r.region ? r.region.id : null };
    if (!s.draft.address.plz && r && r.region) patch.address = Object.assign({}, s.draft.address, { plz: p });
    setDraftPatch(patch);
    return r;
  };
  // Gemeinsames Sackerl: Artikel mit weekendOnly nur für Sa/So.
  const dayOk = (s, wd, id) => { const p = sel.product(s, id); return !(p && p.weekendOnly && wd < 5); };
  const bagFor = (s, wd, items) => { const o = {}; Object.keys(items || {}).forEach(id => { if (items[id] > 0 && dayOk(s, wd, id)) o[id] = items[id]; }); return o; };
  const filledBag = abo => { const k = Object.keys(abo).map(Number).sort((a, b) => a - b).find(w => Object.keys(abo[w] || {}).length); return k == null ? {} : abo[k]; };
  const abosOf = (s, wds, items) => { const o = {}; wds.forEach(w => { o[w] = bagFor(s, w, items); }); return o; };

  A.draftToggleDay = wd => {
    const s = get(), d = s.draft, abo = Object.assign({}, d.abo);
    if (abo[wd]) delete abo[wd]; else abo[wd] = d.sameForAll ? bagFor(s, wd, filledBag(d.abo)) : {};
    setDraftPatch({ abo });
  };
  A.draftSetQty = (target, productId, qty) => {
    const s = get(), d = s.draft;
    const upd = (base, wd) => { const o = Object.assign({}, base); if (qty > 0 && (wd == null || dayOk(s, wd, productId))) o[productId] = qty; else delete o[productId]; return o; };
    if (target && target.flex) { setDraftPatch({ flex: upd(d.flex) }); return; }
    const abo = Object.assign({}, d.abo);
    const wds = d.sameForAll ? Object.keys(abo).map(Number).concat(abo[target.wd] ? [] : [target.wd]) : [target.wd];
    wds.forEach(w => { abo[w] = upd(abo[w] || {}, w); });
    setDraftPatch({ abo });
  };
  A.draftSetSameForAll = on => {
    const s = get(), d = s.draft;
    if (!on) { setDraftPatch({ sameForAll: false }); return; }
    const wds = Object.keys(d.abo).map(Number), shared = filledBag(d.abo);
    setDraftPatch({ sameForAll: true, abo: Object.assign({}, d.abo, abosOf(s, wds, shared)) });
  };
  A.draftCopyToDays = (fromWd, wds) => {
    const s = get(), d = s.draft, abo = Object.assign({}, d.abo), copied = [], skipped = [];
    const src = d.abo[fromWd] || {};
    wds.filter(w => w !== fromWd).forEach(w => {
      const st = d.regionId ? sel.dayStatusFor(s, d.regionId, w, s.session.customerId) : 'free';
      if (st === 'full' || st === 'closed' || st === 'planned') { skipped.push(w); return; }
      abo[w] = bagFor(s, w, src); copied.push(w);
    });
    setDraftPatch({ abo });
    return { copied, skipped };
  };
  A.draftCopyDay = (fromWd, toWd) => {
    const s = get(), d = s.draft;
    setDraftPatch({ abo: Object.assign({}, d.abo, { [toWd]: bagFor(s, toWd, d.abo[fromWd]) }) });
  };
  A.draftApplyBag = (target, items) => {
    const s = get(), d = s.draft, copy = Object.assign({}, items);
    if (target && target.flex) { setDraftPatch({ flex: copy }); return; }
    const wds = d.sameForAll ? Object.keys(d.abo).map(Number).concat(d.abo[target.wd] ? [] : [target.wd]) : [target.wd];
    setDraftPatch({ abo: Object.assign({}, d.abo, abosOf(s, wds, copy)) });
  };
  A.draftSwap = (target, fromId, toId) => {
    const s = get(), d = s.draft;
    const swap = bag => { const b = Object.assign({}, bag), q = b[fromId] || 0; if (!q || fromId === toId) return b; delete b[fromId]; b[toId] = (b[toId] || 0) + q; return b; };
    if (target && target.flex) { setDraftPatch({ flex: swap(d.flex) }); return; }
    const wds = d.sameForAll ? Object.keys(d.abo).map(Number).concat(d.abo[target.wd] ? [] : [target.wd]) : [target.wd];
    const abo = Object.assign({}, d.abo);
    wds.forEach(w => { abo[w] = bagFor(s, w, swap(abo[w] || {})); });
    setDraftPatch({ abo });
  };
  A.setEconomics = patch => setState({ economics: Object.assign({}, get().economics, patch) });
  A.setWeeklySpecial = patch => setState({ weeklySpecial: Object.assign({}, get().weeklySpecial, patch) });
  A.draftSetFlexDate = dateKey => setDraftPatch({ flexDate: dateKey });

  function coordsFor(region, address) {
    const str = address.street + address.houseNo + address.plz;
    let h = 7;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    const byPlz = region.clusters.filter(c => c.plz === address.plz);
    const pool = byPlz.length ? byPlz : region.clusters;
    const cl = pool[h % pool.length], a = region.area;
    const dx = (((h >>> 3) % 101) / 100 - 0.5) * 0.7, dy = (((h >>> 11) % 101) / 100 - 0.5) * 0.7;
    return { x: Math.round(Math.max(a.x0, Math.min(a.x1, cl.x + dx)) * 100) / 100, y: Math.round(Math.max(a.y0, Math.min(a.y1, cl.y + dy)) * 100) / 100 };
  }

  A.placeOrder = () => {
    const s = get(), ev = evalDraft(s), d = s.draft;
    const problems = ev.plan.concat(ev.addr);
    if (problems.length) return { ok: false, problems };
    const cid = s.session.customerId, cust = sel.customer(s, cid), region = sel.region(s, d.regionId);
    const today = T.today();
    let customers = s.customers;
    if (!cust.registered) {
      const a = d.address, pos = coordsFor(region, a);
      customers = mapBy(customers, cid, c => Object.assign({}, c, {
        name: a.name.trim(), street: a.street.trim(), houseNo: a.houseNo.trim(), plz: a.plz.trim(), city: a.city.trim(),
        email: a.email.trim(), phone: a.phone.trim(), regionId: region.id, x: pos.x, y: pos.y, placement: d.placement,
        note: d.note, notify: Object.assign({}, d.notify), since: today, kind: d.mode, registered: true }));
    } else if (d.mode === 'abo' && cust.kind === 'flex') customers = mapBy(customers, cid, c => Object.assign({}, c, { kind: 'abo' }));

    let subs = s.subs, flexOrders = s.flexOrders;
    const placedWds = [];
    if (d.mode === 'abo') {
      Object.keys(d.abo).map(Number).forEach(wd => {
        subs = subs.filter(x => !(x.customerId === cid && x.weekday === wd)).concat([{
          id: 's-' + cid + '-' + wd, customerId: cid, weekday: wd, items: Object.assign({}, d.abo[wd]), since: today }]);
        placedWds.push(wd);
      });
    } else {
      flexOrders = flexOrders.concat([{ id: newId('f'), customerId: cid, dateKey: d.flexDate, items: Object.assign({}, d.flex), createdAt: nowIso(), status: 'confirmed' }]);
    }
    const waitlist = s.waitlist.map(w => (w.customerId === cid && w.regionId === region.id && placedWds.includes(w.weekday) &&
      (w.status === 'waiting' || w.status === 'notified') ? Object.assign({}, w, { status: 'booked' }) : w));
    const orderNo = 'SE-' + (9400 + Number(newId('x').split('-')[1]));
    const sum = sel.draftSummary(s);
    const channel = d.notify.push ? 'push' : 'email';
    const note = makeNote({ customerId: cid, contactName: d.address.name || cust.name, channel, kind: 'order', read: true,
      title: 'Bestellung ' + orderNo + ' ist eingegangen',
      body: 'Ihre erste Lieferung: ' + T.fmt.dayLong(ev.firstDelivery) + ', bis spätestens ' + T.fmt.hm(T.deadlineMin(ev.firstDelivery)) + ' Uhr.' });
    const lastOrder = { orderNo, mode: d.mode, firstDelivery: ev.firstDelivery, cutoff: ev.cutoff, deliveries: sum.deliveries,
      perWeek: sum.perWeek, total: sum.total, placedAt: nowIso(), customerId: cid, regionId: region.id };
    const fresh = Object.assign(App.data.draftDefaults(), { plz: d.plz, regionId: d.regionId, address: Object.assign({}, d.address),
      placement: d.placement, note: d.note, notify: Object.assign({}, d.notify), payment: d.payment, step: 'fertig', lastOrder });
    setState({ customers, subs, flexOrders, waitlist, notifications: s.notifications.concat([note]), draft: fresh });
    return { ok: true, problems: [], firstDelivery: ev.firstDelivery, orderNo };
  };

  // ----- Kunde
  A.joinWaitlist = o => {
    const s = get();
    const cid = o.customerId || null, wd = o.weekday == null ? null : o.weekday, rid = o.regionId || null;
    const dup = s.waitlist.find(w => cid && w.customerId === cid && w.regionId === rid && w.weekday === wd && (w.status === 'waiting' || w.status === 'notified'));
    if (dup) return { id: dup.id, position: sel.waitPosition(s, cid, rid, wd) };
    const c = cid ? sel.customer(s, cid) : null;
    const contact = Object.assign({ name: c && c.registered ? c.name : '', plz: s.draft.plz || '', email: c ? c.email : '' }, o.contact || {});
    const entry = { id: newId('w'), regionId: rid, weekday: wd, customerId: cid, contact, channel: o.channel || 'push',
      createdAt: nowIso(), status: 'waiting', notifiedAt: null, reservedUntil: null };
    setState({ waitlist: s.waitlist.concat([entry]) });
    return { id: entry.id, position: sel.waitPosition(get(), cid, rid, wd) };
  };
  A.leaveWaitlist = id => setState({ waitlist: get().waitlist.filter(w => w.id !== id) });
  A.skipDate = (cid, k) => {
    const s = get(), cur = s.skips[cid] || [];
    if (!T.isOpenFor(k) || cur.includes(k)) return false;
    setState({ skips: Object.assign({}, s.skips, { [cid]: cur.concat([k]).sort() }) });
    return true;
  };
  A.unskipDate = (cid, k) => {
    const s = get();
    if (!T.isOpenFor(k)) return false;
    setState({ skips: Object.assign({}, s.skips, { [cid]: (s.skips[cid] || []).filter(x => x !== k) }) });
    return true;
  };
  A.setPause = (cid, from, to) => {
    const s = get(), id = newId('p');
    setState({ pauses: s.pauses.concat([{ id, customerId: cid, from, to }]) });
    return id;
  };
  A.clearPause = id => setState({ pauses: get().pauses.filter(p => p.id !== id) });
  A.setSubQty = (cid, wd, productId, qty) => {
    const s = get(), sub = s.subs.find(x => x.customerId === cid && x.weekday === wd);
    const items = Object.assign({}, sub ? sub.items : {});
    if (qty > 0) items[productId] = qty; else delete items[productId];
    let subs;
    if (!Object.keys(items).length) subs = s.subs.filter(x => x !== sub);              // letzter Artikel entfernt: Tag entfällt
    else if (sub) subs = s.subs.map(x => (x === sub ? Object.assign({}, x, { items }) : x));
    else subs = s.subs.concat([{ id: 's-' + cid + '-' + wd, customerId: cid, weekday: wd, items, since: T.today() }]);
    setState({ subs });
  };
  A.removeSubDay = (cid, wd) => setState({ subs: get().subs.filter(x => !(x.customerId === cid && x.weekday === wd)) });
  A.cancelFlex = id => setState({ flexOrders: mapBy(get().flexOrders, id, f => Object.assign({}, f, { status: 'cancelled' })) });
  A.markRead = (idOrAll, cid) => {
    const all = idOrAll === 'all' || idOrAll === true;
    setState({ notifications: get().notifications.map(n => ((all ? n.customerId === cid : n.id === idOrAll) && !n.read ? Object.assign({}, n, { read: true }) : n)) });
  };
  A.updateCustomer = (id, patch) => setState({ customers: mapBy(get().customers, id, c => Object.assign({}, c, patch,
    patch.notify ? { notify: Object.assign({}, c.notify, patch.notify) } : {})) });

  // ----- Backoffice
  function notifyEntries(s, entries) {
    const until = new Date(T.now().getTime() + C.reserveHours * 3600000).toISOString();
    const ids = new Set(entries.map(e => e.id)), notes = [];
    const waitlist = s.waitlist.map(w => (ids.has(w.id) ? Object.assign({}, w, { status: 'notified', notifiedAt: nowIso(), reservedUntil: until }) : w));
    entries.forEach(w => {
      const region = sel.region(s, w.regionId);
      const day = w.weekday == null ? null : T.WD_LONG[w.weekday];
      notes.push(makeNote({ customerId: w.customerId, contactName: w.contact.name, channel: w.channel, kind: 'waitlist',
        title: day ? day + ' ist frei – ' + C.reserveHours + ' Stunden für Sie reserviert' : 'Wir liefern jetzt in ' + (region ? region.name : 'Ihr Gebiet'),
        body: day ? 'Ihr Wunschtag ' + day + ' hat wieder Platz. Wir halten ihn bis ' + T.fmt.rel(until) + ' für Sie frei.' : 'Ihr Gebiet ist freigeschaltet. Jetzt Lieferplan zusammenstellen.',
        action: { view: 'lieferplan', weekday: w.weekday } }));
    });
    const push = entries.filter(e => e.channel === 'push').length;
    return { patch: { waitlist, notifications: s.notifications.concat(notes) }, result: { notified: entries.length, push, email: entries.length - push } };
  }
  function waitingEntries(s, regionId, wd) {
    return s.waitlist.filter(w => w.regionId === regionId && w.weekday === wd && w.status === 'waiting').sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }

  A.setCapacity = (regionId, wd, patch) => {
    const s = get();
    const rows = (s.capacity[regionId] || []).map((r, i) => (i === wd ? Object.assign({}, r, patch) : r));
    setState({ capacity: Object.assign({}, s.capacity, { [regionId]: rows }) });
    const s2 = get(), c = sel.cap(s2, regionId, wd), region = sel.region(s2, regionId);
    if (!region.planned && c.status === 'open' && c.autoNotify && c.freeAbo > 0) {
      const entries = waitingEntries(s2, regionId, wd).slice(0, c.freeAbo);
      if (entries.length) { const n = notifyEntries(s2, entries); setState(n.patch); return n.result; }
    }
    return { notified: 0, push: 0, email: 0 };
  };
  A.notifyWaitlist = (regionId, wd, count) => {
    const s = get(), entries = waitingEntries(s, regionId, wd).slice(0, count == null ? Infinity : count);
    if (!entries.length) return { notified: 0, push: 0, email: 0 };
    const n = notifyEntries(s, entries);
    setState(n.patch);
    return n.result;
  };
  A.sendCampaign = o => {
    const s = get(), list = sel.segmentCustomers(s, o.segment, o.regionId || undefined);
    // Nachrichten landen nur bei den beiden Demo-Konten im Postfach; die Empfängerzahl zählt alle.
    const demo = list.filter(r => r.customerId === 'me' || r.customerId === 'c-huber');
    const notes = demo.map(r => makeNote({ customerId: r.customerId, contactName: r.name, channel: o.channel, kind: 'promo', title: o.title, body: o.body,
      action: { view: 'sortiment', weekday: null } }));
    const camp = { id: newId('k'), title: o.title, body: o.body, channel: o.channel, segment: o.segment, regionId: o.regionId || null, sentAt: nowIso(), recipients: list.length };
    setState({ campaigns: [camp].concat(s.campaigns), notifications: s.notifications.concat(notes) });
    return { recipients: list.length };
  };
  A.updateProduct = (id, patch) => setState({ products: mapBy(get().products, id, p => Object.assign({}, p, patch)) });
  A.sendBakeryOrder = dateKeys => {
    const s = get(), at = nowIso(), bo = Object.assign({}, s.bakeryOrders);
    dateKeys.forEach(k => { bo[k] = { sentAt: at }; });
    setState({ bakeryOrders: bo });
    return at;
  };
  A.sendTour = (regionId, dateKey) => {
    const s = get(), at = nowIso();
    setState({ toursSent: Object.assign({}, s.toursSent, { [regionId + '|' + dateKey]: at }) });
    return at;
  };
  A.saveOffer = offer => {
    const s = get(), o = Object.assign({ id: newId('o'), active: true, weekdays: null, note: '' }, offer);
    const exists = s.offers.some(x => x.id === o.id);
    setState({ offers: exists ? s.offers.map(x => (x.id === o.id ? o : x)) : s.offers.concat([o]) });
    return o.id;
  };
  A.toggleOffer = (id, active) => setState({ offers: mapBy(get().offers, id, o => Object.assign({}, o, { active: !!active })) });
  A.deleteOffer = id => setState({ offers: get().offers.filter(o => o.id !== id) });

  // ----- Fahrer
  A.markStop = (dateKey, cid, status, reason) => {
    const s = get(), day = Object.assign({}, s.deliveries[dateKey] || {});
    day[cid] = { status, at: nowIso(), reason: reason || '' };
    const patch = { deliveries: Object.assign({}, s.deliveries, { [dateKey]: day }) };
    const c = sel.customer(s, cid);
    if (status === 'delivered' && c && c.notify && c.notify.push) {
      patch.notifications = s.notifications.filter(n => n.ref !== 'delivery|' + dateKey + '|' + cid).concat([makeNote({
        customerId: cid, contactName: c.name, channel: 'push', kind: 'delivery', title: 'Ihr Frühstück ist da',
        body: (C.labels.placement[c.placement] || 'Vor der Tür') + (c.placement === 'hinweis' && c.note ? ': ' + c.note : '') + '. Guten Appetit!',
        ref: 'delivery|' + dateKey + '|' + cid })]);
    }
    setState(patch);
  };
  A.undoStop = (dateKey, cid) => {
    const s = get(), day = Object.assign({}, s.deliveries[dateKey] || {});
    delete day[cid];
    setState({ deliveries: Object.assign({}, s.deliveries, { [dateKey]: day }),
      notifications: s.notifications.filter(n => n.ref !== 'delivery|' + dateKey + '|' + cid) });
  };

  App.actions = A;
})(typeof window !== 'undefined' ? window : globalThis);
