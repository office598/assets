// Test der Kernlogik (Node, ohne DOM): node tools/test-core.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const core = join(dirname(fileURLToPath(import.meta.url)), '..', 'js', 'core');
const load = f => vm.runInThisContext(readFileSync(join(core, f + '.js'), 'utf8'), { filename: f + '.js' });

load('config'); load('time');
const App = globalThis.App;
App.time.setNow(new Date(2026, 10, 24, 10, 0));   // Di 24.11.2026 10:00, vor dem Seed
const t0 = performance.now();
load('data'); load('routing'); load('store');
const { sel, actions: A, store, time: T, config: C } = App;
const s0 = store.getState();
const seedMs = performance.now();
sel.tourPlan(s0, 'nord', T.nextDateForWeekday(0), 1);
const initMs = performance.now() - t0;

let pass = 0, fail = 0;
function check(name, cond, info) {
  if (cond) { pass++; console.log('ok   ' + name); }
  else { fail++; console.log('FAIL ' + name + (info !== undefined ? '  -> ' + JSON.stringify(info) : '')); }
}
const eq = (name, a, b) => check(name, JSON.stringify(a) === JSON.stringify(b), { got: a, want: b });
const hm = m => T.fmt.hm(m);

// --- Zeit
eq('Bestellschluss Mi -> Di 16:30', [T.key(T.cutoffFor('2026-11-25')), T.fmt.hm(T.cutoffFor('2026-11-25'))], ['2026-11-24', '16:30']);
for (const k of ['2026-11-28', '2026-11-29', '2026-11-30'])
  eq('Bestellschluss ' + T.fmt.day(k) + ' -> Fr 16:30', [T.key(T.cutoffFor(k)), T.fmt.hm(T.cutoffFor(k))], ['2026-11-27', '16:30']);
check('isOpenFor morgen (Di 10:00)', T.isOpenFor('2026-11-25') && T.isOpenFor('2026-11-30'));
eq('nextDateForWeekday(0)', T.nextDateForWeekday(0), '2026-11-30');
eq('Format eur/pct', [App.fmt.eur(1.2).replace(' ', ' '), App.fmt.pct(0.52).replace(' ', ' ')], ['€ 1,20', '52 %']);
eq('fmt.day / dayLong', [T.fmt.day('2026-11-24'), T.fmt.dayLong('2026-11-24')], ['Di, 24.11.', 'Dienstag, 24. November']);

// --- PLZ und Gebiete
const rp = p => sel.regionForPlz(s0, p);
for (const p of ['5303', '5322', '5203', '5321', '5301', '5302', '5202', '5300', '5023']) eq('PLZ ' + p + ' -> nord', rp(p).region.id, 'nord');
eq('PLZ 5322 -> nord', rp('5322').region.id, 'nord');
eq('PLZ 5310 -> sued', rp('5310').region.id, 'sued');
check('PLZ 5330 -> west (in Planung)', rp('5330').region.id === 'west' && rp('5330').region.planned);
eq('PLZ 1010 -> außerhalb', [rp('1010').region, rp('1010').outside], [null, true]);
eq('PLZ 53 -> null', rp('53'), null);

// --- Kapazität
const c0 = sel.cap(s0, 'nord', 0), c1 = sel.cap(s0, 'nord', 1), c6 = sel.cap(s0, 'nord', 6);
check('cap nord Mo: abo 41 / max 38 / full', c0.abo === 41 && c0.max === 38 && c0.effective === 'full', c0);
eq('cap nord Di free', c1.effective, 'free');
eq('cap nord So few', c6.effective, 'few');
eq('cap west planned', sel.cap(s0, 'west', 1).effective, 'planned');
const wantAbo = { nord: [41, 19, 18, 21, 22, 38, 50], sued: [26, 12, 11, 13, 14, 24, 30] };
for (const r of ['nord', 'sued']) eq('Abo-Stopps ' + r, sel.utilization(s0, r).map(u => u.abo), wantAbo[r]);
eq('weakDays nord = Di-Fr', sel.weakDays(s0, 'nord'), [1, 2, 3, 4]);
check('Seed: Kundenzahlen', s0.customers.filter(c => c.regionId === 'nord').length === 95 && s0.customers.filter(c => c.regionId === 'sued').length === 65);
check('Seed: Kunden haben plz+city', s0.customers.filter(c => c.registered).every(c => /^\d{4}$/.test(c.plz) && c.city));
eq('Seed: Warteliste nord Mo / west', [sel.waitlistFor(s0, 'nord', 0).length, sel.waitlistFor(s0, 'west', null).length], [6, 14]);
check('Seed: heutige Stopps zugestellt', Object.keys(s0.deliveries['2026-11-24'] || {}).length === sel.stopsOn(s0, 'nord', '2026-11-24').length + sel.stopsOn(s0, 'sued', '2026-11-24').length);
check('JSON-serialisierbar', JSON.stringify(JSON.parse(JSON.stringify(s0))) === JSON.stringify(s0));

