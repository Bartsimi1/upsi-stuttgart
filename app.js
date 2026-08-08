// UPSI - Stuttgart — reines Client-Side-JS, kein Build-Schritt.
// EVENT_TYPE_LABELS / OTHER_PARTY_LABELS / INJURIES_LABELS kommen aus
// labels.js (vor dieser Datei eingebunden, siehe index.html).

const PAGE_SIZE = 10;

// Severity (injuries) ist absichtlich KEINE Filter-/Tag-Kategorie — siehe
// Nutzeranfrage: nur Ereignistyp, Gegenpartei und Ort sollen filterbar sein.
const TAG_CATEGORIES = [
  { key: "event_type", cssClass: "tag-type", labels: EVENT_TYPE_LABELS, labelsEn: EVENT_TYPE_LABELS_EN },
  { key: "other_party", cssClass: "tag-party", labels: OTHER_PARTY_LABELS, labelsEn: OTHER_PARTY_LABELS_EN },
  { key: "location_tag", cssClass: "tag-location", labels: null },
  { key: "line_tag", cssClass: "tag-line", labels: null },
  // event_year steht nicht in den Rohdaten, sondern wird beim Laden aus
  // event_date abgeleitet (siehe init()) — genau wie location_tag/line_tag
  // rein für die Filterleiste gedacht.
  { key: "event_year", cssClass: "tag-year", labels: null },
];

let allIncidents = [];
let shownCount = 0;
// { event_type: Set(...), other_party: Set(...), location_tag: Set(...) }
const activeFilters = {};
TAG_CATEGORIES.forEach((cat) => (activeFilters[cat.key] = new Set()));

function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function labelFor(category, value) {
  if (!category.labels) return value;
  const labels = getLang() === "en" ? category.labelsEn : category.labels;
  return (labels && labels[value]) || value;
}

function sourceDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (err) {
    return url;
  }
}

// Sicherheits-Fix (AUDIT.md #1, 2026-07-18): incident.summary/location und
// Quellen-URLs stammen aus KI-Zusammenfassungen fremder Artikel-Webseiten —
// niemals ungefiltert per innerHTML einbauen (Stored-XSS-Risiko). esc()
// escaped alle fünf HTML-Sonderzeichen und ist sowohl für Text zwischen
// Tags als auch für in Anführungszeichen stehende Attributwerte sicher.
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

// Nur http(s)-Links dürfen in href landen -- verhindert eingeschleuste
// javascript:-Links über die Quellen-URL (AUDIT.md #1).
function safeHref(url) {
  return /^https?:\/\//i.test(url) ? url : "#";
}

function tagButtonHtml(category, value, extraClass) {
  const active = activeFilters[category.key].has(value) ? " active" : "";
  return `<button type="button" class="tag-btn ${category.cssClass}${active}${extraClass || ""}" data-cat="${category.key}" data-val="${esc(value)}">${esc(labelFor(category, value))}</button>`;
}

function renderCard(incident) {
  const card = document.createElement("div");
  card.className = "incident-card";

  const sourcesHtml = incident.sources
    .map(
      (s, i) =>
        `<a class="source-link" href="${esc(safeHref(s.url))}" target="_blank" rel="noopener">${esc(t("home.sourcePrefix"))} ${i + 1}: ${esc(sourceDomain(s.url))}</a>`
    )
    .join(" · ");

  const tagsHtml = TAG_CATEGORIES.map((cat) =>
    tagButtonHtml(cat, incident[cat.key], " card-tag")
  ).join(" ");

  const injuriesLabels = getLang() === "en" ? INJURIES_LABELS_EN : INJURIES_LABELS;

  card.innerHTML = `
    <div class="meta card-tags">${tagsHtml}</div>
    <div class="meta">
      ${esc(formatDate(incident.event_date))}${incident.event_time ? " · " + esc(incident.event_time) : ""}
      — ${esc(incident.location)}
    </div>
    <p>${esc(incident.summary || "")}</p>
    <div class="meta">
      ${esc(t("home.injuriesLabel"))} ${esc(injuriesLabels[incident.injuries] || incident.injuries)}
    </div>
    <div class="meta">${sourcesHtml}</div>
  `;
  return card;
}

function getFilteredIncidents() {
  return allIncidents.filter((incident) =>
    TAG_CATEGORIES.every((cat) => {
      const active = activeFilters[cat.key];
      return active.size === 0 || active.has(incident[cat.key]);
    })
  );
}

