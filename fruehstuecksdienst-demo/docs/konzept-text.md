# Inhalt der Konzept-Seite

Seitentitel: **Was diese Demo zeigt**

## 1. Worum es geht

Ein eigener Frühstücks-Lieferdienst mit eigener Marke: Gebäck vom Bäcker aus der Region, werktags bis 06:30 Uhr und am Wochenende bis 08:30 Uhr an der Haustür.

Die Demo zeigt, wie Kunden-App, Disposition und Fahrer-App zusammenspielen. Sie löst drei Schwächen des heutigen Portals: Einzelne Tage lassen sich nicht sperren, es gibt nur Daueraufträge, und es fehlen Werkzeuge für Marketing.

Alles läuft mit Beispieldaten im Browser. Name, Gebiete, Preise und Sortiment sind Platzhalter.

## 2. Die Demo in 7 Schritten

Jeder Schritt hat einen Button, der direkt in die passende Ansicht springt.

| Nr. | Titel | Text | Sprung |
|---|---|---|---|
| 1 | Liefertage prüfen | In der Kunden-App die PLZ 5303 (Thalgau) eingeben. Montag ist ausgebucht, Dienstag bis Freitag sind frei und tragen eine Aktion. | `go('kunde','start')` |
| 2 | Warteliste und Bestellung | Für Montag auf die Warteliste setzen. Dann ein Abo für Dienstag und Samstag anlegen oder einmalig bestellen. | `go('kunde','lieferplan')` |
| 3 | Auslastung sehen | Im Backoffice zeigt die Übersicht: Montag liegt über 100 %, Dienstag bis Freitag bei rund der Hälfte. | `go('backoffice','uebersicht')` |
| 4 | Tour prüfen | Unter Touren den Montag wählen. Mit einem Fahrer endet die Tour nach 06:30 Uhr, mit zwei Fahrern pünktlich. | `go('backoffice','touren')` |
| 5 | Montag freigeben | Unter Kapazität den Montag auf zwei Fahrer und „Offen“ stellen. Die Warteliste wird automatisch benachrichtigt. | `go('backoffice','kapazitaet')` |
| 6 | Nachricht beim Kunden | Zurück in der Kunden-App erscheint die Push-Nachricht „Montag ist frei“. Der Platz ist 24 Stunden reserviert. | `go('kunde','konto')` |
| 7 | Zustellung | In der Fahrer-App die Stopps in Tour-Reihenfolge abhaken. „Zugestellt & weiter“ öffnet Google Maps mit dem nächsten Stopp, der Kunde bekommt „Ihr Frühstück ist da“. | `go('fahrer')` |

## 3. Was sich ändert

| Problem heute | Lösung in der Demo |
|---|---|
| Ein Tag ist voll, also bleibt das Gebiet für Neukunden zu. | Jeder Wochentag hat je Gebiet eine eigene Kapazität und einen eigenen Status. Volle Tage bekommen eine Warteliste, alle anderen bleiben buchbar. |
| Wird ein Tag wieder frei, erfährt es niemand. | Wer wartet, bekommt automatisch eine Push-Nachricht oder E-Mail. Der Platz ist 24 Stunden reserviert. |
| Es gibt nur Daueraufträge. | Abo und Einmallieferung stehen nebeneinander. Einmallieferungen sind je Tour und Tag begrenzt. |
| Dienstag bis Freitag ist die Tour halb leer. | Das System erkennt Tage mit freien Plätzen und bewirbt genau diese: als Aktion in der Wochenleiste und als Kampagne an passende Kunden. |
| Es gibt keinen Anreiz, mehr zu kaufen. | Mengenaktionen, passende Ergänzungen im Sackerl und Schnellstart-Sackerl. Im Backoffice einstellbar. Die Kalkulation rechnet Einkauf und Fahrervergütung mit und markiert Aktionen, die Verlust machen. |
| Das Sortiment endet beim Gebäck. | Extras vom Hofladen (Butter, Marmelade, Eier, Schinken, Käse, Milch) und fertige Frühstücks-Sackerl. |
| Die Montagstour schafft 06:30 Uhr nicht immer. | Die Tour wird je Gebiet automatisch gereiht, mit Ankunftszeit je Stopp und einer Warnung, wenn die Deadline nicht hält. Fahrer haben eigene Zugänge. |

