// UPSI - Stuttgart — Sprachumschaltung (Deutsch/Englisch), reines Client-
// Side-JS, kein Build-Schritt. Vor allen anderen Skripten eingebunden (auf
// jeder Seite, gleiche Position wie labels.js). Übersetzt NUR die eigene
// Bedienoberfläche (Buttons, Navigation, Überschriften, feste Beschriftungen)
// -- Unfall-Zusammenfassungen/Ortsangaben stammen aus deutschen Presseartikeln
// und bleiben bewusst unübersetzt (Nutzerentscheid 2026-08-08).
//
// Status (welche Sprache aktiv ist) lebt AUSSCHLIESSLICH in localStorage --
// verlässt nie den Browser, kein Cookie, kein Server-Request.

const LANG_STORAGE_KEY = "upsi-lang";

const STRINGS = {
  de: {
    "nav.home": "Startseite",
    "nav.stats": "Statistik",
    "nav.map": "Karte",
    "nav.suggestions": "Verbesserungsvorschläge",
    "nav.about": "Über UPSI",

    "home.subtitle": "\"<strong>U</strong>Bahn vs. <strong>P</strong>KW <strong>S</strong>tuttgarter <strong>I</strong>mpaktanalyse\" · Die inoffizielle Stadtbahn-Unfall-Chronik",
    "home.wikiNotice": "📋 Diese Liste ist möglicherweise unvollständig. Du kannst helfen, sie zu erweitern — zum Beispiel, indem du in einen Unfall mit einer Stadtbahn verwickelt wirst.*",
    "home.wikiNoticeFootnote": "* Bitte nicht. Das ist nicht ernst gemeint — pass im echten Leben bitte auf Stadtbahnen auf.",
    "home.marquee": "★ Willkommen auf der inoffiziellsten Stadtbahn-Statistik-Seite Stuttgarts! ★ Jetzt mit noch mehr Quellen! ★ Danke fürs Vorbeischauen! ★",
    "home.counterLabel": "Seit dem letzten <strong>UPSI</strong>:",
    "home.unitDays": "Tage",
    "home.unitHours": "Std.",
    "home.unitMinutes": "Min.",
    "home.unitSeconds": "Sek.",
    "home.filterShow": "Filter anzeigen",
    "home.filterHide": "Filter ausblenden",
    "home.filterHint": "Nach Anklicken filtern (mehrfach kombinierbar):",
    "home.loadMore": "Mehr anzeigen",
    "home.noIncidentsYet": "Noch keine Ereignisse erfasst.",
    "home.loadError": "Fehler beim Laden der Daten.",
    "home.noMatch": "Keine UPSI passen zu dieser Filterauswahl.",
    "home.noUpsiYet": "Noch kein UPSI erfasst.",
    "home.lastUpdatedPrefix": "Zuletzt aktualisiert:",
    "home.timeUnit": "Uhr",
    "home.timeGuessed": " (Uhrzeit unbekannt, 12:00 geschätzt)",
    "home.lastIncidentPrefix": "Letztes UPSI:",
    "home.injuriesLabel": "Verletzte:",
    "home.sourcePrefix": "Quelle",
    "home.matchCountSuffix": "UPSIs",
    "home.totalCountYear": "{count} UPSIs im Jahr {year}",
    "home.totalCountRange": "{count} UPSIs zwischen {start} und {end}",
    "home.inLocation": "in",
    "home.aboutTitle": "Über UPSI - Stuttgart",
    "home.aboutBody": "UPSI - Stuttgart sammelt automatisiert öffentlich berichtete Unfälle zwischen Stadtbahn-/Straßenbahnfahrzeugen der SSB und anderen Verkehrsteilnehmern (PKW, Fußgänger, Radfahrer u.a.) in Stuttgart. Die Erfassung erfolgt teilautomatisiert aus öffentlichen Presseartikeln und offiziellen Mitteilungen, mit KI-gestützter Vorklassifizierung und menschlicher Nachkontrolle bei Unsicherheit.",
    "home.hitCounterLabel": "Besucherzähler:",
    "home.constructionBadge": "🚧 Neue Quellen werden laufend ergänzt 🚧",
    "home.viewedBadge": "🖥️ Am besten angesehen mit jedem Browser seit 2010",
    "home.onThisDayTitle": "📅 Was geschah heute?",
    "home.onThisDayIncidentPrefix": "An diesem Tag geschah bereits:",
    "home.onThisDayNoIncident": "Heute gab es (bisher) kein UPSI. Stattdessen ein kleiner spaßiger Fakt, was an diesem Tag sonst passierte:",
    "home.onThisDayWikiLink": "Mehr auf Wikipedia →",
    "home.onThisDayLoading": "Lade …",

    "footer.legalNotice": "<strong>Rechtlicher Hinweis:</strong> UPSI - Stuttgart ist KEINE offizielle Statistik der SSB, der Polizei oder der Stadt Stuttgart und KEINE wissenschaftliche Analyse. Die Daten stammen aus öffentlich zugänglichen Presseartikeln und können Fehler, Lücken oder Verzögerungen enthalten. Jedes Ereignis ist mit seiner Quelle verlinkt — bei Zweifeln bitte die Originalquelle prüfen.",
    "footer.legalNoticeStats": "<strong>Rechtlicher Hinweis:</strong> UPSI - Stuttgart ist KEINE offizielle Statistik der SSB, der Polizei oder der Stadt Stuttgart und KEINE wissenschaftliche Analyse. Die Daten stammen aus öffentlich zugänglichen Presseartikeln und können Fehler, Lücken oder Verzögerungen enthalten.",
    "footer.legalNoticeShort": "<strong>Rechtlicher Hinweis:</strong> UPSI - Stuttgart ist KEINE offizielle Statistik der SSB, der Polizei oder der Stadt Stuttgart und KEINE wissenschaftliche Analyse.",
    "footer.jokeDisclaimerHome": "Der Name \"UPSI\" ist bewusst humorvoll gemeint — die tatsächlichen Unfalldaten (Verletzte, Sachschäden) werden hier stets sachlich und ohne Humor dargestellt.",
    "footer.impressum": "Impressum",
    "footer.datenschutz": "Datenschutz",

    "stats.subtitle": "Zahlen, Diagramme und Auswertungen — genauso inoffiziell wie der Rest der Seite",
    "stats.gapTitle": "Zeit zwischen zwei UPSIs",
    "stats.gapHeroLabel": "Tage im Durchschnitt zwischen zwei UPSIs",
    "stats.recordTitle": "Rekord: längste unfallfreie Serie (letzte 2 Jahre)",
    "stats.recordHeroLabel": "Tage ohne UPSI (Rekord)",
    "stats.partyTitle": "Verteilung der Gegenpartei",
    "stats.lineTitle": "Unfälle nach Stadtbahnlinie",
    "stats.brandTitle": "Verteilung der PKW-Marken",
    "stats.stopTitle": "Gefährlichste Haltestellen",
    "stats.clockTitle": "Zu welcher Uhrzeit passieren UPSIs?",
    "stats.weekdayTitle": "Gefährlichster Wochentag",
    "stats.weekdayHeroLabel": "Wochentag mit den meisten UPSIs",
    "stats.ageTitle": "Alter der Gegenpartei",
    "stats.avgAgeTitle": "Durchschnittsalter nach Fahrzeugtyp",
    "stats.tableToggle": "Als Tabelle anzeigen",
    "stats.tableHide": "Tabelle ausblenden",
    "stats.loading": "Lade Daten…",
    "footer.jokeDisclaimerStats": "Diese Statistik-Seite ist genauso ironisch gemeint wie der Rest von UPSI — die zugrunde liegenden Unfalldaten (Verletzte, Sachschäden) werden dennoch stets sachlich und ohne Humor erfasst.",

    "map.subtitle": "Wo kracht's am liebsten? — echte Stuttgart-Karte, straßengenau wo möglich",
    "map.title": "UPSIs auf der Karte",
    "map.loadingYears": "Lade Jahre…",
    "map.legendFew": "wenige",
    "map.legendMedium": "mittel",
    "map.legendMany": "viele UPSIs",
    "map.legendNote": "(Größe UND Farbe des Punkts zeigen die Anzahl)",
    "map.loading": "Lade Daten…",
    "map.listViewSummary": "📋 Text-Liste (auch mit Tastatur/Screenreader nutzbar)",
    "map.close": "Schließen ×",
    "footer.mapLegalNotice": "<strong>Rechtlicher Hinweis:</strong> UPSI - Stuttgart ist KEINE offizielle Statistik der SSB, der Polizei oder der Stadt Stuttgart und KEINE wissenschaftliche Analyse. Die Kartenpositionen sind, wo im Artikeltext eine Straße/Kreuzung/Haltestelle genannt wird, automatisch geokodiert (und bei nur einer genannten Straße zusätzlich auf die tatsächliche Stadtbahn-Streckenführung eingerastet) — eine Schätzung, KEINE vermessene Position. Fehlt jeder Straßenbezug im Text, bleibt es beim ungefähren Stadtteil-/Ortsmittelpunkt.",
    "footer.jokeDisclaimerMap": "Die Kartenkacheln stammen von OpenStreetMap-Mitwirkenden — wenigstens der Neckar liegt wirklich da, wo er soll.",

    "suggestions.subtitle": "Ihre Meinung ist uns wichtig*",
    "suggestions.cardTitle": "Dein Verbesserungsvorschlag",
    "suggestions.heroNote": "Maximal 20 Zeichen. Mehr Zeit ist es ohnehin nicht wert.",
    "suggestions.placeholder": "Dein Vorschlag...",
    "suggestions.ok": "OK",
    "suggestions.shredderMessage": "Ihr Vorschlag wurde abgelehnt.",
    "suggestions.shredderSubmessage": "Die Qualitätssicherung dankt für Ihr Verständnis.",
    "suggestions.tryAgain": "Neuer Versuch",
    "suggestions.footerDisclaimer": "* Nicht wirklich. Dein Vorschlag wird NICHT gespeichert und NICHT versendet — er verlässt nie deinen Browser und landet direkt im Shredder. Diese Seite existiert rein zur Unterhaltung.",

    "impressum.subtitle": "Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz)",
    "datenschutz.subtitle": "Welche Daten wo verarbeitet werden — vollständig und ohne Umschweife · Stand: 21. Juli 2026",
    "legal.germanOnlyNote": "(Dieser rechtlich verbindliche Text liegt nur auf Deutsch vor.)",

    "langToggle.label": "Sprache",
  },
  en: {
    "nav.home": "Home",
    "nav.stats": "Statistics",
    "nav.map": "Map",
    "nav.suggestions": "Suggestions",
    "nav.about": "About UPSI",

    "home.subtitle": "\"<strong>U</strong>Bahn (tram) vs. <strong>P</strong>KW (car) <strong>S</strong>tuttgart <strong>I</strong>mpact analysis\" · The unofficial Stuttgart tram-accident chronicle",
    "home.wikiNotice": "📋 This list may be incomplete. You can help expand it — for example, by getting involved in an accident with a tram.*",
    "home.wikiNoticeFootnote": "* Please don't. That's not meant seriously — please do watch out for trams in real life.",
    "home.marquee": "★ Welcome to Stuttgart's most unofficial tram-accident statistics page! ★ Now with even more sources! ★ Thanks for stopping by! ★",
    "home.counterLabel": "Since the last <strong>UPSI</strong>:",
    "home.unitDays": "days",
    "home.unitHours": "hrs",
    "home.unitMinutes": "min",
    "home.unitSeconds": "sec",
    "home.filterShow": "Show filters",
    "home.filterHide": "Hide filters",
    "home.filterHint": "Click to filter (can be combined):",
    "home.loadMore": "Show more",
    "home.noIncidentsYet": "No incidents recorded yet.",
    "home.loadError": "Error loading data.",
    "home.noMatch": "No UPSIs match this filter selection.",
    "home.noUpsiYet": "No UPSI recorded yet.",
    "home.lastUpdatedPrefix": "Last updated:",
    "home.timeUnit": "",
    "home.timeGuessed": " (time unknown, 12:00 estimated)",
    "home.lastIncidentPrefix": "Last UPSI:",
    "home.injuriesLabel": "Injuries:",
    "home.sourcePrefix": "Source",
    "home.matchCountSuffix": "UPSIs",
    "home.totalCountYear": "{count} UPSIs in {year}",
    "home.totalCountRange": "{count} UPSIs between {start} and {end}",
    "home.inLocation": "in",
    "home.aboutTitle": "About UPSI - Stuttgart",
    "home.aboutBody": "UPSI - Stuttgart automatically collects publicly reported accidents between SSB tram/light-rail vehicles and other road users (cars, pedestrians, cyclists, etc.) in Stuttgart. Collection is semi-automated from public news articles and official statements, with AI-assisted pre-classification and human review whenever there's uncertainty.",
    "home.hitCounterLabel": "Visitor counter:",
    "home.constructionBadge": "🚧 New sources are added continuously 🚧",
    "home.viewedBadge": "🖥️ Best viewed with any browser since 2010",
    "home.onThisDayTitle": "📅 What happened today?",
    "home.onThisDayIncidentPrefix": "On this day, this already happened:",
    "home.onThisDayNoIncident": "No UPSI happened today (so far). Instead, here's a small fun fact about what else happened on this date:",
    "home.onThisDayWikiLink": "More on Wikipedia →",
    "home.onThisDayLoading": "Loading …",

    "footer.legalNotice": "<strong>Legal notice:</strong> UPSI - Stuttgart is NOT an official statistic of SSB, the police, or the City of Stuttgart, and NOT a scientific analysis. The data comes from publicly accessible news articles and may contain errors, gaps, or delays. Every event is linked to its source — if in doubt, please check the original source.",
    "footer.legalNoticeStats": "<strong>Legal notice:</strong> UPSI - Stuttgart is NOT an official statistic of SSB, the police, or the City of Stuttgart, and NOT a scientific analysis. The data comes from publicly accessible news articles and may contain errors, gaps, or delays.",
    "footer.legalNoticeShort": "<strong>Legal notice:</strong> UPSI - Stuttgart is NOT an official statistic of SSB, the police, or the City of Stuttgart, and NOT a scientific analysis.",
    "footer.jokeDisclaimerHome": "The name \"UPSI\" (German for \"oops\") is deliberately meant to be humorous — the actual accident data (injuries, property damage) is always presented factually and without humor here.",
    "footer.impressum": "Legal notice (Impressum)",
    "footer.datenschutz": "Privacy policy",

    "stats.subtitle": "Numbers, charts and breakdowns — just as unofficial as the rest of the site",
    "stats.gapTitle": "Time between two UPSIs",
    "stats.gapHeroLabel": "Average days between two UPSIs",
    "stats.recordTitle": "Record: longest accident-free streak (last 2 years)",
    "stats.recordHeroLabel": "Days without a UPSI (record)",
    "stats.partyTitle": "Distribution of the other party",
    "stats.lineTitle": "Accidents by tram line",
    "stats.brandTitle": "Distribution of car brands",
    "stats.stopTitle": "Most dangerous stops",
    "stats.clockTitle": "What time do UPSIs happen at?",
    "stats.weekdayTitle": "Most dangerous weekday",
    "stats.weekdayHeroLabel": "Weekday with the most UPSIs",
    "stats.ageTitle": "Age of the other party",
    "stats.avgAgeTitle": "Average age by vehicle type",
    "stats.tableToggle": "Show as table",
    "stats.tableHide": "Hide table",
    "stats.loading": "Loading data…",
    "footer.jokeDisclaimerStats": "This statistics page is just as tongue-in-cheek as the rest of UPSI — the underlying accident data (injuries, property damage) is nevertheless always recorded factually and without humor.",

    "map.subtitle": "Where does it crash the most? — a real map of Stuttgart, street-accurate where possible",
    "map.title": "UPSIs on the map",
    "map.loadingYears": "Loading years…",
    "map.legendFew": "few",
    "map.legendMedium": "medium",
    "map.legendMany": "many UPSIs",
    "map.legendNote": "(the dot's size AND color both show the count)",
    "map.loading": "Loading data…",
    "map.listViewSummary": "📋 Text list (also usable with keyboard/screen reader)",
    "map.close": "Close ×",
    "footer.mapLegalNotice": "<strong>Legal notice:</strong> UPSI - Stuttgart is NOT an official statistic of SSB, the police, or the City of Stuttgart, and NOT a scientific analysis. Map positions are automatically geocoded wherever the article text names a street/intersection/stop (and, if only a street is named, additionally snapped to the actual tram route) — an estimate, NOT a surveyed position. If the text has no street reference at all, it falls back to the approximate district/town center.",
    "footer.jokeDisclaimerMap": "The map tiles come from OpenStreetMap contributors — at least the Neckar river is really where it's supposed to be.",

    "suggestions.subtitle": "Your opinion matters to us*",
    "suggestions.cardTitle": "Your suggestion",
    "suggestions.heroNote": "Maximum 20 characters. It isn't worth more of your time anyway.",
    "suggestions.placeholder": "Your suggestion...",
    "suggestions.ok": "OK",
    "suggestions.shredderMessage": "Your suggestion has been rejected.",
    "suggestions.shredderSubmessage": "Quality assurance thanks you for your understanding.",
    "suggestions.tryAgain": "Try again",
    "suggestions.footerDisclaimer": "* Not really. Your suggestion is NOT saved and NOT sent anywhere — it never leaves your browser and goes straight into the shredder. This page exists purely for entertainment.",

    "impressum.subtitle": "Legal notice per § 5 DDG (German Digital Services Act)",
    "datenschutz.subtitle": "What data is processed where — complete and without detours · As of: 21 July 2026",
    "legal.germanOnlyNote": "(This legally binding text is only available in German.)",

    "langToggle.label": "Language",
  },
};