// --- Kalibrierung (Abschnitt 8.9)
const endOf = (wd, d) => sel.tourPlan(s0, 'nord', T.nextDateForWeekday(wd), d).endMin;
const tue = sel.tourPlan(s0, 'nord', T.nextDateForWeekday(1), 1);
const mo1 = endOf(0, 1), mo2 = endOf(0, 2), so = endOf(6);
check('Kalibrierung nord Di 48-62 km, Ende <= 05:40 (' + Math.round(tue.km) + ' km, ' + hm(tue.endMin) + ')', tue.km >= 48 && tue.km <= 62 && tue.endMin <= 340);
check('Kalibrierung nord Mo 1 Fahrer 06:36-06:55 (' + hm(mo1) + ')', mo1 >= 396 && mo1 <= 415);
check('Mo 1 Fahrer zu spät (late)', sel.tourPlan(s0, 'nord', '2026-11-30', 1).late === true);
check('Kalibrierung nord Mo 2 Fahrer <= 05:30 (' + hm(mo2) + ')', mo2 <= 330 && !sel.tourPlan(s0, 'nord', '2026-11-30', 2).late);
for (const wd of [2, 3, 4]) check('Kalibrierung nord ' + T.WD[wd] + ' <= 05:45 (' + hm(endOf(wd)) + ')', endOf(wd) <= 345);
check('Kalibrierung nord So 07:45-08:25 (' + hm(so) + ')', so >= 465 && so <= 505 && !sel.tourPlan(s0, 'nord', T.nextDateForWeekday(6), 1).late);
check('Tour-Start 03:30 / 04:30', sel.tourPlan(s0, 'nord', T.nextDateForWeekday(1)).tours[0].startMin === 210 && sel.tourPlan(s0, 'nord', T.nextDateForWeekday(6)).tours[0].startMin === 270);
const tp = sel.tourPlan(s0, 'nord', '2026-11-30', 2);
check('tourPlan Struktur', tp.tours.length === 2 && tp.tours[0].stops[0].seq === 1 && tp.tours[0].driver.name === 'Jovana' &&
  tp.stops === tp.tours[0].stops.length + tp.tours[1].stops.length && tp.deadlineMin === 390);
check('tourPlan memoisiert', sel.tourPlan(s0, 'nord', '2026-11-30', 2) === tp);
const ids = tp.tours.flatMap(t => t.stops.map(x => x.customerId));
check('tourPlan: jeder Stopp genau einmal', new Set(ids).size === ids.length && ids.length === sel.stopsOn(s0, 'nord', '2026-11-30').length);
check('forecastEnd', sel.forecastEnd(s0, 'nord', 0, 1).endMin === mo1 && sel.forecastEnd(s0, 'nord', 0, 1).late);
check('Zeit: Init + tourPlan < 300 ms (' + Math.round(initMs) + ' ms)', initMs < 300);

// --- flexInfo
const fi = sel.flexInfo(s0, 'nord', '2026-11-30', 'me');
eq('flexInfo Mo voll', fi.state, 'full');
eq('flexInfo Di frei', sel.flexInfo(s0, 'nord', '2026-11-25', 'me').state, 'free');
eq('flexInfo heute: Bestellschluss', sel.flexInfo(s0, 'nord', '2026-11-24', 'me').state, 'cutoff');
eq('flexInfo west planned', sel.flexInfo(s0, 'west', '2026-11-25', 'me').state, 'planned');
const hubSub = sel.upcoming(s0, 'c-huber', 3);
check('flexInfo alreadyStop -> free', sel.flexInfo(s0, 'nord', '2026-11-28', 'c-huber').alreadyStop === true && sel.flexInfo(s0, 'nord', '2026-11-28', 'c-huber').state === 'free');
check('upcoming c-huber: Mi, Sa, So', hubSub.length === 3 && hubSub.map(x => x.wd).join() === '2,5,6' && hubSub[0].changeable === true, hubSub.map(x => x.dateKey));

// --- Preise und Mengenaktionen
const on = ids => Object.assign({}, s0, { offers: s0.offers.map(o => (ids.includes(o.id) ? Object.assign({}, o, { active: true }) : o)) });
const s1 = on(['semmel-5-1', 'croissant-2-1']);
eq('Seed-Aktionen: aktiv', s0.offers.map(o => [o.id, o.active]), [['butter-marmelade', true], ['striezel-wochenende', true], ['semmel-5-1', false], ['croissant-2-1', false]]);
const six = sel.priceBag(s1, { kaisersemmel: 6 }, { wd: 0 });
check('priceBag: 6 Kaisersemmeln -> eine gratis (Aktion an)', six.discounts.length === 1 && six.discounts[0].freeQty === 1 && Math.abs(six.total - 3.25) < 1e-9, six);
check('priceBag: Aktion aus -> kein Rabatt', sel.priceBag(s0, { kaisersemmel: 6 }, { wd: 0 }).discounts.length === 0);
check('priceBag: 5 Kaisersemmeln -> Hinweis', sel.priceBag(s1, { kaisersemmel: 5 }, { wd: 0 }).hints.some(h => h.offerId === 'semmel-5-1'));
check('priceBag: Croissants nur Di-Fr', sel.priceBag(s1, { buttercroissant: 3 }, { wd: 1 }).discounts.length === 1 && sel.priceBag(s1, { buttercroissant: 3 }, { wd: 5 }).discounts.length === 0);
const st = sel.priceBag(s0, { kaisersemmel: 4, briochestriezel: 1 }, { wd: 5 });
check('priceBag: Briochestriezel -10 % nur am Wochenende', st.discounts.length === 1 && Math.abs(st.discounts[0].amount - 0.69) < 1e-9 &&
  sel.priceBag(s0, { kaisersemmel: 4, briochestriezel: 1 }, { wd: 2 }).discounts.length === 0, st);
check('Hinweistext Prozent-Aktion', sel.priceBag(s0, { kaisersemmel: 4 }, { wd: 5 }).hints.some(h => h.text === 'Butter-Briochestriezel dazu: −10 %') &&
  sel.priceBag(s0, { teebutter: 1 }, { wd: 2 }).hints.some(h => h.text === 'Marillenmarmelade dazu: −10 %'));
