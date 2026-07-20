// UPSI - Stuttgart — Karte-Seite. Leaflet (vendor/leaflet/, kein CDN,
// gleiche "kein Drittanbieter-Nachladen"-Regel wie beim Rest der Seite) +
// echte OpenStreetMap-Kacheln (einzige akzeptierte Ausnahme -- eine Karte
// ohne echte Kartenkacheln ist keine Karte). Gruppiert Incidents nach ihrem
// bereits in data/incidents.json enthaltenen location_tag (siehe
// locations.py) -- derselben Gruppierung, die auch die Filterleiste der
// Startseite nutzt.
//
// LOCATION_COORDS: von Hand kuratierte, per Nominatim/OpenStreetMap
// geokodierte NÄHERUNGSWERTE für den Mittelpunkt jedes bekannten Orts/
// Stadtteils -- NICHT straßen-/kreuzungsgenau wie beim Schwesterprojekt
// szegedi-villamos-balesetek (dessen location-Granularität einzelne
// Kreuzungen sind; location_tag() hier gruppiert nur auf Stadtteil-/
// Ortsebene). Ein Incident, dessen location_tag hier fehlt (z.B. ein
// künftig neu auftauchender "Stuttgart-X"-Stadtteil, den locations.py's
// Fallback-Muster erkennt, der aber noch nicht nachgetragen wurde), wird
// gezählt, aber nicht auf der Karte angezeigt -- siehe init()/excludedCount.
const LOCATION_COORDS = {
  "Bad Cannstatt": [48.8014069, 9.2168515],
  "Stuttgart-West": [48.7777680, 9.1510463],
  "Stuttgart-Ost": [48.7770307, 9.2074201],
  "Wangen": [48.7570648, 9.2594382],
  "Zuffenhausen": [48.8295258, 9.1672100],
  "Stuttgart-Mitte": [48.7759000, 9.1798000],
  "Stuttgart-Nord": [48.7964348, 9.1759471],
  "Feuerbach": [48.8135040, 9.1693064],
  "Möhringen": [48.7387737, 9.1624941],
  "Mühlhausen": [48.8485504, 9.2440422],
  "Stuttgart-Süd": [48.7529634, 9.1326287],
  "Weilimdorf": [48.8220860, 9.0944331],
  "Vaihingen": [48.7264626, 9.1131764],
  "Stuttgart": [48.7784485, 9.1800132],
  "Untertürkheim": [48.7798209, 9.2504725],
  "Ostfildern": [48.7178603, 9.2630693],
  "Freiberg": [48.8413878, 9.2088633],
  "Giebel": [48.8036730, 9.0905201],
  "Botnang": [48.7671952, 9.1120602],
  "Sillenbuch": [48.7475619, 9.2049068],
  "Hofen": [48.8377971, 9.2275765],
  "Stuttgart-Heumaden": [48.7446212, 9.2337375],
  "Stuttgart-Münster": [48.8207118, 9.2161743],
  "Fellbach": [48.8144990, 9.2745228],
  "Leinfelden-Echterdingen": [48.6901796, 9.1525725],
  "Kaltental": [48.7440535, 9.1410956],
  "Stuttgart-Neugereut": [48.8315550, 9.2311110],
  "Stuttgart-Heslach": [48.7608831, 9.1635891],
  "Stammheim": [48.8406898, 9.1598034],
  "Rot": [48.8298238, 9.1869538],
  "Remseck am Neckar": [48.8727053, 9.2735947],
  "Gerlingen": [48.7983947, 9.0624386],
  "Stuttgart-Hedelfingen": [48.7564360, 9.2526651],
  "Stuttgart-Frauenkopf": [48.7636189, 9.2057584],
  "Degerloch": [48.7065159, 9.1616187],
  // In locations.py bekannt, aber bisher (Stand 2026-07-20) ohne
  // bestätigten Incident -- schon mal mitgepflegt, damit ein künftiger
  // Fund sofort eine Kartenposition hat, ohne diese Datei anfassen zu
  // müssen.
  "Obertürkheim": [48.7617575, 9.2681173],
  "Plieningen": [48.6948398, 9.2297513],
  "Sommerrain": [48.8150747, 9.2479748],
  "Esslingen": [48.7427584, 9.3071685],
  "Ludwigsburg": [48.8953937, 9.1895147],
  "Kornwestheim": [48.8611498, 9.1873875],
  "Waiblingen": [48.8325659, 9.3163822],
};