function renderNextPage() {
  const list = document.getElementById("incident-list");
  const filtered = getFilteredIncidents();
  const slice = filtered.slice(shownCount, shownCount + PAGE_SIZE);
  slice.forEach((incident) => list.appendChild(renderCard(incident)));
  shownCount += slice.length;

  const btn = document.getElementById("load-more-btn");
  btn.style.display = shownCount < filtered.length ? "inline-block" : "none";

  if (filtered.length === 0) {
    list.innerHTML = `<p>${esc(t("home.noMatch"))}</p>`;
  }
}

// Trefferanzahl bei aktivem Filter anzeigen, z.B. "2 / 91 UPSIs" (2026-07-18,
// Nutzerauftrag) — nur sichtbar, wenn mindestens ein Filter aktiv ist, sonst
// wäre "91 / 91" nur eine redundante Wiederholung des Header-Zählers oben.
function renderFilterMatchCount() {
  const el = document.getElementById("filter-match-count");
  if (!el) return;
  const anyFilterActive = TAG_CATEGORIES.some((cat) => activeFilters[cat.key].size > 0);
  if (!anyFilterActive) {
    el.hidden = true;
    return;
  }
  const filteredCount = getFilteredIncidents().length;
  el.textContent = `${filteredCount} / ${allIncidents.length} ${t("home.matchCountSuffix")}`;
  el.hidden = false;
}

function rerenderList() {
  const list = document.getElementById("incident-list");
  list.innerHTML = "";
  shownCount = 0;
  renderNextPage();
  renderFilterMatchCount();
}

function toggleFilter(category, value) {
  const set = activeFilters[category];
  if (set.has(value)) {
    set.delete(value);
  } else {
    set.add(value);
  }
  document.querySelectorAll(`.tag-btn[data-cat="${category}"][data-val="${CSS.escape(value)}"]`).forEach((btn) => {
    btn.classList.toggle("active", set.has(value));
  });
  rerenderList();
}

// Die Filterleiste hat mit den mittlerweile 5 Kategorien (u.a. 13
// other_party- und ~35 location_tag-Werte) leicht 80+ kleine Buttons --
// nimmt ungefragt viel Platz über den eigentlichen UPSIs weg. Standardmäßig
// eingeklappt (2026-07-21, Nutzerauftrag), ein Klick auf den Umschalter
// zeigt/versteckt die Gruppen; die Filterfunktion selbst (auch per Klick
// auf ein Tag direkt auf einer Karte, siehe init()) bleibt unverändert --
// nur die Sichtbarkeit der Buttons ändert sich.
function renderFilterBar() {
  const groups = document.getElementById("filter-groups");
  TAG_CATEGORIES.forEach((cat) => {
    const values = [...new Set(allIncidents.map((i) => i[cat.key]))].sort((a, b) =>
      labelFor(cat, a).localeCompare(labelFor(cat, b), getLang())
    );
    const group = document.createElement("div");
    group.className = "filter-group";
    group.innerHTML = values.map((v) => tagButtonHtml(cat, v)).join(" ");
    groups.appendChild(group);
  });

  groups.addEventListener("click", (event) => {
    const btn = event.target.closest(".tag-btn");
    if (!btn) return;
    toggleFilter(btn.dataset.cat, btn.dataset.val);
  });

  const toggle = document.getElementById("filter-toggle");
  toggle.addEventListener("click", () => {
    const nowHidden = !groups.hidden;
    groups.hidden = nowHidden;
    toggle.textContent = nowHidden ? t("home.filterShow") : t("home.filterHide");
  });
}

// Isolierte, sehr alte Einzelfunde (z. B. ein einziges UPSI aus 2012, Jahre
// vor allem anderen) würden die angezeigte Jahresspanne irreführend weit
// aufreißen. Statt eine feste ID hart zu codieren, wird die Lücke erkannt:
// vom aktuellsten Jahr rückwärts durchlaufen, bei einer Lücke von mehr als
// GAP_THRESHOLD_YEARS zwischen zwei belegten Jahren wird abgebrochen — alles
// davor (der isolierte Ausreißer) fließt weder in die Anzahl noch in die
// Jahresspanne ein. Bleibt automatisch korrekt, falls später ein ähnlicher
// Alt-Fund auftaucht, ohne Code-Änderung.
const GAP_THRESHOLD_YEARS = 2;