eq('priceOf ohne Rabatt', sel.priceOf(s0, { kaisersemmel: 6 }), 3.9);
eq('itemsText', sel.itemsText(s0, { kaisersemmel: 4, buttercroissant: 2 }), '4 Kaisersemmeln, 2 Buttercroissants');
check('offersForProduct Etikett', sel.offersForProduct(s1, 'kaisersemmel', 0).some(o => o.badge === '5 + 1 gratis'));
const ocLoss = sel.offerCalc(s0, s0.offers.find(o => o.id === 'semmel-5-1'));
const ocGain = sel.offerCalc(s0, s0.offers.find(o => o.id === 'butter-marmelade'));
check("offerCalc(semmel-5-1).verdict === 'loss'", ocLoss.verdict === 'loss' && ocLoss.giftUnitMargin < 0 && ocLoss.deltaPerBundle < 0 && ocLoss.driverPerPiece === 0.36 && Math.abs(ocLoss.discountPerUnit - 0.59) < 0.011, ocLoss);
check("offerCalc(butter-marmelade).verdict === 'gain'", ocGain.verdict === 'gain' && ocGain.giftUnitMargin > 0 && ocGain.deltaPerBundle > 0 && ocGain.breakEvenUpliftPct === null, ocGain);
check('offerCalc: Felder', ['normalRevenue', 'normalCost', 'normalMargin', 'offerRevenue', 'offerCost', 'offerMargin', 'marginDropPct'].every(k => k in ocLoss));
const fr = o => sel.feeFor(s0, Object.assign({ mode: 'abo', wd: 3, regionId: 'nord', customerId: 'c-huber' }, o));
check('Gebühren: Werktag/Wochenende, Abo/Einmalig', fr({}) === 1.75 && fr({ wd: 5 }) === 2.75 && fr({ mode: 'flex' }) === 2.5 && fr({ mode: 'flex', wd: 6 }) === 3.5 && C.fees.freeDeliveryFrom === null && fr({ total: 100 }) === 1.75);
check('feeFor: Neukunde Di gratis, am Sa nicht', sel.feeFor(s0, { mode: 'abo', wd: 1, regionId: 'nord', customerId: 'me' }) === 0 && sel.feeFor(s0, { mode: 'abo', wd: 5, regionId: 'nord', customerId: 'me' }) === 2.75);
C.fees.freeDeliveryFrom = 15;
check('Gratis-Zustellung ab 15 EUR (wenn gesetzt)', fr({ total: 15 }) === 0 && fr({ total: 14.99 }) === 1.75 && fr({ mode: 'flex', total: 20 }) === 0);
const big = { kaisersemmel: 5, buttercroissant: 3, bauernbrot: 3 };
const mkDraft = ab => sel.draftSummary(Object.assign({}, s0, { draft: Object.assign({}, s0.draft, { regionId: 'nord', abo: ab }) })).deliveries;
const dsFree = mkDraft({ 5: big, 6: { kaisersemmel: 4 } });
check('draftSummary: freeDeliveryMissing', dsFree[0].fee === 0 && dsFree[0].freeDeliveryMissing === 0 && dsFree[1].freeDeliveryMissing > 12 && dsFree[1].fee === 2.75, dsFree);
C.fees.freeDeliveryFrom = null;
check('freeDeliveryMissing aus = 0', mkDraft({ 6: { kaisersemmel: 4 } })[0].freeDeliveryMissing === 0 && mkDraft({ 6: big })[0].fee === 2.75);
check('Produkt-Flags bestseller/isNew', ['kaisersemmel', 'kornweckerl', 'buttercroissant', 'bauernbrot', 'teebutter', 'box-sonntag'].every(i => sel.product(s0, i).bestseller) &&
  ['dinkelweckerl', 'liptauer', 'box-nikolo'].every(i => sel.product(s0, i).isNew) && !sel.product(s0, 'laugenbreze').bestseller);
const ec = s0.economics, expCost = pr => (pr.cat === 'extras' ? pr.price / (1 + ec.vatRate) * ec.extrasCostShare : pr.price / (1 + ec.vatRate) / (1 + ec.shopMarkup) * (1 - ec.purchaseDiscount));
check('Einkauf netto aus Konfiguration', ['kaisersemmel', 'teebutter', 'box-sonntag'].every(id => Math.abs(sel.costOf(s0, sel.product(s0, id)) - expCost(sel.product(s0, id))) < 1e-3 && Math.abs(sel.product(s0, id).cost - sel.costOf(s0, sel.product(s0, id))) < 1e-9) && ec.purchaseDiscount === C.economics.purchaseDiscount);
check('Preise 8.7 und Allergene', sel.product(s0, 'kaisersemmel').price === 0.65 && sel.product(s0, 'box-familie').price === 27.9 &&
  s0.products.every(p => Array.isArray(p.allergens) && p.cost > 0 && p.cost < p.price) && sel.product(s0, 'buttercroissant').allergens.includes('G') && !!C.labels.allergens.A);
const sb = sel.starterBags(s0);
check('starterBags: 3 Sackerl mit Summen', sb.length === 3 && sb.every(b => b.total > 0 && b.saving >= 0 && b.title) && sb[0].total === 6.35 && sb[1].total === 8.9 && sb[2].total === 23.8, sb.map(b => [b.title, b.total, b.saving]));
eq('starterBags Klassiker', sb[0].items, { kaisersemmel: 3, kornweckerl: 2, salzstangerl: 1 });
check('starterBags popular/anchor', sb[1].id === 'brotzeit' && sb[1].popular === true && sb[2].anchor === true && !sb[0].popular && sb[2].items['box-sonntag'] === 1 && sb[1].items.bauernbrot === 1);
check('suggestions: nie bereits im Sackerl', [{ kaisersemmel: 4 }, { buttercroissant: 2, marillenmarmelade: 1 }, { bauernbrot: 1, bergkaese: 1 }, {}].every(it =>
  { const r = sel.suggestions(s0, it, 3); return r.length > 0 && r.length <= 3 && r.every(p => !(it[p.id] > 0)); }));
