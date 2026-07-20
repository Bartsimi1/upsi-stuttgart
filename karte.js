// UPSI - Stuttgart — Karte-Seite. Leaflet (vendor/leaflet/, kein CDN,
// gleiche "kein Drittanbieter-Nachladen"-Regel wie beim Rest der Seite) +
// echte OpenStreetMap-Kacheln (einzige akzeptierte Ausnahme -- eine Karte
// ohne echte Kartenkacheln ist keine Karte).
//
// 2026-07-20 (Nutzerauftrag): straßen-/kreuzungsgenaue Positionen statt nur
// Stadtteil-Mittelpunkt -- siehe src/upsi/geocode.py für die Auflösung.
// Jeder Incident hat jetzt (wenn auflösbar) sein eigenes `lat`/`lon`.
//
// 2026-07-20 später (Nutzerauftrag, Meinungsänderung): KEIN Verschmelzen
// mehr, auf keiner Zoomstufe -- weder verschiedene, nah beieinander
// liegende Orte zu einem größeren Blob (das machte vorher
// Leaflet.markercluster, jetzt komplett entfernt), NOCH mehrere Incidents
// an EXAKT demselben Ort zu einem einzigen größenskalierten Punkt (das war
// bis eben das eigene Zonen-Modell hier). Jeder Incident bekommt jetzt
// seinen eigenen, dauerhaft sichtbaren Punkt; Punkte am selben Ort werden
// per fester PIXEL-Distanz auseinandergezogen ("spiderfy" -- derselbe
// Begriff/dieselbe Kreis-/Spiralformel wie in Leaflet.markercluster, hier
// aber DAUERHAFT aktiv statt nur nach Klick, und auf jeder Zoomstufe neu
// berechnet, damit der Pixel-Abstand nie schrumpft, egal wie weit man
// rauszoomt). Klick auf einen der aufgefächerten Punkte öffnet weiterhin
// dieselbe Orts-Liste wie vorher (unverändertes Panel-Verhalten).
//
// LOCATION_COORDS: von Hand kuratierte, per Nominatim/OpenStreetMap
// geokodierte NÄHERUNGSWERTE für den Mittelpunkt jedes bekannten Orts/
// Stadtteils -- reiner RÜCKFALL für die (kleine, schrumpfende) Minderheit
// an Incidents, deren location-Text sich nicht auflösen lässt (kein
// Straßenname, keine erkennbare Linie). Ein Incident, dessen location_tag
// selbst hier fehlt, wird gezählt, aber nicht auf der Karte angezeigt --
// siehe init()/excludedCount.
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
  "Obertürkheim": [48.7617575, 9.2681173],
  "Plieningen": [48.6948398, 9.2297513],
  "Sommerrain": [48.8150747, 9.2479748],
  "Esslingen": [48.7427584, 9.3071685],
  "Ludwigsburg": [48.8953937, 9.1895147],
  "Kornwestheim": [48.8611498, 9.1873875],
  "Waiblingen": [48.8325659, 9.3163822],
};

// Einheitlicher Punkt für jeden einzelnen Incident (kein Größen-/Farb-
// Mapping mehr auf eine Anzahl -- jeder Punkt IST bereits genau 1 UPSI,
// die Menge ist direkt an der Anzahl sichtbarer Punkte ablesbar).
const MARKER_DIAMETER = 11;
const MARKER_COLOR = "#b23a3a";

// Spiderfy-Konstanten (Kreis für kleine Gruppen, Spirale für große --
// dieselbe Grundformel wie Leaflet.markercluster's _generatePointsCircle/
// _generatePointsSpiral, hier aber dauerhaft statt nur nach Klick
// angewendet). Alle Werte in Bildschirm-Pixeln, NICHT in Grad -- das ist
// der Punkt: der Abstand bleibt exakt gleich groß, egal welche Zoomstufe.
const SPIDERFY_CIRCLE_SWITCHOVER = 8; // ab dieser Anzahl: Spirale statt Kreis
const SPIDERFY_CIRCLE_FOOT_SEPARATION = 24;
const SPIDERFY_CIRCLE_START_ANGLE = Math.PI / 6;
const SPIDERFY_CIRCLE_MIN_RADIUS = 26;
const SPIDERFY_SPIRAL_FOOT_SEPARATION = 26;
const SPIDERFY_SPIRAL_LENGTH_START = 14;
const SPIDERFY_SPIRAL_LENGTH_FACTOR = 4;