function renderTotalCountBanner() {
  const el = document.getElementById("total-count");
  if (!el) return;
  if (allIncidents.length === 0) {
    el.textContent = "";
    return;
  }
  const years = [...new Set(allIncidents.map((i) => Number(i.event_year)))].sort((a, b) => b - a);
  let startYear = years[0];
  for (let idx = 1; idx < years.length; idx++) {
    if (years[idx - 1] - years[idx] > GAP_THRESHOLD_YEARS) break;
    startYear = years[idx];
  }
  const maxYear = years[0];
  const countInRange = allIncidents.filter((i) => Number(i.event_year) >= startYear).length;

  el.textContent = startYear === maxYear
    ? tf("home.totalCountYear", { count: countInRange, year: maxYear })
    : tf("home.totalCountRange", { count: countInRange, start: startYear, end: maxYear });
}

function updateCounter() {
  const daysEl = document.getElementById("counter-days");
  const hoursEl = document.getElementById("counter-hours");
  const minutesEl = document.getElementById("counter-minutes");
  const secondsEl = document.getElementById("counter-seconds");
  const infoEl = document.getElementById("last-incident-info");
  if (allIncidents.length === 0) {
    daysEl.textContent = "—";
    hoursEl.textContent = "—";
    minutesEl.textContent = "—";
    secondsEl.textContent = "—";
    infoEl.textContent = t("home.noUpsiYet");
    return;
  }
  const latest = allIncidents[0];
  // event_time fehlt bei manchen Artikeln (nur "Freitagmorgen" o.ä. im Text,
  // keine exakte Uhrzeit) — 12:00 als neutrale Schätzung statt Mitternacht,
  // um die Anzeige nicht künstlich zu verzerren.
  const timeGuessed = !latest.event_time;
  const eventDateTime = new Date(
    `${latest.event_date}T${latest.event_time || "12:00"}:00`
  );
  const now = new Date();
  const diffMs = Math.max(0, now - eventDateTime);
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  daysEl.textContent = days;
  hoursEl.textContent = String(hours).padStart(2, "0");
  minutesEl.textContent = String(minutes).padStart(2, "0");
  secondsEl.textContent = String(seconds).padStart(2, "0");

  const zeitHinweis = timeGuessed ? t("home.timeGuessed") : "";
  infoEl.textContent = `${t("home.lastIncidentPrefix")} ${formatDate(latest.event_date)} ${t("home.inLocation")} ${latest.location}${zeitHinweis}`;
}