check('suggestions: Fokus-Artikel zuerst', sel.suggestions(s0, { kaisersemmel: 4 }, 3)[0].focus === true && sel.suggestions(s0, { kaisersemmel: 4 }, 3).every(p => p.cat !== 'boxen'));
check('unitMargin: Brot > Semmel', sel.unitMargin(s0, sel.product(s0, 'bauernbrot')) > sel.unitMargin(s0, sel.product(s0, 'kaisersemmel')));
const tu = sel.tradeUps(s0, { kaisersemmel: 3, kornweckerl: 1 });
check('tradeUps: Kaisersemmel -> Bio-Handsemmel', tu.some(t => t.fromId === 'kaisersemmel' && t.toId === 'handsemmel' && t.qty === 3 && t.diffPerPiece === 0.65 && t.text.includes('Handsemmel')) && sel.tradeUps(s0, {}).length === 0, tu);
const fp = sel.focusProposal(s0, 5);
check('focusProposal(5): keine Kaisersemmel, absteigend', fp.length === 5 && !fp.some(p => p.id === 'kaisersemmel') && fp.every((p, i) => i === 0 || sel.unitMargin(s0, fp[i - 1]) >= sel.unitMargin(s0, p)), fp.map(p => p.id));
check('Seed: Fokus und Brot der Woche', ['bauernbrot', 'briochestriezel', 'box-sonntag', 'buttercroissant'].every(i => sel.product(s0, i).focus) && s0.weeklySpecial.productId === 'nussbrot' && s0.weeklySpecial.pct === 0);
// Sackerl-Mischung des Seeds
const mix = (() => {
  const c = { semmel: 0, weckerl: 0, suess: 0, brot: 0, other: 0 }, pcs = []; let val = 0, n = 0;
  s0.subs.filter(x => sel.customer(s0, x.customerId).regionId === 'nord').forEach(x => {
    pcs.push(sel.pieces(x.items));
    Object.keys(x.items).forEach(id => {
      const p = sel.product(s0, id), q = x.items[id]; n += q; val += q * p.price;
      if (id === 'kaisersemmel' || id === 'handsemmel') c.semmel += q; else if (p.cat === 'gebaeck') c.weckerl += q;
      else if (p.cat === 'suess') c.suess += q; else if (p.cat === 'brot') c.brot += q; else c.other += q;
    });
  });
  return { avg: n / pcs.length, perPiece: val / n, semmel: c.semmel / n, weckerl: c.weckerl / n, suess: c.suess / n, brot: c.brot / n };
})();
check('Seed-Mischung: ~5 Stück, 1,40-1,55 EUR/Stück, Anteile (' + mix.avg.toFixed(2) + ' Stk, ' + mix.perPiece.toFixed(2) + ' EUR)', mix.avg >= 4.6 && mix.avg <= 5.4 && mix.perPiece >= 1.4 && mix.perPiece <= 1.55 &&
  Math.abs(mix.semmel - 0.23) < 0.05 && Math.abs(mix.weckerl - 0.57) < 0.06 && Math.abs(mix.suess - 0.16) < 0.05 && Math.abs(mix.brot - 0.04) < 0.03, mix);
const rs = sel.regionStats(s0, 'nord');
check('regionStats.households > 0', rs.households > 0 && rs.deliveriesPerWeek === 209, rs);

// --- Wirtschaftlichkeit
check('pieces', sel.pieces({ kaisersemmel: 4, bauernbrot: 1 }) === 5 && sel.pieces({}) === 0);
const te = sel.tourEconomics(s0, 'nord', '2026-11-30', 1);
const te2 = sel.tourEconomics(s0, 'nord', '2026-11-30', 2);
const mixAvgStop = s0.subs.filter(x => sel.customer(s0, x.customerId).regionId === 'nord').reduce((a, x) => a + sel.pieces(x.items), 0) / 209;
check('tourEconomics: Fahrer = Stück x 0,36', te.pieces > 100 && Math.abs(te.driverPay - te.pieces * 0.36) < 0.01 && te.stops === sel.stopsOn(s0, 'nord', '2026-11-30').length &&
  te.perDriver.length === 1 && te.perDriver[0].minApplied === false && Math.abs(te.perDriver[0].pay - te.perDriver[0].pieceBased) < 0.01 &&
  Math.abs(te.margin - (te.productRevenue + te.fees - te.goodsCost - te.driverPay)) < 0.011, te);
const teSat = sel.tourEconomics(s0, 'nord', '2026-11-28');
A.setEconomics({ driverMinPerTour: 0 });
const sEco = store.getState();
check('setEconomics: Mindestvergütung 0 = reine Stückvergütung', sEco.economics.driverMinPerTour === 0 && sel.tourEconomics(sEco, 'nord', T.nextDateForWeekday(1)).perDriver[0].minApplied === false &&
  Math.abs(sel.tourEconomics(sEco, 'nord', T.nextDateForWeekday(1)).driverPay - sel.tourEconomics(sEco, 'nord', T.nextDateForWeekday(1)).pieces * 0.36) < 0.01 && sel.kpis(sEco, 'nord').weeklyMargin > sel.kpis(s0, 'nord').weeklyMargin);
A.setEconomics({ driverPerPiece: 0.5 });
check('setEconomics: Satz je Stück wirkt in Selektoren', sel.unitMargin(store.getState(), sel.product(store.getState(), 'bauernbrot')) < sel.unitMargin(sEco, sel.product(sEco, 'bauernbrot')));
const umBefore = sel.unitMargin(store.getState(), sel.product(store.getState(), 'kaisersemmel'));
const costBefore = sel.costOf(store.getState(), sel.product(store.getState(), 'kaisersemmel'));
const gmBefore = sel.offerCalc(store.getState(), store.getState().offers.find(o => o.id === 'semmel-5-1')).giftUnitMargin;
A.updateProduct('kaisersemmel', { costOverride: 0.2 });
const sCo = store.getState();
check('costOverride: costOf, unitMargin, offerCalc', sel.costOf(sCo, sel.product(sCo, 'kaisersemmel')) === 0.2 && Math.abs(sel.unitMargin(sCo, sel.product(sCo, 'kaisersemmel')) - (umBefore + costBefore - 0.2)) < 0.011 &&
  sel.offerCalc(sCo, sCo.offers.find(o => o.id === 'semmel-5-1')).giftUnitMargin > gmBefore + (costBefore - 0.2) - 0.011, { umBefore, gmBefore, costBefore });