function spiderfyOffsets(count) {
  if (count <= 1) return [[0, 0]];

  if (count < SPIDERFY_CIRCLE_SWITCHOVER) {
    const circumference = SPIDERFY_CIRCLE_FOOT_SEPARATION * (2 + count);
    const legLength = Math.max(circumference / (Math.PI * 2), SPIDERFY_CIRCLE_MIN_RADIUS);
    const angleStep = (Math.PI * 2) / count;
    const offsets = [];
    for (let i = 0; i < count; i++) {
      const angle = SPIDERFY_CIRCLE_START_ANGLE + i * angleStep;
      offsets.push([legLength * Math.cos(angle), legLength * Math.sin(angle)]);
    }
    return offsets;
  }

  // Fermat-Spirale: wächst nach außen, damit sich auch viele Punkte am
  // selben Ort (z. B. eine unfallträchtige Kreuzung) nicht überlappen.
  const offsets = new Array(count);
  let legLength = SPIDERFY_SPIRAL_LENGTH_START;
  let angle = 0;
  for (let i = count - 1; i >= 0; i--) {
    angle += SPIDERFY_SPIRAL_FOOT_SEPARATION / legLength + i * 0.0005;
    offsets[i] = [legLength * Math.cos(angle), legLength * Math.sin(angle)];
    legLength += (Math.PI * 2 * SPIDERFY_SPIRAL_LENGTH_FACTOR) / angle;
  }
  return offsets;
}

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

function makeIncidentIcon() {
  const html = `<div class="upsi-marker" style="width:${MARKER_DIAMETER}px;height:${MARKER_DIAMETER}px;background:${MARKER_COLOR};"></div>`;
  return L.divIcon({
    html,
    className: "upsi-marker-wrap",
    iconSize: [MARKER_DIAMETER, MARKER_DIAMETER],
    iconAnchor: [MARKER_DIAMETER / 2, MARKER_DIAMETER / 2],
  });
}

let map = null;
let markerLayer = null;
const zones = {}; // { zoneId: { lat, lon, incidents: [...] } }
const districts = {}; // { location_tag: [incident, ...] } -- nur für die Text-Liste
let currentYear = "all";
let currentZoneId = null;
let excludedCount = 0;
let visibleZoneMarkers = {}; // { zoneId: [L.marker, ...] } -- nur die gerade sichtbaren, für Spiderfy-Neuberechnung bei Zoom

function totalFor(zoneId, year) {
  if (year === "all") return zones[zoneId].incidents.length;
  return zones[zoneId].incidents.filter((i) => i.event_date.slice(0, 4) === year).length;
}

function incidentsFor(zoneId, year) {
  const all = zones[zoneId].incidents;
  if (year === "all") return all;
  return all.filter((i) => i.event_date.slice(0, 4) === year);
}

function districtTotalFor(tag, year) {
  if (year === "all") return districts[tag].length;
  return districts[tag].filter((i) => i.event_date.slice(0, 4) === year).length;
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

function zoneLabel(zoneId) {
  // Der erste Incident an diesem Ort liefert einen sprechenden Namen für
  // den Panel-Titel (echte Adresse statt Koordinaten-Schlüssel).
  const first = zones[zoneId].incidents[0];
  return first ? first.location : zoneId;
}

function renderPanel() {
  if (!currentZoneId) return;
  const list = incidentsFor(currentZoneId, currentYear);
  const yearLabel = currentYear === "all" ? "insgesamt" : `im Jahr ${currentYear}`;
  document.getElementById("zone-detail-title").textContent =
    `🚩 ${zoneLabel(currentZoneId)} — ${list.length} UPSI ${yearLabel}`;

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
  const rows = Object.keys(districts)
    .map((tag) => ({ tag, count: districtTotalFor(tag, year) }))
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
    const span = document.createElement("span");
    span.style.display = "block";
    span.style.padding = "6px 10px";
    const countSpan = document.createElement("span");
    countSpan.className = "list-view-count";
    countSpan.textContent = String(row.count);
    span.textContent = row.tag + " ";
    span.appendChild(countSpan);
    li.appendChild(span);
    listViewEl.appendChild(li);
  });
}

