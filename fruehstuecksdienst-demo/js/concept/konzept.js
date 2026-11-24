/* Konzept-Seite (V5): Lesetext aus docs/konzept-text.md plus geführte Demo in 7 Schritten. */
(function (root) {
  const App = root.App = root.App || {};
  const { html, useState, useEffect } = App.lib;
  App.views = App.views || {};
  App.views.concept = App.views.concept || {};

  const SECTIONS = [
    ['s1', '1. Worum es geht'], ['s2', '2. Die Demo in 7 Schritten'], ['s3', '3. Was sich ändert'],
    ['s4', '4. Abo oder einmal'], ['s5', '5. Marketing'], ['s6', '6. Woran verdient wird'],
    ['s7', '7. Andere Anbieter'], ['s8', '8. Echte Version'], ['s9', '9. Offene Fragen'], ['s10', '10. Hinweise']
  ];

  const STEPS = [
    ['Liefertage prüfen', 'In der Kunden-App die PLZ 5303 (Thalgau) eingeben. Montag ist ausgebucht, Dienstag bis Freitag sind frei und tragen eine Aktion.', 'kunde', 'start', 'Kunden-App öffnen'],
    ['Warteliste und Bestellung', 'Für Montag auf die Warteliste setzen. Dann ein Abo für Dienstag und Samstag anlegen oder einmalig bestellen.', 'kunde', 'lieferplan', 'Lieferplan öffnen'],
    ['Auslastung sehen', 'Im Backoffice zeigt die Übersicht: Montag liegt über 100 %, Dienstag bis Freitag bei rund der Hälfte.', 'backoffice', 'uebersicht', 'Übersicht öffnen'],
    ['Tour prüfen', 'Unter Touren den Montag wählen. Mit einem Fahrer endet die Tour nach 06:30 Uhr, mit zwei Fahrern pünktlich.', 'backoffice', 'touren', 'Touren öffnen'],
    ['Montag freigeben', 'Unter Kapazität den Montag auf zwei Fahrer und „Offen“ stellen. Die Warteliste wird automatisch benachrichtigt.', 'backoffice', 'kapazitaet', 'Kapazität öffnen'],
    ['Nachricht beim Kunden', 'Zurück in der Kunden-App erscheint die Push-Nachricht „Montag ist frei“. Der Platz ist 24 Stunden reserviert.', 'kunde', 'konto', 'Konto öffnen'],
    ['Zustellung', 'In der Fahrer-App die Stopps in Tour-Reihenfolge abhaken. „Zugestellt & weiter“ öffnet Google Maps mit dem nächsten Stopp, der Kunde bekommt „Ihr Frühstück ist da“.', 'fahrer', undefined, 'Fahrer-App öffnen']
  ];

  const CHANGES = [
    ['Ein Tag ist voll, also bleibt das Gebiet für Neukunden zu.', 'Jeder Wochentag hat je Gebiet eine eigene Kapazität und einen eigenen Status. Volle Tage bekommen eine Warteliste, alle anderen bleiben buchbar.'],
    ['Wird ein Tag wieder frei, erfährt es niemand.', 'Wer wartet, bekommt automatisch eine Push-Nachricht oder E-Mail. Der Platz ist 24 Stunden reserviert.'],
    ['Es gibt nur Daueraufträge.', 'Abo und Einmallieferung stehen nebeneinander. Einmallieferungen sind je Tour und Tag begrenzt.'],
    ['Dienstag bis Freitag ist die Tour halb leer.', 'Das System erkennt Tage mit freien Plätzen und bewirbt genau diese: als Aktion in der Wochenleiste und als Kampagne an passende Kunden.'],
    ['Es gibt keinen Anreiz, mehr zu kaufen.', 'Mengenaktionen, passende Ergänzungen im Sackerl und Schnellstart-Sackerl. Im Backoffice einstellbar. Die Kalkulation rechnet Einkauf und Fahrervergütung mit und markiert Aktionen, die Verlust machen.'],
    ['Das Sortiment endet beim Gebäck.', 'Extras vom Hofladen (Butter, Marmelade, Eier, Schinken, Käse, Milch) und fertige Frühstücks-Sackerl.'],
    ['Die Montagstour schafft 06:30 Uhr nicht immer.', 'Die Tour wird je Gebiet automatisch gereiht, mit Ankunftszeit je Stopp und einer Warnung, wenn die Deadline nicht hält. Fahrer haben eigene Zugänge.']
  ];

  const RULES = [
    ['Kapazität je Tour und Tag.', 'Fahrer mal Stopps je Fahrer. In der Demo schafft ein Fahrer auf der ländlichen Tour werktags 38 Stopps bis 06:30 Uhr und am Wochenende 55, weil bis 08:30 Uhr Zeit ist. Das sind Beispielwerte.'],
    ['Flex-Kontingent.', 'Abo-Plätze werden nur bis Kapazität minus Kontingent verkauft, in der Demo 3 Plätze. Dieser Rest gehört den Einmallieferungen.'],
    ['Freie Plätze am konkreten Datum.', 'Eine Einmallieferung darf jeden Platz nutzen, der an genau diesem Tag frei ist, auch den eines Kunden im Urlaub. An schwachen Tagen sind das viele, am vollen Montag keiner.'],
    ['Der Bestellschluss bleibt.', '16:30 Uhr am Vortag, freitags für Samstag, Sonntag und Montag. Der Bäcker bekommt eine Zahl, die sich nicht mehr ändert.'],
    ['Der Preis lenkt.', 'Die Einmallieferung kostet mehr Zustellung als das Abo (in der Demo werktags € 2,50 statt € 1,75) und hat einen Mindestbestellwert. Wer oft spontan bestellt, wechselt von selbst ins Abo.'],
    ['Voll ist voll.', 'Die App zeigt den nächsten freien Tag und bietet die Warteliste an. Kein Fahrer wird überrascht.']
  ];

  const MARKETING = [
    ['Aktion für schwache Tage.', '„Zustellung 4 Wochen gratis“ erscheint nur an Tagen mit viel Luft.'],
    ['Nachbarn werben.', 'Guthaben für beide. Jeder Nachbar verkürzt den Weg pro Stopp.'],
    ['Gebiet vormerken.', 'In neuen Gebieten sammeln sich Interessenten, gestartet wird ab einer Mindestzahl.'],
    ['Saison.', 'Nikolo-Sackerl, Osterpinze, Muttertag: als Einmallieferung vorbestellbar.'],
    ['Verschenken und Büro.', 'Frühstück verschenken und Büro-Frühstück als eigene Angebote.'],
    ['Pünktlich-Versprechen', ' als Idee: Kommt das Sackerl zu spät, geht die Zustellung auf uns.'],
    ['Mengenaktionen mit Kalkulation.', 'Jede Aktion wird vor dem Start durchgerechnet.']
  ];

  const OTHERS = [
    'Mehrere Anbieter im deutschsprachigen Raum nehmen Einzelbestellungen ohne Abo an, meist mit Bestellschluss am Vorabend und Mindestbestellwert statt Bindung.',
    'Lebensmittel-Lieferdienste mit festen Routen setzen Neukunden in vollen Gebieten auf eine Warteliste und melden sich, sobald Platz ist.',
    'Milchmann-Dienste in Großbritannien liefern Gebäck, Milch und Eier in einer Tour. Einzelne Lieferungen lassen sich in der App aussetzen.',
    'Eine kostenlose erste Lieferung ist als Einstieg weit verbreitet.'
  ];

  const STAGES = [
    ['Stufe 1, Kundenportal:', 'Registrierung, Bestellung, Kapazität und Warteliste, monatliche Abrechnung per SEPA-Lastschrift, E-Mails.'],
    ['Stufe 2, Betrieb:', 'Backoffice mit Zugängen und Rollen, Tourenplanung auf echten Straßen, Fahrer-App, automatische Bestellung an den Bäcker zum Bestellschluss.'],
    ['Stufe 3, Wachstum:', 'installierbare App mit Push-Nachrichten, Kampagnen, Empfehlungsprogramm, Feiertagslogik, Auswertungen.']
  ];

  const QUESTIONS = [
    ['Name und Marke.', '„Semmelengel“ ist ein Arbeitstitel. Vor einer Entscheidung Marken- und Firmenregister prüfen.'],
    ['Gebiete.', 'Welche PLZ, welche Touren, wie viele Stopps schafft ein Fahrer wirklich bis 06:30 Uhr?'],
    ['Bäcker.', 'Wie kommt die Bestellung heute zur Bäckerei, bis wann und in welcher Form?'],
    ['Preise.', 'Zustellgebühr je Lieferung, Mindestbestellwert, Aufschlag für Einmallieferungen.'],
    ['Einkauf.', 'Was kostet der Einkauf beim Bäcker wirklich? Die Demo rechnet mit Ladenpreis minus 25 %.'],
    ['Fahrervergütung.', 'Gilt sie je Stück oder je Stopp? Davon hängt ab, ob sich Mehrkauf rechnet.'],
    ['Extras.', 'Welche Produkte, welcher Partner, wie bleibt Gekühltes im Sommer kühl?'],
    ['Bezahlung.', 'Monatliche Lastschrift oder zusätzlich Karte?'],
    ['Bestandskunden.', 'Wie kommen sie ins neue System? Datenschutz und Franchisevertrag (Wettbewerbs- und Kundenschutzklauseln) vorab rechtlich prüfen lassen.']
  ];

  function jump(role, view) {
    const A = App.actions;
    if (role === 'backoffice') A.loginBackoffice();
    if (role === 'fahrer') A.loginDriver(0);
    A.go(role, view);
    try { root.scrollTo(0, 0); } catch (e) { /* ignorieren */ }
  }

  function scrollToId(id) {
    const el = root.document && root.document.getElementById(id);
    if (!el) return;
    const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    try { el.focus({ preventScroll: true }); } catch (e) { /* ignorieren */ }
  }

  function Index({ active }) {
    return html`<nav class="kz-index" aria-label="Abschnitte">
      <ul>${SECTIONS.map(([id, label]) => html`<li key=${id}>
        <button type="button" class=${'kz-index-btn' + (active === id ? ' is-active' : '')} aria-current=${active === id ? 'true' : undefined} onClick=${() => scrollToId(id)}>${label}</button>
      </li>`)}</ul>
    </nav>`;
  }

  function H({ id, children }) {
    return html`<h2 id=${id} class="kz-h2" tabindex="-1">${children}</h2>`;
  }

  function Steps() {
    const { Btn } = App.ui;
    return html`<ol class="kz-steps">${STEPS.map(([title, text, role, view, label], i) => html`<li class="kz-step" key=${i}>
      <span class="kz-step-no ui-mono" aria-hidden="true">${i + 1}</span>
      <div class="kz-step-body">
        <h3 class="kz-h3">${title}</h3>
        <p>${text}</p>
        <${Btn} variant=${i === 0 ? 'sun' : 'ghost'} size="sm" iconAfter="chevron-right" onClick=${() => jump(role, view)}>${label}<//>
      </div>
    </li>`)}</ol>`;
  }

  function Changes() {
    return html`<div class="ui-tablewrap kz-tablewrap">
      <table class="ui-table kz-table">
        <thead><tr><th scope="col">Problem heute</th><th scope="col">Lösung in der Demo</th></tr></thead>
        <tbody>${CHANGES.map(([p, l], i) => html`<tr key=${i}>
          <td data-label="Problem heute">${p}</td>
          <td data-label="Lösung in der Demo">${l}</td>
        </tr>`)}</tbody>
      </table>
    </div>`;
  }

  function Lead({ items }) {
    return html`<ul class="kz-list">${items.map(([lead, text], i) => html`<li key=${i}><strong>${lead}</strong>${text.charAt(0) === ' ' ? '' : ' '}${text}</li>`)}</ul>`;
  }

  function Konzept() {
    const [active, setActive] = useState('s1');
    useEffect(() => {
      if (!root.IntersectionObserver) return undefined;
      const els = SECTIONS.map(([id]) => root.document.getElementById(id)).filter(Boolean);
      const io = new root.IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
      }, { rootMargin: '-15% 0px -75% 0px' });
      els.forEach(el => io.observe(el));
      return () => io.disconnect();
    }, []);

    return html`<article class="kz-page">
      <header class="kz-head">
        <p class="ui-eyebrow">Konzept</p>
        <h1 class="kz-title">Was diese Demo zeigt</h1>
      </header>
      <${Index} active=${active} />

      <section class="kz-sec" aria-labelledby="s1">
        <${H} id="s1">1. Worum es geht<//>
        <p class="kz-lead">Ein eigener Frühstücks-Lieferdienst mit eigener Marke: Gebäck vom Bäcker aus der Region, werktags bis 06:30 Uhr und am Wochenende bis 08:30 Uhr an der Haustür.</p>
        <p>Die Demo zeigt, wie Kunden-App, Disposition und Fahrer-App zusammenspielen. Sie löst drei Schwächen des heutigen Portals: Einzelne Tage lassen sich nicht sperren, es gibt nur Daueraufträge, und es fehlen Werkzeuge für Marketing.</p>
        <p>Alles läuft mit Beispieldaten im Browser. Name, Gebiete, Preise und Sortiment sind Platzhalter.</p>
      </section>

      <section class="kz-sec kz-sec-demo" aria-labelledby="s2">
        <${H} id="s2">2. Die Demo in 7 Schritten<//>
        <p>Jeder Schritt hat einen Button, der direkt in die passende Ansicht springt.</p>
        <${Steps} />
      </section>

      <section class="kz-sec" aria-labelledby="s3">
        <${H} id="s3">3. Was sich ändert<//>
        <${Changes} />
      </section>

      <section class="kz-sec" aria-labelledby="s4">
        <${H} id="s4">4. Abo oder einmal: so bleibt die Tour planbar<//>
        <p>Das Abo bleibt das Rückgrat, weil es die Tour planbar macht. Einmallieferungen kommen kontrolliert dazu.</p>
        <ol class="kz-rules">${RULES.map(([lead, text], i) => html`<li key=${i}><strong>${lead}</strong> ${text}</li>`)}</ol>
        <p class="kz-note">Ausbaustufe: Eine Einmallieferung an eine Adresse, die ohnehin auf der Tour liegt, kostet fast keine Zeit. Rechnet das System die zusätzliche Fahrzeit je Bestellung statt fixer Stopps, kann es solche Bestellungen immer annehmen.</p>
      </section>

      <section class="kz-sec" aria-labelledby="s5">
        <${H} id="s5">5. Marketing, das an der Auslastung hängt<//>
        <${Lead} items=${MARKETING} />
      </section>

      <section class="kz-sec" aria-labelledby="s6">
        <${H} id="s6">6. Woran verdient wird<//>
        <p>Die Kalkulation der Demo beruht auf Schätzwerten: Verkaufspreise brutto inklusive 10 % USt und rund 10 % über dem Ladenpreis des Bäckers, Einkauf rund 25 % unter dem Ladenpreis, Fahrer als Subunternehmer mit € 0,36 netto je ausgeliefertem Stück.</p>
        <ul class="kz-list">
          <li>Eine Semmel zu € 0,67 bringt netto rund € 0,19 Rohertrag. Nach der Fahrervergütung bleiben minus € 0,17.</li>
          <li>Ein Artikel trägt die Fahrervergütung ab etwa € 1,25 Bruttopreis. Weckerl, Stangerl, Süßes und Brot liegen darüber, die einfache Semmel nicht.</li>
          <li>Die Zustellgebühr (€ 1,75 werktags, € 2,75 am Wochenende) ist damit die eigentliche Ertragsquelle.</li>
        </ul>
        <p>Daraus folgt: Es zählen mehr Lieferungen und mehr Haushalte pro Tour, nicht mehr Stück pro Sackerl. Aktionen wie „5 Semmeln + 1 gratis“ rechnen sich mit diesen Werten nicht. Sinnvoll sind Nachlässe auf teurere Artikel und auf Extras vom Hofladen. Das Backoffice rechnet jede Aktion durch.</p>
        <p>Für die Fahrer zählt die Stückzahl: Jedes Stück bringt 36 Cent, egal ob Semmel oder Brot, mindestens aber € 50 je Tour. Für das Unternehmen zählt der Wert je Stück. An schwachen Tagen greift die Mindestvergütung, dann zahlt das Unternehmen drauf. Gemeinsam ist beiden das Interesse an größeren und dichteren Touren.</p>
        <p>Ein zweiter Fahrer kostet zusätzlich, solange nicht beide über der Mindestvergütung liegen. Die Warteliste zeigt, wann genug Nachfrage dafür da ist.</p>
        <p>Alle Kalkulationswerte sind Annahmen und im Backoffice einstellbar: Einkaufspreise je Artikel, Vergütung, Mindestvergütung und Fahrzeugkosten.</p>
      </section>

      <section class="kz-sec" aria-labelledby="s7">
        <${H} id="s7">7. Was andere Anbieter machen<//>
        <p class="ui-muted">Stand: Websuche. Die Angaben sind nicht einzeln auf den Seiten der Anbieter geprüft.</p>
        <ul class="kz-list">${OTHERS.map((t, i) => html`<li key=${i}>${t}</li>`)}</ul>
      </section>

      <section class="kz-sec" aria-labelledby="s8">
        <${H} id="s8">8. Was für die echte Version fehlt<//>
        <${Lead} items=${STAGES} />
      </section>

      <section class="kz-sec" aria-labelledby="s9">
        <${H} id="s9">9. Offene Fragen an Michael<//>
        <ul class="kz-questions">${QUESTIONS.map(([lead, text], i) => html`<li key=${i}>
          <span class="kz-q-no ui-mono" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <p><strong>${lead}</strong> ${text}</p>
        </li>`)}</ul>
      </section>

      <section class="kz-sec" aria-labelledby="s10">
        <${H} id="s10">10. Hinweise zur Demo<//>
        <p class="kz-note">Alle Kunden, Adressen und Zahlen sind erfunden. Die Karte ist schematisch. Push-Nachrichten und E-Mails werden nur simuliert. „Zurücksetzen“ in der Demo-Leiste stellt den Ausgangszustand wieder her.</p>
      </section>
    </article>`;
  }

  App.views.concept.konzept = Konzept;
})(typeof window !== 'undefined' ? window : globalThis);
