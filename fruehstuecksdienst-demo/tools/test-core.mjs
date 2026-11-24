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
eq('PLZ 5303 -> nord', rp('5303').region.id, 'nord');
eq('PLZ 5322 -> nord', rp('5322').region.id, 'nord');
eq('PLZ 5310 -> sued', rp('5310').region.id, 'sued');
check('PLZ 5330 -> west (in Planung)', rp('5330').region.id === 'west' && rp('5330').region.planned);
eq('PLZ 1010 -> außerhalb', [rp('1010').region, rp('1010').outside], [null, true]);
eq('PLZ 53 -> null', rp('53'), null);

// --- Kapazität
const c0 = sel.cap(s0, 'nord', 0), c1 = sel.cap(s0, 'nord', 1), c6 = sel.cap(s0, 'nord', 6);
check('cap nord Mo: abo 64 / max 60 / full', c0.abo === 64 && c0.max === 60 && c0.effective === 'full', c0);
eq('cap nord Di free', c1.effective, 'free');
eq('cap nord So few', c6.effective, 'few');
eq('cap west planned', sel.cap(s0, 'west', 1).effective, 'planned');
const wantAbo = { nord: [64, 31, 29, 33, 36, 70, 82], sued: [44, 22, 20, 24, 27, 51, 58] };
for (const r of ['nord', 'sued']) eq('Abo-Stopps ' + r, sel.utilization(s0, r).map(u => u.abo), wantAbo[r]);
eq('weakDays nord = Di-Fr', sel.weakDays(s0, 'nord'), [1, 2, 3, 4]);
check('Seed: Kundenzahlen', s0.customers.filter(c => c.regionId === 'nord').length >= 150 && s0.customers.filter(c => c.regionId === 'sued').length >= 105);
check('Seed: Kunden haben plz+city', s0.customers.filter(c => c.registered).every(c => /^\d{4}$/.test(c.plz) && c.city));
eq('Seed: Warteliste nord Mo / west', [sel.waitlistFor(s0, 'nord', 0).length, sel.waitlistFor(s0, 'west', null).length], [6, 14]);
check('Seed: heutige Stopps zugestellt', Object.keys(s0.deliveries['2026-11-24'] || {}).length === sel.stopsOn(s0, 'nord', '2026-11-24').length + sel.stopsOn(s0, 'sued', '2026-11-24').length);
check('JSON-serialisierbar', JSON.stringify(JSON.parse(JSON.stringify(s0))) === JSON.stringify(s0));

// --- Kalibrierung
const endOf = (wd, d) => sel.tourPlan(s0, 'nord', T.nextDateForWeekday(wd), d).endMin;
const mo1 = endOf(0, 1), mo2 = endOf(0, 2), so = endOf(6);
check('Kalibrierung nord Mo 1 Fahrer 06:36-06:55 (' + hm(mo1) + ')', mo1 >= 396 && mo1 <= 415);
check('Mo 1 Fahrer zu spät (late)', sel.tourPlan(s0, 'nord', '2026-11-30', 1).late === true);
check('Kalibrierung nord Mo 2 Fahrer <= 05:40 (' + hm(mo2) + ')', mo2 <= 340 && !sel.tourPlan(s0, 'nord', '2026-11-30', 2).late);
for (const wd of [1, 2, 3, 4]) check('Kalibrierung nord ' + T.WD[wd] + ' <= 05:45 (' + hm(endOf(wd)) + ')', endOf(wd) <= 345);
check('Kalibrierung nord So 07:45-08:20 (' + hm(so) + ')', so >= 465 && so <= 500);
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
const six = sel.priceBag(s0, { kaisersemmel: 6 }, { wd: 0 });
check('priceBag: 6 Kaisersemmeln -> eine gratis', six.discounts.length === 1 && six.discounts[0].freeQty === 1 && Math.abs(six.total - 2.75) < 1e-9, six);
check('priceBag: 5 Kaisersemmeln -> Hinweis', sel.priceBag(s0, { kaisersemmel: 5 }, { wd: 0 }).hints.length === 1);
check('priceBag: Croissants nur Di-Fr', sel.priceBag(s0, { buttercroissant: 3 }, { wd: 1 }).discounts.length === 1 && sel.priceBag(s0, { buttercroissant: 3 }, { wd: 5 }).discounts.length === 0);
eq('priceOf ohne Rabatt', sel.priceOf(s0, { kaisersemmel: 6 }), 3.3);
eq('itemsText', sel.itemsText(s0, { kaisersemmel: 4, buttercroissant: 2 }), '4 Kaisersemmeln, 2 Buttercroissants');
check('offersForProduct Etikett', sel.offersForProduct(s0, 'kaisersemmel', 0)[0].badge === '5 + 1 gratis');
const oc = sel.offerCalc(s0, s0.offers[0]);
check('offerCalc plausibel', oc.normalMargin > oc.offerMargin && oc.offerMargin > 0 && oc.breakEvenUpliftPct > 0 && oc.marginDropPct > 0, oc);
check('feeFor: Neukunde Di gratis, Bestandskunde nicht', sel.feeFor(s0, { mode: 'abo', wd: 1, regionId: 'nord', customerId: 'me' }) === 0 &&
  sel.feeFor(s0, { mode: 'abo', wd: 1, regionId: 'nord', customerId: 'c-huber' }) === 1.2 && sel.feeFor(s0, { mode: 'flex', wd: 1, regionId: 'nord', customerId: 'me' }) === 2.4);