A.resetDemo();
check('resetDemo setzt Kalkulation zurück', store.getState().economics.driverMinPerTour === 50 && store.getState().economics.driverPerPiece === 0.36 && sel.product(store.getState(), 'kaisersemmel').costOverride === null);
check('Mo mit 2 Fahrern: je mindestens 50', te2.perDriver.length === 2 && te2.perDriver.every(d => d.pay >= 50 && d.pay >= d.pieceBased - 0.01) && te2.perDriver[0].pieces + te2.perDriver[1].pieces === te2.pieces, te2.perDriver);
const teTue = sel.tourEconomics(s0, 'nord', T.nextDateForWeekday(1));
check('Di: Fahrer 50 mit Mindestvergütung', teTue.perDriver[0].pay === 50 && teTue.perDriver[0].minApplied && teTue.perDriver[0].pieceBased < 50 && teTue.driverPay === 50, teTue.perDriver);
check('tourEconomics: Wochenendgebühr netto 2,50', Math.abs(teSat.fees / teSat.stops - 2.75 / 1.1) < 0.25, teSat.fees / teSat.stops);
check('perDriver: afterKm = Vergütung - km x kmCost', te.perDriver.every(d => d.km > 0 && Math.abs(d.afterKm - (d.pay - d.km * C.economics.kmCost)) < 0.011 && d.hours > 0 &&
  Math.abs(d.perHour - d.afterKm / d.hours) < 0.06 && d.stopsPerKm > 0), te.perDriver);
const we = sel.weekdayEconomics(s0, 'nord');
check('weekdayEconomics: 7 Tage, Di je Stunde klar unter Mo', we.length === 7 && we.every((e, i) => e.wd === i && e.stops > 0) && we[1].driverPay === 50 && we[1].businessMargin < we[0].businessMargin * 0.5, we.map(e => [e.wd, e.stops, e.perHour]));
const ms = sel.marginalStop(s0, 'nord');
check('marginalStop: Fahrer = Stück je Stopp x 0,36', Math.abs(ms.driver - ms.pieces * 0.36) < 0.01 && Math.abs(ms.pieces - mixAvgStop) < 0.02 && ms.business > 0, ms);
console.log('     weekdayEconomics nord (Tag Stopps km Marge Fahrer nachKm €/Std): ' + we.map(e => [T.WD[e.wd], e.stops, e.km, e.businessMargin, e.driverPay, e.afterKm, e.perHour].join(' ')).join(' | '));
console.log('     marginalStop nord: ' + JSON.stringify(ms));
const kp = sel.kpis(s0, 'nord');
check('kpis: Deckungsbeitrag pro Woche', kp.weeklyMargin > 0 && Math.abs(kp.weeklyMargin - (kp.weeklyProductRevenue + kp.weeklyFees - kp.weeklyGoodsCost - kp.weeklyDriverPay)) < 0.02, kp);
const avgPcs = (() => { let p = 0, n = 0; s0.subs.filter(x => sel.customer(s0, x.customerId).regionId === 'nord').forEach(x => { p += sel.pieces(x.items); n++; }); return p / n; })();
check('Seed: Sackerlgröße im Mittel 3,5-5,5 Stück (' + avgPcs.toFixed(2) + ')', avgPcs > 3.5 && avgPcs < 5.5);
console.log('     Stück je Stopp ' + avgPcs.toFixed(2) + '; Mo 1 Fahrer: ' + sel.tourEconomics(s0, 'nord', '2026-11-30', 1).driverPay + ', 2 Fahrer: ' + sel.tourEconomics(s0, 'nord', '2026-11-30', 2).driverPay);
console.log('     (nord Deckungsbeitrag/Woche: ' + kp.weeklyMargin + ', Umsatz ' + kp.weeklyProductRevenue + ', Gebühren ' + kp.weeklyFees + ', Ware ' + kp.weeklyGoodsCost + ', Fahrer ' + kp.weeklyDriverPay + ')');
check('mapsUrl enthält kodierte Adresse', sel.mapsUrl(s0, 'c-huber') === 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent('Lindenweg 12, 5303 Thalgau') + '&travelmode=driving', sel.mapsUrl(s0, 'c-huber'));
const ru = sel.mapsRouteUrl(s0, ['c-huber', 'me']);
check('mapsRouteUrl Waypoints', ru.includes('waypoints=') && ru.includes('destination='));

// --- Leitgeschichte
// --- Gemeinsames Sackerl und Zusammenfassung (8.14)
A.draftCheckPlz('5303');
A.draftSetSameForAll(false);
A.draftToggleDay(1); A.draftToggleDay(3);
A.draftSetQty({ wd: 1 }, 'kaisersemmel', 4); A.draftSetQty({ wd: 1 }, 'laugenbreze', 1);
let sm = sel.draftSummary(store.getState());
const flexOne = sel.feeFor(store.getState(), { mode: 'flex', wd: 1, regionId: 'nord', customerId: 'me', total: sm.deliveries[0].total });
check('Screenshot-Fall: leerer Do zählt nicht', sm.deliveries.length === 1 && T.weekday(sm.firstDelivery) === 1 && sm.problems.includes('empty-day:3') &&
  Math.abs(sm.saving.perWeek - (C.fees.flex - C.fees.abo)) < 0.001 && sm.promo.wds.join() === '1' && sm.count === 1 && sm.cutoff.getTime() === T.cutoffFor(sm.firstDelivery).getTime(), sm);