function getLang() {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return stored === "en" ? "en" : "de";
  } catch (err) {
    return "de";
  }
}

function setLang(lang) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch (err) {
    // localStorage kann in seltenen Fällen blockiert sein (privater Modus
    // o.ä.) -- die Sprache wechselt dann nur für den aktuellen Seitenaufruf,
    // kein Absturz.
  }
  applyTranslations();
  document.dispatchEvent(new CustomEvent("upsi-lang-changed", { detail: { lang } }));
}

// t(key): Übersetzung für JS-generierten Text (dynamische Strings, die
// app.js/statistik.js/karte.js/vorschlaege.js selbst zusammenbauen, nicht
// deklarativ per data-i18n aus dem HTML kommen).
function t(key) {
  const lang = getLang();
  return (STRINGS[lang] && STRINGS[lang][key]) || (STRINGS.de[key] ?? key);
}

// tf(key, vars): wie t(), aber mit einfacher {platzhalter}-Ersetzung -- für
// Sätze, deren Wortstellung sich zwischen Deutsch und Englisch unterscheidet
// (z.B. "{count} UPSIs im Jahr {year}" vs. "{count} UPSIs in {year}").
function tf(key, vars) {
  let text = t(key);
  Object.entries(vars || {}).forEach(([k, v]) => {
    text = text.replace(new RegExp(`\\{${k}\\}`, "g"), v);
  });
  return text;
}

function applyTranslations() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const value = t(key);
    if (value === undefined) return;
    if (el.hasAttribute("data-i18n-html")) {
      el.innerHTML = value;
    } else {
      el.textContent = value;
    }
  });
  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    // Format: data-i18n-attr="placeholder:home.placeholderKey"
    el.getAttribute("data-i18n-attr").split(";").forEach((pair) => {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
  document.querySelectorAll(".lang-toggle-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
}

function initLangToggle() {
  document.querySelectorAll(".lang-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });
  applyTranslations();
}

document.addEventListener("DOMContentLoaded", initLangToggle);