// Sequentielle Rot-Rampe für die Häufigkeits-/Größenkodierung (dataviz-
// Skill: EINE Farbe, hell->dunkel, für Magnitude -- mit
// scripts/validate_palette.js gegen den Karten-Hintergrund (#ffffff)
// geprüft, alle Checks grün: Helligkeit monoton, Kontrast am hellen Ende
// >=2:1, Farbtonstreuung nur 8°). Größe UND Farbe kodieren dieselbe Zahl
// redundant (siehe radiusFor/colorFor), damit die Information nicht allein
// an der Farbe hängt.
const HEAT_STEPS = ["#f0a0a0", "#d95c5c", "#8f1616"];

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

// Nur http(s)-Links dürfen in href landen (gleiche Regel wie app.js).
function safeHref(url) {
  return /^https?:\/\//i.test(url) ? url : "#";
}

function sourceDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (err) {
    return url;
  }
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function colorFor(count, maxCount) {
  if (count === 0) return null;
  const t = Math.min(count / maxCount, 1);
  if (t < 0.34) return HEAT_STEPS[0];
  if (t < 0.7) return HEAT_STEPS[1];
  return HEAT_STEPS[2];
}

function radiusFor(count, maxCount) {
  if (count === 0) return 0;
  const minR = 6;
  const maxR = 26;
  const t = Math.min(count / maxCount, 1);
  return minR + t * (maxR - minR);
}

let map = null;
const markersById = {};
const zones = {}; // { tag: { lat, lon, incidents: [...] } }
let currentYear = "all";
let currentZoneId = null;
let excludedCount = 0;

function totalFor(zoneId, year) {
  if (year === "all") return zones[zoneId].incidents.length;
  return zones[zoneId].incidents.filter((i) => i.event_date.slice(0, 4) === year).length;
}

function incidentsFor(zoneId, year) {
  const all = zones[zoneId].incidents;
  if (year === "all") return all;
  return all.filter((i) => i.event_date.slice(0, 4) === year);
}

function renderIncidentCard(incident) {
  const sourcesHtml = (incident.sources || [])
    .map(
      (s, i) =>
        `<a class="source-link" href="${esc(safeHref(s.url))}" target="_blank" rel="noopener">Quelle ${i + 1}: ${esc(sourceDomain(s.url))}</a>`
    )
    .join(" · ");
  const card = document.createElement("div");
  card.className = "incident-card";
  card.innerHTML = `
    <div class="meta">
      ${esc(formatDate(incident.event_date))}${incident.event_time ? " · " + esc(incident.event_time) : ""}
      — ${esc(incident.location)}
    </div>
    <p>${esc(incident.summary || "")}</p>
    <div class="meta">${sourcesHtml}</div>
  `;
  return card;
}