check('saving.text und groups', sm.saving.perWeek > 0 && sm.saving.text.includes('pro Woche') && sm.groups.length === 1 && sm.groups[0].wds.join() === '1');
A.setDraft({ abo: {}, sameForAll: true });
A.draftToggleDay(0); A.draftToggleDay(2); A.draftToggleDay(4);
A.draftSetQty({ wd: 0 }, 'kaisersemmel', 4);
A.draftSetQty({ wd: 2 }, 'laugenbreze', 2);
let ab = store.getState().draft.abo;
check('sameForAll: Menge auf allen gewählten Tagen', [0, 2, 4].every(w => ab[w].kaisersemmel === 4 && ab[w].laugenbreze === 2));
A.draftToggleDay(5);
ab = store.getState().draft.abo;
check('sameForAll: neuer Tag übernimmt Sackerl', ab[5].kaisersemmel === 4 && ab[5].laugenbreze === 2);
A.draftSetQty({ wd: 0 }, 'briochestriezel', 1);
ab = store.getState().draft.abo;
check('weekendOnly nur für Sa/So', ab[5].briochestriezel === 1 && !ab[0].briochestriezel && !ab[2].briochestriezel);
sm = sel.draftSummary(store.getState());
check('groups: Werktage gemeinsam, Sa getrennt', sm.groups.length === 2 && sm.groups[0].wds.join() === '0,2,4' && sm.groups[1].wds.join() === '5' && sm.deliveries.length === 4);
A.draftSetSameForAll(false);
A.draftSetQty({ wd: 2 }, 'kaisersemmel', 1);
ab = store.getState().draft.abo;
check('sameForAll aus: Kopien bleiben, Änderungen nur je Tag', ab[2].kaisersemmel === 1 && ab[0].kaisersemmel === 4 && ab[4].kaisersemmel === 4);
A.draftSetSameForAll(true);
ab = store.getState().draft.abo;
check('sameForAll an: erster gefüllter Tag (Mo) auf alle', [0, 2, 4, 5].every(w => ab[w].kaisersemmel === 4) && !ab[2].briochestriezel && !ab[5].briochestriezel);
A.setDraft({ abo: { 2: { kaisersemmel: 2 } } });
const cp = A.draftCopyToDays(2, [0, 1, 3]);
check('draftCopyToDays überspringt vollen Montag', cp.skipped.join() === '0' && cp.copied.join() === '1,3' && !store.getState().draft.abo[0] && store.getState().draft.abo[3].kaisersemmel === 2, cp);
A.setDraft(Object.assign(App.data.draftDefaults(), { plz: '5303', regionId: 'nord' }));
[2, 4, 5].forEach(w => { A.draftToggleDay(w); }); A.draftSetQty({ wd: 2 }, 'kaisersemmel', 5); A.draftSetQty({ wd: 2 }, 'laugenbreze', 2);
sm = sel.draftSummary(store.getState());
check('saving dauerhaft (Mi+Fr+Sa = 2,25), promo getrennt', Math.abs(sm.saving.perWeek - 2.25) < 1e-9 && sm.promo.wds.join() === '2,4' && sm.promo.weeks === 4 && Math.abs(sm.promo.perWeek - 3.5) < 1e-9, [sm.saving, sm.promo]);
A.setDraft(App.data.draftDefaults());
check('draft.sameForAll Standard true', store.getState().draft.sameForAll === true);

A.toggleOffer('semmel-5-1', true); A.toggleOffer('croissant-2-1', true);
A.draftCheckPlz('5303');
A.draftSetSameForAll(false);
eq('draft.regionId nord', store.getState().draft.regionId, 'nord');
eq('Mo ausgebucht für Besucher', sel.dayStatusFor(store.getState(), 'nord', 0, 'me'), 'full');
const jr = A.joinWaitlist({ regionId: 'nord', weekday: 0, channel: 'push', customerId: 'me', contact: { name: 'Test Besucher', plz: '5303', email: 'test@mail.example' } });
eq('Warteliste Position 7', jr.position, 7);
const out = A.joinWaitlist({ regionId: null, weekday: null, channel: 'email', customerId: null, contact: { name: 'X', plz: '1010', email: 'x@mail.example' } });
check('joinWaitlist regionId null', !!out.id && store.getState().waitlist.some(w => w.id === out.id && w.regionId === null));
const cr = A.setCapacity('nord', 0, { status: 'open', drivers: 2 });
check('setCapacity: notified >= 7', cr.notified >= 7 && cr.push + cr.email === cr.notified, cr);
let s = store.getState();
eq('dayStatusFor reserved', sel.dayStatusFor(s, 'nord', 0, 'me'), 'reserved');
check('Nachricht kind waitlist für me', sel.inbox(s, 'me').some(n => n.kind === 'waitlist' && n.action.view === 'lieferplan' && n.action.weekday === 0) && sel.unreadPush(s, 'me').length === 1);
check('cap Mo nach Freigabe frei', sel.cap(s, 'nord', 0).effective === 'free' && sel.cap(s, 'nord', 0).freeAbo === 32);
A.draftToggleDay(0); A.draftToggleDay(1);
A.draftApplyBag({ wd: 0 }, { kaisersemmel: 5 });
A.draftSetQty({ wd: 0 }, 'kaisersemmel', 6);
check('draftSummary: leerer Tag', sel.draftSummary(store.getState()).problems.includes('empty-day:1'));
A.draftSetQty({ wd: 1 }, 'buttercroissant', 3);
s = store.getState();
let sum = sel.draftSummary(s);
check('draftSummary Plan gültig, Rabatt Zeile', sum.planValid && sum.deliveries[0].discounts.length === 1 && sum.deliveries[1].fee === 0 && sum.firstDelivery === '2026-11-30');
A.setDraft({ step: 'adresse' });
check('draftSummary: address-incomplete', sel.draftSummary(store.getState()).problems.includes('address-incomplete') && !sel.draftSummary(store.getState()).valid);
check('placeOrder verweigert ohne Adresse', A.placeOrder().ok === false);
A.setDraft({ address: { name: 'Test Besucher', street: 'Lindenweg', houseNo: '3', plz: '5303', city: 'Thalgau', email: 'test@mail.example', phone: '' } });
sum = sel.draftSummary(store.getState());
check('draftSummary valid mit Adresse', sum.valid && sum.problems.length === 0);
const po = A.placeOrder();
s = store.getState();
const me = sel.customer(s, 'me');
check('placeOrder ok + orderNo', po.ok && /^SE-\d+$/.test(po.orderNo) && po.firstDelivery === '2026-11-30', po);
check('me registriert, Koordinaten im Gebiet', me.registered && me.regionId === 'nord' && me.x >= sel.region(s, 'nord').area.x0 && me.x <= sel.region(s, 'nord').area.x1 && me.y >= sel.region(s, 'nord').area.y0 && me.y <= sel.region(s, 'nord').area.y1 && me.city === 'Thalgau');
check('Abo vorhanden (Mo + Di)', s.subs.filter(x => x.customerId === 'me').map(x => x.weekday).sort().join() === '0,1');
check('Wartelisten-Eintrag booked', s.waitlist.find(w => w.customerId === 'me' && w.weekday === 0).status === 'booked');
check('Bestätigung kind order, Entwurf zurückgesetzt', sel.inbox(s, 'me').some(n => n.kind === 'order') && s.draft.step === 'fertig' && Object.keys(s.draft.abo).length === 0 && s.draft.lastOrder.orderNo === po.orderNo);
check('Auslastung Mo steigt auf 42', sel.cap(s, 'nord', 0).abo === 42);