## 4. Abo oder einmal: so bleibt die Tour planbar

Das Abo bleibt das Rückgrat, weil es die Tour planbar macht. Einmallieferungen kommen kontrolliert dazu.

1. **Kapazität je Tour und Tag.** Fahrer mal Stopps je Fahrer. In der Demo schafft ein Fahrer auf der ländlichen Tour werktags 38 Stopps bis 06:30 Uhr und am Wochenende 55, weil bis 08:30 Uhr Zeit ist. Das sind Beispielwerte.
2. **Flex-Kontingent.** Abo-Plätze werden nur bis Kapazität minus Kontingent verkauft, in der Demo 3 Plätze. Dieser Rest gehört den Einmallieferungen.
3. **Freie Plätze am konkreten Datum.** Eine Einmallieferung darf jeden Platz nutzen, der an genau diesem Tag frei ist, auch den eines Kunden im Urlaub. An schwachen Tagen sind das viele, am vollen Montag keiner.
4. **Der Bestellschluss bleibt.** 16:30 Uhr am Vortag, freitags für Samstag, Sonntag und Montag. Der Bäcker bekommt eine Zahl, die sich nicht mehr ändert.
5. **Der Preis lenkt.** Die Einmallieferung kostet mehr Zustellung als das Abo (in der Demo werktags € 2,50 statt € 1,75) und hat einen Mindestbestellwert. Wer oft spontan bestellt, wechselt von selbst ins Abo.
6. **Voll ist voll.** Die App zeigt den nächsten freien Tag und bietet die Warteliste an. Kein Fahrer wird überrascht.

Ausbaustufe: Eine Einmallieferung an eine Adresse, die ohnehin auf der Tour liegt, kostet fast keine Zeit. Rechnet das System die zusätzliche Fahrzeit je Bestellung statt fixer Stopps, kann es solche Bestellungen immer annehmen.

## 5. Marketing, das an der Auslastung hängt

- **Aktion für schwache Tage.** „Zustellung 4 Wochen gratis“ erscheint nur an Tagen mit viel Luft.
- **Nachbarn werben.** Guthaben für beide. Jeder Nachbar verkürzt den Weg pro Stopp.
- **Gebiet vormerken.** In neuen Gebieten sammeln sich Interessenten, gestartet wird ab einer Mindestzahl.
- **Saison.** Nikolo-Sackerl, Osterpinze, Muttertag: als Einmallieferung vorbestellbar.
- **Verschenken und Büro.** Frühstück verschenken und Büro-Frühstück als eigene Angebote.
- **Pünktlich-Versprechen** als Idee: Kommt das Sackerl zu spät, geht die Zustellung auf uns.
- **Mengenaktionen mit Kalkulation.** Jede Aktion wird vor dem Start durchgerechnet.

## 6. Woran verdient wird

Die Kalkulation der Demo beruht auf Schätzwerten: Verkaufspreise brutto inklusive 10 % USt und rund 10 % über dem Ladenpreis des Bäckers, Einkauf rund 25 % unter dem Ladenpreis, Fahrer als Subunternehmer mit € 0,36 netto je ausgeliefertem Stück.

- Eine Semmel zu € 0,67 bringt netto rund € 0,19 Rohertrag. Nach der Fahrervergütung bleiben minus € 0,17.
- Ein Artikel trägt die Fahrervergütung ab etwa € 1,25 Bruttopreis. Weckerl, Stangerl, Süßes und Brot liegen darüber, die einfache Semmel nicht.
- Die Zustellgebühr (€ 1,75 werktags, € 2,75 am Wochenende) ist damit die eigentliche Ertragsquelle.

