// UPSI - Stuttgart — reines Client-Side-JS, kein Build-Schritt.
// EVENT_TYPE_LABELS / OTHER_PARTY_LABELS / INJURIES_LABELS kommen aus
// labels.js (vor dieser Datei eingebunden, siehe index.html).

const PAGE_SIZE = 10;

// Severity (injuries) ist absichtlich KEINE Filter-/Tag-Kategorie — siehe
// Nutzeranfrage: nur Ereignistyp, Gegenpartei und Ort sollen filterbar sein.
const TAG_CATEGORIES = [
  { key: "event_type", cssClass: "tag-type", labels: EVENT_TYPE_LABELS },
  { key: "other_party", cssClass: "tag-party", labels: OTHER_PARTY_LABELS },
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
  if (category.labels) return category.labels[value] || value;
  return value;
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
        `<a class="source-link" href="${esc(safeHref(s.url))}" target="_blank" rel="noopener">Quelle ${i + 1}: ${esc(sourceDomain(s.url))}</a>`
    )
    .join(" · ");

  const tagsHtml = TAG_CATEGORIES.map((cat) =>
    tagButtonHtml(cat, incident[cat.key], " card-tag")
  ).join(" ");

  card.innerHTML = `
    <div class="meta card-tags">${tagsHtml}</div>
    <div class="meta">
      ${esc(formatDate(incident.event_date))}${incident.event_time ? " · " + esc(incident.event_time) : ""}
      — ${esc(incident.location)}
    </div>
    <p>${esc(incident.summary || "")}</p>
    <div class="meta">
      Verletzte: ${esc(INJURIES_LABELS[incident.injuries] || incident.injuries)}
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
    list.innerHTML = "<p>Keine UPSI passen zu dieser Filterauswahl.</p>";
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
  el.textContent = `${filteredCount} / ${allIncidents.length} UPSIs`;
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
      labelFor(cat, a).localeCompare(labelFor(cat, b), "de")
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
    toggle.textContent = nowHidden ? "Filter anzeigen" : "Filter ausblenden";
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
    ? `${countInRange} UPSIs im Jahr ${maxYear}`
    : `${countInRange} UPSIs zwischen ${startYear} und ${maxYear}`;
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
    infoEl.textContent = "Noch kein UPSI erfasst.";
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

  const zeitHinweis = timeGuessed ? " (Uhrzeit unbekannt, 12:00 geschätzt)" : "";
  infoEl.textContent = `Letztes UPSI: ${formatDate(latest.event_date)} in ${latest.location}${zeitHinweis}`;
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) + " Uhr";
}

async function loadLastUpdated() {
  const el = document.getElementById("last-updated");
  try {
    const res = await fetch("data/meta.json");
    const meta = await res.json();
    el.textContent = `Zuletzt aktualisiert: ${formatDateTime(meta.generated_at)}`;
  } catch (err) {
    el.textContent = "";
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
    list.innerHTML = "<p>Fehler beim Laden der Daten.</p>";
    return;
  }

  if (allIncidents.length > 0) {
    renderFilterBar();
  }
  renderTotalCountBanner();

  list.innerHTML = "";
  if (allIncidents.length === 0) {
    list.innerHTML = "<p>Noch keine Ereignisse erfasst.</p>";
  } else {
    renderNextPage();
  }
  updateCounter();
  setInterval(updateCounter, 1000);
  loadLastUpdated();

  document.getElementById("load-more-btn").addEventListener("click", renderNextPage);

  // Klick auf ein Tag DIREKT auf einer Karte filtert genauso wie ein Klick
  // in der Filterleiste oben.
  list.addEventListener("click", (event) => {
    const btn = event.target.closest(".tag-btn");
    if (!btn) return;
    toggleFilter(btn.dataset.cat, btn.dataset.val);
  });
}

document.addEventListener("DOMContentLoaded", init);