// --- Flex-Bestellung (Besucher ist nun registriert)
A.setDraft({ mode: 'flex', step: 'plan' }); A.draftSetFlexDate('2026-11-26');
A.draftSetQty({ flex: true }, 'kaisersemmel', 4);
check('flex-min', sel.draftSummary(store.getState()).problems.includes('flex-min'));
A.draftSetQty({ flex: true }, 'laugenbreze', 4);
const fo = A.placeOrder();
check('Einmallieferung bestellt', fo.ok && store.getState().flexOrders.some(f => f.customerId === 'me' && f.dateKey === '2026-11-26' && f.status === 'confirmed'), fo);
check('upcoming enthält Einmallieferung', sel.upcoming(store.getState(), 'me', 5).some(x => x.dateKey === '2026-11-26' && x.kinds.includes('flex')));

// --- Fahrer, Push
A.switchCustomer('c-huber');
const before = sel.unreadPush(store.getState(), 'c-huber').length;
A.markStop('2026-11-25', 'c-huber', 'delivered');
s = store.getState();
check('markStop delivered erzeugt Push', sel.unreadPush(s, 'c-huber').length === before + 1 && sel.unreadPush(s, 'c-huber')[0].title === 'Ihr Frühstück ist da');
check('tourPlan zeigt Zustellstatus', sel.tourPlan(s, 'nord', '2026-11-25').tours.flatMap(t => t.stops).find(x => x.customerId === 'c-huber').delivery.status === 'delivered');
A.undoStop('2026-11-25', 'c-huber');
check('undoStop entfernt Push', sel.unreadPush(store.getState(), 'c-huber').length === before);

A.markStop('2026-11-25', 'c-huber', 'problem', 'Haustür nicht erreichbar, Sackerl wurde beim Nachbarn abgegeben');
s = store.getState();
const pn = sel.inbox(s, 'c-huber').find(n => n.title === 'Hinweis zu Ihrer Lieferung');
check('markStop problem erzeugt Hinweis', !!pn && pn.kind === 'delivery' && pn.channel === 'push' && pn.body === 'Haustür nicht erreichbar, Sackerl wurde beim Nachbarn abgegeben.' && pn.ref === 'delivery|2026-11-25|c-huber');
A.undoStop('2026-11-25', 'c-huber');
check('undoStop entfernt Hinweis', !sel.inbox(store.getState(), 'c-huber').some(n => n.title === 'Hinweis zu Ihrer Lieferung'));

// --- Zugangshilfe (8.15)
const pn1 = sel.parseNavPoint;
eq('parseNavPoint: Koordinaten', pn1('47.8412, 13.2513'), { lat: 47.8412, lng: 13.2513 });
eq('parseNavPoint: @lat,lng-Link', pn1('https://www.google.com/maps/place/Thalgau/@47.8412,13.2513,17z/data=x'), { lat: 47.8412, lng: 13.2513 });
eq('parseNavPoint: q=lat,lng', pn1('https://maps.google.com/?q=47.8412,13.2513'), { lat: 47.8412, lng: 13.2513 });
eq('parseNavPoint: q mit %2C', pn1('https://maps.google.com/?q=47.8412%2C13.2513'), { lat: 47.8412, lng: 13.2513 });
check('parseNavPoint: Müll -> null', pn1('hallo') === null && pn1('') === null && pn1('99.1, 13.2') === null && pn1(null) === null);
const withAcc = store.getState().customers.filter(c => sel.hasAccessHelp(c));
check('Seed: vier nord-Kunden mit Zugangshilfe, einer mit Code', withAcc.length === 4 && withAcc.every(c => c.regionId === 'nord' && c.access.directions) && withAcc.filter(c => c.access.code === 'Tor 2580').length === 1 && !sel.hasAccessHelp(sel.customer(store.getState(), 'c-huber')));
A.setAccess('c-huber', { navPoint: { lat: 47.8412, lng: 13.2513, label: 'Eingang' }, code: '1234', updatedBy: 'fahrer' });
const hc = sel.customer(store.getState(), 'c-huber');
check('setAccess + hasAccessHelp', sel.hasAccessHelp(hc) && hc.access.code === '1234' && hc.access.updatedBy === 'fahrer' && !!hc.access.updatedAt);
check('mapsUrl nutzt navPoint', sel.mapsUrl(store.getState(), 'c-huber') === 'https://www.google.com/maps/dir/?api=1&destination=47.8412,13.2513&travelmode=driving' && sel.mapsRouteUrl(store.getState(), ['c-huber', 'me']).includes('destination=') &&
  sel.mapsRouteUrl(store.getState(), ['me', 'c-huber']).includes('waypoints=') && sel.mapsRouteUrl(store.getState(), ['me', 'c-huber']).includes('destination=47.8412,13.2513'));