Daraus folgt: Es zählen mehr Lieferungen und mehr Haushalte pro Tour, nicht mehr Stück pro Sackerl. Aktionen wie „5 Semmeln + 1 gratis“ rechnen sich mit diesen Werten nicht. Sinnvoll sind Nachlässe auf teurere Artikel und auf Extras vom Hofladen. Das Backoffice rechnet jede Aktion durch.

Für die Fahrer zählt die Stückzahl: Jedes Stück bringt 36 Cent, egal ob Semmel oder Brot, mindestens aber € 50 je Tour. Für das Unternehmen zählt der Wert je Stück. An schwachen Tagen greift die Mindestvergütung, dann zahlt das Unternehmen drauf. Gemeinsam ist beiden das Interesse an größeren und dichteren Touren.

Ein zweiter Fahrer kostet zusätzlich, solange nicht beide über der Mindestvergütung liegen. Die Warteliste zeigt, wann genug Nachfrage dafür da ist.

Alle Kalkulationswerte sind Annahmen und im Backoffice einstellbar: Einkaufspreise je Artikel, Vergütung, Mindestvergütung und Fahrzeugkosten.

## 7. Was andere Anbieter machen

Stand: Websuche. Die Angaben sind nicht einzeln auf den Seiten der Anbieter geprüft.

- Mehrere Anbieter im deutschsprachigen Raum nehmen Einzelbestellungen ohne Abo an, meist mit Bestellschluss am Vorabend und Mindestbestellwert statt Bindung.
- Lebensmittel-Lieferdienste mit festen Routen setzen Neukunden in vollen Gebieten auf eine Warteliste und melden sich, sobald Platz ist.
- Milchmann-Dienste in Großbritannien liefern Gebäck, Milch und Eier in einer Tour. Einzelne Lieferungen lassen sich in der App aussetzen.
- Eine kostenlose erste Lieferung ist als Einstieg weit verbreitet.

## 8. Was für die echte Version fehlt

- **Stufe 1, Kundenportal:** Registrierung, Bestellung, Kapazität und Warteliste, monatliche Abrechnung per SEPA-Lastschrift, E-Mails.
- **Stufe 2, Betrieb:** Backoffice mit Zugängen und Rollen, Tourenplanung auf echten Straßen, Fahrer-App, automatische Bestellung an den Bäcker zum Bestellschluss.
- **Stufe 3, Wachstum:** installierbare App mit Push-Nachrichten, Kampagnen, Empfehlungsprogramm, Feiertagslogik, Auswertungen.

## 9. Offene Fragen an Michael

- **Name und Marke.** „Semmelengel“ ist ein Arbeitstitel. Vor einer Entscheidung Marken- und Firmenregister prüfen.
- **Gebiete.** Welche PLZ, welche Touren, wie viele Stopps schafft ein Fahrer wirklich bis 06:30 Uhr?
- **Bäcker.** Wie kommt die Bestellung heute zur Bäckerei, bis wann und in welcher Form?
- **Preise.** Zustellgebühr je Lieferung, Mindestbestellwert, Aufschlag für Einmallieferungen.
- **Einkauf.** Was kostet der Einkauf beim Bäcker wirklich? Die Demo rechnet mit Ladenpreis minus 25 %.
- **Fahrervergütung.** Gilt sie je Stück oder je Stopp? Davon hängt ab, ob sich Mehrkauf rechnet.
- **Extras.** Welche Produkte, welcher Partner, wie bleibt Gekühltes im Sommer kühl?
- **Bezahlung.** Monatliche Lastschrift oder zusätzlich Karte?
- **Bestandskunden.** Wie kommen sie ins neue System? Datenschutz und Franchisevertrag (Wettbewerbs- und Kundenschutzklauseln) vorab rechtlich prüfen lassen.

## 10. Hinweise zur Demo

Alle Kunden, Adressen und Zahlen sind erfunden. Die Karte ist schematisch. Push-Nachrichten und E-Mails werden nur simuliert. „Zurücksetzen“ in der Demo-Leiste stellt den Ausgangszustand wieder her.