// Setzt für jede sichtbare Gruppe die tatsächlichen Marker-Positionen neu
// -- Mittelpunkt in Bildschirm-Pixel umrechnen, festen Pixel-Versatz pro
// Marker addieren, zurück in lat/lon umrechnen. Muss bei jeder
// Zoomänderung erneut laufen, weil sich sonst der Pixel-Abstand (nicht
// der Grad-Abstand!) verändern würde -- genau das soll laut Nutzerauftrag
// NICHT passieren, die Punkte sollen auf JEDER Zoomstufe gleich weit
// auseinander bleiben.
function repositionMarkers() {
  Object.keys(visibleZoneMarkers).forEach((zoneId) => {
    const markers = visibleZoneMarkers[zoneId];
    const zone = zones[zoneId];
    if (markers.length === 1) {
      markers[0].setLatLng([zone.lat, zone.lon]);
      return;
    }
    const centerPt = map.latLngToLayerPoint([zone.lat, zone.lon]);
    const offsets = spiderfyOffsets(markers.length);
    markers.forEach((marker, i) => {
      const pt = centerPt.add(L.point(offsets[i][0], offsets[i][1]));
      marker.setLatLng(map.layerPointToLatLng(pt));
    });
  });
}

function render(year) {
  currentYear = year;

  markerLayer.clearLayers();
  visibleZoneMarkers = {};

  Object.keys(zones).forEach((zoneId) => {
    const list = incidentsFor(zoneId, year);
    if (list.length === 0) return;

    const markers = list.map((incident) => {
      const marker = L.marker([zones[zoneId].lat, zones[zoneId].lon], { icon: makeIncidentIcon() });
      marker.bindTooltip(
        `🚩 ${esc(formatDate(incident.event_date))} — ${esc(incident.location)}`,
        { direction: "top", offset: [0, -6], opacity: 1 }
      );
      marker.on("click", () => openZonePanel(zoneId));
      marker.addTo(markerLayer);
      return marker;
    });
    visibleZoneMarkers[zoneId] = markers;
  });

  repositionMarkers();
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
    if (!districts[tag]) districts[tag] = [];
    districts[tag].push(incident);

    let zoneId, lat, lon;
    if (incident.lat != null && incident.lon != null) {
      lat = incident.lat;
      lon = incident.lon;
      // Auf ~1m genau gerundet -- Incidents, die auf denselben realen Ort
      // aufgelöst wurden, landen garantiert im selben Zonen-Schlüssel, auch
      // bei minimalen Fließkomma-Abweichungen zwischen Läufen.
      zoneId = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    } else {
      const coords = LOCATION_COORDS[tag];
      if (!coords) {
        excludedCount += 1;
        return;
      }
      lat = coords[0];
      lon = coords[1];
      zoneId = `tag:${tag}`;
    }

    if (!zones[zoneId]) {
      zones[zoneId] = { lat, lon, incidents: [] };
    }
    zones[zoneId].incidents.push(incident);
  });

  map = L.map("leaflet-map", { scrollWheelZoom: false }).setView([48.7758, 9.1829], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-Mitwirkende',
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);
  map.on("zoomend", repositionMarkers);

  const years = Array.from(new Set(incidents.map((i) => i.event_date.slice(0, 4)))).sort();

  const tabsEl = document.getElementById("year-tabs");
  tabsEl.innerHTML = "";
  const allTab = makeTab("all", "Alle Jahre");
  allTab.classList.add("active");
  tabsEl.appendChild(allTab);
  years.forEach((y) => tabsEl.appendChild(makeTab(y, y)));

  const baseCaption =
    "Jeder Punkt ist genau 1 UPSI -- Punkte verschmelzen nie zu einem größeren Blob, auch nicht beim Rauszoomen. Ereignisse am exakt selben Ort (z. B. derselben Kreuzung) fächern sich stattdessen sichtbar auf. Wo möglich zeigt die Position die tatsächliche Kreuzung/Straße (automatisch geokodiert + auf die Stadtbahn-Strecke eingerastet, KEINE vermessene Position); ohne Straßenangabe im Text bleibt es bei der Stadtteil-Mitte.";
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