function formatDateTime(iso) {
  const d = new Date(iso);
  const lang = getLang();
  const formatted = d.toLocaleString(lang === "en" ? "en-GB" : "de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const suffix = t("home.timeUnit");
  return suffix ? `${formatted} ${suffix}` : formatted;
}

let lastMetaGeneratedAt = null;

async function loadLastUpdated() {
  const el = document.getElementById("last-updated");
  try {
    if (lastMetaGeneratedAt === null) {
      const res = await fetch("data/meta.json");
      const meta = await res.json();
      lastMetaGeneratedAt = meta.generated_at;
    }
    el.textContent = `${t("home.lastUpdatedPrefix")} ${formatDateTime(lastMetaGeneratedAt)}`;
  } catch (err) {
    el.textContent = "";
  }
}

// "Was geschah heute?"-Kachel (2026-08-08, Nutzerauftrag): zeigt echte
// UPSIs vom heutigen Kalendertag (irgendein Jahr) -- diese Prüfung passiert
// bewusst HIER im Browser gegen die schon geladenen allIncidents, nicht im
// Backend-Crawler (data/on_this_day.json), da sich der Datenbestand
// jederzeit ändern kann (ein neuer Unfall kann an einem bisher "leeren"
// Kalendertag dazukommen, ohne dass der wöchentliche Wikipedia-Lauf davon
// weiß). Ohne Treffer: Fallback auf einen von der KI ausgewählten,
// unterhaltsamen Wikipedia-Fakt für dieses Datum (siehe on_this_day.py) --
// fehlt auch der (z.B. während des ersten Aufbaujahres noch nicht
// abgedeckt), bleibt die Kachel schlicht verborgen, kein Fehlerzustand.
async function renderOnThisDay() {
  const card = document.getElementById("on-this-day-card");
  const body = document.getElementById("on-this-day-body");
  if (!card || !body) return;

  const today = new Date();
  const monthDay = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const matches = allIncidents.filter((i) => i.event_date && i.event_date.slice(5) === monthDay);
  if (matches.length > 0) {
    // Kurze Ereignis-Beschreibung statt nur des Orts (Nutzerauftrag
    // 2026-08-08) -- event_type-Label reicht als "sehr kurze Beschreibung",
    // nutzt dieselben (sprachumschaltbaren) Labels wie die Tag-Chips auf den
    // Karten, keine Redundanz mit other_party (z.B. "Fußgänger erfasst"
    // nennt die Gegenpartei implizit schon).
    const eventTypeLabels = getLang() === "en" ? EVENT_TYPE_LABELS_EN : EVENT_TYPE_LABELS;
    const itemsHtml = matches
      .map((i) => {
        const typeLabel = eventTypeLabels[i.event_type] || i.event_type;
        return `<li>${esc(i.event_date.slice(0, 4))} — ${esc(typeLabel)}, ${esc(i.location)}</li>`;
      })
      .join("");
    body.innerHTML = `<p>${esc(t("home.onThisDayIncidentPrefix"))}</p><ul class="on-this-day-list">${itemsHtml}</ul>`;
    card.hidden = false;
    return;
  }

  body.innerHTML = `<p>${esc(t("home.onThisDayLoading"))}</p>`;
  card.hidden = false;
  try {
    const res = await fetch("data/on_this_day.json");
    const facts = await res.json();
    const fact = facts[monthDay];
    if (!fact) {
      card.hidden = true;
      return;
    }
    const text = getLang() === "en" ? fact.text_en : fact.text_de;
    // Erklärender Satz VOR dem Fakt (Nutzerauftrag 2026-08-08) -- macht
    // klar, WARUM hier ein Wikipedia-Fakt statt eines UPSI steht, statt
    // kommentarlos einen thematisch unpassenden Satz hinzuwerfen.
    body.innerHTML = `
      <p class="hero-note">${esc(t("home.onThisDayNoIncident"))}</p>
      <p>${esc(fact.year)} — ${esc(text)}</p>
      <a class="source-link" href="${esc(safeHref(fact.wikipedia_url))}" target="_blank" rel="noopener">${esc(t("home.onThisDayWikiLink"))}</a>
    `;
  } catch (err) {
    card.hidden = true;
  }
}

async function init() {
  const list = document.getElementById("incident-list");
  try {
    const res = await fetch("data/incidents.json");
    const data = await res.json();
    allIncidents = data
      .slice()
      .sort((a, b) => (a.event_date < b.event_date ? 1 : -1));
    allIncidents.forEach((i) => {
      i.event_year = i.event_date.slice(0, 4);
    });
  } catch (err) {
    list.innerHTML = `<p>${esc(t("home.loadError"))}</p>`;
    return;
  }

  if (allIncidents.length > 0) {
    renderFilterBar();
  }
  renderTotalCountBanner();

  list.innerHTML = "";
  if (allIncidents.length === 0) {
    list.innerHTML = `<p>${esc(t("home.noIncidentsYet"))}</p>`;
  } else {
    renderNextPage();
  }
  updateCounter();
  setInterval(updateCounter, 1000);
  loadLastUpdated();
  renderOnThisDay();

  document.getElementById("load-more-btn").addEventListener("click", renderNextPage);

  // Klick auf ein Tag DIREKT auf einer Karte filtert genauso wie ein Klick
  // in der Filterleiste oben.
  list.addEventListener("click", (event) => {
    const btn = event.target.closest(".tag-btn");
    if (!btn) return;
    toggleFilter(btn.dataset.cat, btn.dataset.val);
  });

  // Sprachumschaltung (strings.js) betrifft auch JS-generierten Inhalt, den
  // applyTranslations() selbst nicht anfassen kann (Karten-Tags, Datums-
  // Formatierung, Zähler-Text usw.) -- bei jedem Sprachwechsel neu rendern,
  // ohne die Daten erneut zu laden.
  document.addEventListener("upsi-lang-changed", () => {
    if (allIncidents.length > 0) {
      document.getElementById("filter-groups").innerHTML = "";
      renderFilterBar();
    }
    renderTotalCountBanner();
    rerenderList();
    updateCounter();
    loadLastUpdated();
    renderOnThisDay();
  });
}

document.addEventListener("DOMContentLoaded", init);