const phIds = [1, 2, 3, 4].map(i => A.addAccessPhoto('c-huber', { dataUrl: 'data:image/jpeg;base64,AAA' + i, caption: 'Foto ' + i, addedBy: 'kunde' }));
const ph = sel.customer(store.getState(), 'c-huber').access.photos;
check('Fotos: höchstens 3, ältestes fällt heraus', phIds.every(r => r.ok && r.id) && ph.length === 3 && ph[0].caption === 'Foto 2' && ph[2].addedBy === 'kunde');
A.removeAccessPhoto('c-huber', ph[0].id);
check('removeAccessPhoto', sel.customer(store.getState(), 'c-huber').access.photos.length === 2);
// Speicher voll: Zustand bleibt, Rückgabe meldet storage
globalThis.localStorage = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem() {} };
const full = A.addAccessPhoto('me', { dataUrl: 'data:image/jpeg;base64,ZZZ', caption: '', addedBy: 'kunde' });
delete globalThis.localStorage;
check('addAccessPhoto bei vollem Speicher', full.ok === false && full.reason === 'storage' && sel.customer(store.getState(), 'me').access.photos.length === 1);

// --- Aussetzen, Pause, Abo bearbeiten
A.skipDate('c-huber', '2026-11-25');
check('skipDate: Stopp entfällt', !sel.stopsOn(store.getState(), 'nord', '2026-11-25').some(x => x.customerId === 'c-huber'));
A.unskipDate('c-huber', '2026-11-25');
A.setSubQty('c-huber', 2, 'bauernbrot', 1);
check('setSubQty', store.getState().subs.find(x => x.customerId === 'c-huber' && x.weekday === 2).items.bauernbrot === 1);
check('skipDate nach Bestellschluss abgelehnt', A.skipDate('c-huber', '2026-11-24') === false);

// --- Bäcker
const bd = sel.bakeryDates(store.getState());
eq('bakeryDates Di 10:00 -> Mi', bd, ['2026-11-25']);
const bo = sel.bakeryOrder(store.getState(), bd);
check('bakeryOrder summiert und sortiert', bo.length > 5 && bo[0].product.cat === 'gebaeck' && bo.every(e => e.qty === e.byDate['2026-11-25']));
const mt = sel.stopsOn(store.getState(), 'nord', bd[0]).concat(sel.stopsOn(store.getState(), 'sued', bd[0])).reduce((a, x) => a + (x.items.kaisersemmel || 0), 0);
check('bakeryOrder Kaisersemmeln stimmt', (bo.find(e => e.product.id === 'kaisersemmel') || {}).qty === mt);
A.setClock('fr-1700');
eq('setClock Fr 17:00: bakeryDates', sel.bakeryDates(store.getState()).length, 1);
A.setClock('fr-1500');
eq('setClock Fr 15:00: Sa+So+Mo', sel.bakeryDates(store.getState()), ['2026-11-28', '2026-11-29', '2026-11-30']);
check('setClock speichert Preset, ui-Daten gültig', store.getState().clockPreset === 'fr-1500' && store.getState().ui.driverDate >= T.today() && store.getState().ui.boDate >= T.today());
A.setClock('echt');
check('Kampagnen: Ideen vorhanden', sel.campaignIdeas(store.getState(), 'nord').length >= 3 && sel.campaignIdeas(store.getState(), 'nord').every(i => i.recipients >= 0));
const sc = A.sendCampaign({ title: 'Test', body: 'Test', channel: 'push', segment: 'all' });
check('sendCampaign', sc.recipients > 100 && store.getState().campaigns[0].title === 'Test');
const scr = A.sendCampaign({ title: 'Test', body: 'Test', channel: 'push', segment: 'all', regionId: 'nord' });
check('sendCampaign mit regionId zählt nur das Gebiet', scr.recipients === sel.segmentCustomers(store.getState(), 'all', 'nord').length && scr.recipients > 0 && scr.recipients < sc.recipients);
const sv = A.saveOffer({ title: 'Test', buy: { kind: 'cat', ref: 'suess', qty: 3 }, get: { productId: 'nussschnecke', qty: 1, pct: 50 } });
check('saveOffer/toggle/delete', store.getState().offers.length === 5 && (A.toggleOffer(sv, false), !store.getState().offers.find(o => o.id === sv).active) && (A.deleteOffer(sv), store.getState().offers.length === 4));

// --- Store-API
let called = 0;
const un = store.subscribe(() => { called++; });
A.setUi({ boRegion: 'sued' });
un(); A.setUi({ boRegion: 'nord' });
check('subscribe/unsubscribe', called === 1);
check('kpis', sel.kpis(store.getState(), 'nord').weeklyStops === 209 + 1 + 1 && sel.kpis(store.getState(), 'nord').utilMonday > 1 === false);
A.setDraft({ mode: 'abo', step: 'plan', abo: {}, flex: {} });
A.draftApplyBag({ wd: 2 }, { kaisersemmel: 3, kornweckerl: 1 });
A.draftSwap({ wd: 2 }, 'kaisersemmel', 'handsemmel');
eq('draftSwap (Abo-Tag)', store.getState().draft.abo[2], { kornweckerl: 1, handsemmel: 3 });
A.draftApplyBag({ flex: true }, { salzstangerl: 2, laugenbreze: 1 });
A.draftSwap({ flex: true }, 'salzstangerl', 'laugenbreze');
eq('draftSwap (Einmalig, mit Zusammenführen)', store.getState().draft.flex, { laugenbreze: 3 });
A.setWeeklySpecial({ pct: 10 });
check('setWeeklySpecial + Rabatt', store.getState().weeklySpecial.pct === 10 && store.getState().weeklySpecial.productId === 'nussbrot' &&
  sel.priceBag(store.getState(), { nussbrot: 2 }, { wd: 2 }).discounts.some(d => d.offerId === 'weekly-special' && Math.abs(d.amount - 0.92) < 1e-9));
A.resetDemo();
s = store.getState();
check('resetDemo: frischer Zustand', !sel.customer(s, 'me').registered && s.waitlist.length === 20 && s.subs.length === 209 + 130 && s.offers.length === 4 && !s.offers[2].active && s.clockPreset === 'echt');
check('Seed deterministisch', JSON.stringify(App.data.seed()) === JSON.stringify(App.data.seed()));
check('App.useStore existiert', typeof App.useStore === 'function');

console.log('\n' + pass + ' ok, ' + fail + ' fehlgeschlagen');
process.exit(fail ? 1 : 0);