check('mapsUrl enthält kodierte Adresse', sel.mapsUrl(s0, 'c-huber') === 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent('Lindenweg 12, 5303 Thalgau') + '&travelmode=driving', sel.mapsUrl(s0, 'c-huber'));
const ru = sel.mapsRouteUrl(s0, ['c-huber', 'me']);
check('mapsRouteUrl Waypoints', ru.includes('waypoints=') && ru.includes('destination='));

// --- Verkaufsförderung
const fr = o => sel.feeFor(s0, Object.assign({ mode: 'abo', wd: 5, regionId: 'nord', customerId: 'c-huber' }, o));
check('Gratis-Zustellung ab 15 EUR', C.fees.freeDeliveryFrom === 15 && fr({ total: 15 }) === 0 && fr({ total: 14.99 }) === 1.2 && fr({ mode: 'flex', total: 20 }) === 0 && fr({}) === 1.2);
const big = { kaisersemmel: 5, buttercroissant: 3, bauernbrot: 3 };
const dsFree = (() => { const st = Object.assign({}, s0, { draft: Object.assign({}, s0.draft, { regionId: 'nord', abo: { 5: big, 6: { kaisersemmel: 4 } } }) }); return sel.draftSummary(st).deliveries; })();
check('draftSummary: freeDeliveryMissing', dsFree[0].fee === 0 && dsFree[0].freeDeliveryMissing === 0 && dsFree[1].freeDeliveryMissing > 0 && dsFree[1].fee > 0, dsFree);
check('Produkt-Flags bestseller/isNew', ['kaisersemmel', 'kornweckerl', 'buttercroissant', 'bauernbrot', 'teebutter', 'box-sonntag'].every(i => sel.product(s0, i).bestseller) &&
  ['dinkelweckerl', 'liptauer', 'box-nikolo'].every(i => sel.product(s0, i).isNew) && !sel.product(s0, 'laugenbreze').bestseller);
const sb = sel.starterBags(s0);
check('starterBags: 3 Sackerl mit Summen', sb.length === 3 && sb.every(b => b.total > 0 && b.saving >= 0 && b.title) && sb[1].total === 8.8 && sb[2].total > sb[0].total, sb.map(b => [b.title, b.total, b.saving]));
eq('starterBags Klassiker 4 Semmeln + 2 Kornweckerl', [sb[0].items, sb[0].total], [{ kaisersemmel: 4, kornweckerl: 2 }, 4.1]);
check('suggestions: nie bereits im Sackerl', [{ kaisersemmel: 4 }, { buttercroissant: 2, marillenmarmelade: 1 }, { bauernbrot: 1, bergkaese: 1 }, {}].every(it =>
  { const r = sel.suggestions(s0, it, 3); return r.length > 0 && r.length <= 3 && r.every(p => !(it[p.id] > 0)); }));
eq('suggestions Gebäck -> Teebutter zuerst', sel.suggestions(s0, { kaisersemmel: 4 }, 2).map(p => p.id), ['teebutter', 'marillenmarmelade']);
const rs = sel.regionStats(s0, 'nord');
check('regionStats.households > 0', rs.households > 0 && rs.deliveriesPerWeek === 345, rs);

// --- Leitgeschichte
A.draftCheckPlz('5303');
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
check('cap Mo nach Freigabe frei', sel.cap(s, 'nord', 0).effective === 'free' && sel.cap(s, 'nord', 0).freeAbo === 50);
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
check('me registriert, Koordinaten im Gebiet', me.registered && me.regionId === 'nord' && me.x >= 0.6 && me.x <= 5.6 && me.y >= 0.6 && me.y <= 4.6 && me.city === 'Thalgau');
check('Abo vorhanden (Mo + Di)', s.subs.filter(x => x.customerId === 'me').map(x => x.weekday).sort().join() === '0,1');
check('Wartelisten-Eintrag booked', s.waitlist.find(w => w.customerId === 'me' && w.weekday === 0).status === 'booked');
check('Bestätigung kind order, Entwurf zurückgesetzt', sel.inbox(s, 'me').some(n => n.kind === 'order') && s.draft.step === 'fertig' && Object.keys(s.draft.abo).length === 0 && s.draft.lastOrder.orderNo === po.orderNo);
check('Auslastung Mo steigt auf 65', sel.cap(s, 'nord', 0).abo === 65);

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
check('sendCampaign', sc.recipients > 200 && store.getState().campaigns[0].title === 'Test');
const sv = A.saveOffer({ title: 'Test', buy: { kind: 'cat', ref: 'suess', qty: 3 }, get: { productId: 'nussschnecke', qty: 1, pct: 50 } });
check('saveOffer/toggle/delete', store.getState().offers.length === 4 && (A.toggleOffer(sv, false), !store.getState().offers.find(o => o.id === sv).active) && (A.deleteOffer(sv), store.getState().offers.length === 3));

// --- Store-API
let called = 0;
const un = store.subscribe(() => { called++; });
A.setUi({ boRegion: 'sued' });
un(); A.setUi({ boRegion: 'nord' });
check('subscribe/unsubscribe', called === 1);
check('kpis', sel.kpis(store.getState(), 'nord').weeklyStops === 345 + 1 + 1 && sel.kpis(store.getState(), 'nord').utilMonday > 1 === false);
A.resetDemo();
s = store.getState();
check('resetDemo: frischer Zustand', !sel.customer(s, 'me').registered && s.waitlist.length === 20 && s.subs.length === 345 + 246 && s.offers.length === 3 && s.clockPreset === 'echt');
check('Seed deterministisch', JSON.stringify(App.data.seed()) === JSON.stringify(App.data.seed()));
check('App.useStore existiert', typeof App.useStore === 'function');

console.log('\n' + pass + ' ok, ' + fail + ' fehlgeschlagen');
process.exit(fail ? 1 : 0);