function openZonePanel(zoneId) {
  currentZoneId = zoneId;
  renderPanel();
  const panel = document.getElementById("zone-detail");
  panel.hidden = false;
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderPanel() {
  if (!currentZoneId) return;
  const list = incidentsFor(currentZoneId, currentYear);
  const yearLabel = currentYear === "all" ? "insgesamt" : `im Jahr ${currentYear}`;
  document.getElementById("zone-detail-title").textContent =
    `🚩 ${currentZoneId} — ${list.length} UPSI ${yearLabel}`;

  const listEl = document.getElementById("zone-detail-list");
  listEl.innerHTML = "";
  if (list.length === 0) {
    const p = document.createElement("p");
    p.className = "zone-detail-empty";
    p.textContent = "In diesem Jahr kein Ereignis an diesem Ort.";
    listEl.appendChild(p);
    return;
  }
  list
    .slice()
    .sort((a, b) => (a.event_date < b.event_date ? 1 : -1))
    .forEach((incident) => listEl.appendChild(renderIncidentCard(incident)));
}

function renderListView(year) {
  const listViewEl = document.getElementById("list-view");
  listViewEl.innerHTML = "";
  const rows = Object.keys(zones)
    .map((id) => ({ id, count: totalFor(id, year) }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);

  if (rows.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Keine Ereignisse in diesem Jahr.";
    li.style.padding = "8px 10px";
    listViewEl.appendChild(li);
    return;
  }

  rows.forEach((row) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = row.id;
    const countSpan = document.createElement("span");
    countSpan.className = "list-view-count";
    countSpan.textContent = String(row.count);
    btn.appendChild(countSpan);
    btn.addEventListener("click", () => {
      openZonePanel(row.id);
    });
    li.appendChild(btn);
    listViewEl.appendChild(li);
  });
}

function render(year) {
  currentYear = year;
  const counts = Object.keys(zones).map((id) => totalFor(id, year));
  const maxThis = Math.max(...counts, 1);

  Object.keys(zones).forEach((id) => {
    const count = totalFor(id, year);
    const marker = markersById[id];
    if (count === 0) {
      marker.setStyle({ fillOpacity: 0, opacity: 0, radius: 1 });
      marker.unbindTooltip();
      return;
    }
    const r = radiusFor(count, maxThis);
    const fill = colorFor(count, maxThis);
    marker.setStyle({ fillOpacity: 0.8, opacity: 1, radius: r, fillColor: fill });
    const suffix =
      year === "all"
        ? count === 1
          ? "1 UPSI"
          : `${count} UPSIs insgesamt`
        : `${count} UPSI${count === 1 ? "" : "s"} (${year})`;
    if (!marker.getTooltip()) {
      marker.bindTooltip("", { direction: "top", offset: [0, -6], opacity: 1 });
    }
    marker.setTooltipContent(`🚩 ${id} — ${suffix}`);
  });

  renderListView(year);

  if (currentZoneId && !document.getElementById("zone-detail").hidden) {
    renderPanel();
  }
}

function makeTab(value, text) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "year-tab";
  btn.textContent = text;
  btn.addEventListener("click", () => {
    Array.from(document.getElementById("year-tabs").children).forEach((el) =>
      el.classList.remove("active")
    );
    btn.classList.add("active");
    render(value);
  });
  return btn;
}

async function init() {
  const mapCaption = document.getElementById("map-caption");
  let incidents;
  try {
    const res = await fetch("data/incidents.json");
    incidents = await res.json();
  } catch (err) {
    mapCaption.textContent = "Fehler beim Laden der Kartendaten.";
    return;
  }

  incidents.forEach((incident) => {
    const tag = incident.location_tag;
    const coords = LOCATION_COORDS[tag];
    if (!coords) {
      excludedCount += 1;
      return;
    }
    if (!zones[tag]) {
      zones[tag] = { lat: coords[0], lon: coords[1], incidents: [] };
    }
    zones[tag].incidents.push(incident);
  });

  map = L.map("leaflet-map", { scrollWheelZoom: false }).setView([48.7758, 9.1829], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-Mitwirkende',
  }).addTo(map);

  Object.keys(zones).forEach((id) => {
    const zone = zones[id];
    const marker = L.circleMarker([zone.lat, zone.lon], {
      radius: 1,
      color: "#101010",
      weight: 1.3,
      fillColor: HEAT_STEPS[0],
      fillOpacity: 0,
      cursor: "pointer",
    }).addTo(map);
    marker.on("click", () => {
      openZonePanel(id);
    });
    markersById[id] = marker;
  });

  const years = Array.from(new Set(incidents.map((i) => i.event_date.slice(0, 4)))).sort();

  const tabsEl = document.getElementById("year-tabs");
  tabsEl.innerHTML = "";
  const allTab = makeTab("all", "Alle Jahre");
  allTab.classList.add("active");
  tabsEl.appendChild(allTab);
  years.forEach((y) => tabsEl.appendChild(makeTab(y, y)));

  const baseCaption =
    "Die Punktgröße und -farbe zeigen die Anzahl der UPSIs am jeweiligen Ort im gewählten Jahr. Die Position ist die ungefähre Stadtteil-/Ortsmitte, KEIN straßengenaues Geokoding der tatsächlichen Unfallstelle.";
  mapCaption.textContent =
    excludedCount > 0
      ? `${baseCaption} ${excludedCount} Ereignis${excludedCount === 1 ? "" : "se"} ohne bekannte Kartenposition ${excludedCount === 1 ? "ist" : "sind"} nicht auf der Karte, aber weiterhin auf der Startseite gelistet. Klick auf einen Punkt für die Liste!`
      : `${baseCaption} Klick auf einen Punkt für die Liste!`;

  document.getElementById("zone-detail-close").addEventListener("click", () => {
    document.getElementById("zone-detail").hidden = true;
    currentZoneId = null;
  });

  render("all");
}

document.addEventListener("DOMContentLoaded", init);
