// UPSI - Stuttgart — Statistik-Seite. Reines Client-Side-JS, keine
// Chart-Bibliothek (kein Drittanbieter-Nachladen, siehe Projektgrundsatz).
// Farbpalette: eigens für diese Seite geprüft (Farbenblindheit, Kontrast)
// mit scripts/validate_palette.js aus dem dataviz-Skill gegen unseren
// tatsächlichen Seitenhintergrund (#f1ead9) — nicht frei gewählt.

const PALETTE = [
  "#3d6ea5", // Navy-Blau
  "#5a7d3a", // Oliv-Grün
  "#8a4a7a", // Pflaume
  "#c99a2e", // Senfgelb
  "#1a8f7a", // Petrol
  "#b5622a", // Rost-Orange
  "#6a4a9a", // Violett
  "#a63c3c", // Ziegelrot
];
// 2026-07-18 (Nutzerauftrag + dataviz-Skill): so viele echte Kategorien wie
// PALETTE Farben hat (8) -- darüber wird zu "Übrige" gefaltet, aber NUR im
// Tortendiagramm (siehe foldForChart() weiter unten), Tabellen zeigen immer
// alles einzeln.
const MAX_SLICES = 8;
const SURFACE_COLOR = "#ffffff";
// "Übrige"-Sammelkategorie bewusst NICHT aus der normalen PALETTE (2026-07-18,
// Nutzerauftrag) -- grau + Schraffur, damit auf einen Blick klar ist, dass
// dieses Stück eine zusammengefasste Restgruppe ist, keine echte Einzel-
// kategorie. Grauton wiederverwendet von den Win95-Chrome-Elementen im
// restlichen Seitendesign (style.css: `#999999`-Rahmen), nicht neu erfunden.
const OTHER_GRAY = "#999999";
let hatchPatternCounter = 0;

let tooltipEl = null;

function ensureTooltip() {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement("div");
  tooltipEl.className = "chart-tooltip";
  tooltipEl.hidden = true;
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

function showTooltip(evt, lines) {
  const el = ensureTooltip();
  el.innerHTML = "";
  lines.forEach(([label, value], i) => {
    const row = document.createElement("div");
    row.className = "chart-tooltip-row";
    const strong = document.createElement("span");
    strong.className = "chart-tooltip-value";
    strong.textContent = value;
    const span = document.createElement("span");
    span.className = "chart-tooltip-label";
    span.textContent = label;
    row.appendChild(strong);
    row.appendChild(span);
    el.appendChild(row);
  });
  el.hidden = false;
  const x = evt.clientX + 14;
  const y = evt.clientY + 14;
  el.style.left = `${x + window.scrollX}px`;
  el.style.top = `${y + window.scrollY}px`;
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.hidden = true;
}

function fmtInt(n) {
  return n.toLocaleString("de-DE");
}

// statistik.html lädt app.js NICHT mit (siehe <script>-Tags dort) --
// eigene kleine Kopie von app.js's formatDate() statt einer Abhängigkeit
// zwischen den beiden eigentlich unabhängigen Seiten-Skripten.
function formatDateDMY(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

// Wählt eine gut lesbare Textfarbe (weiß oder dunkle Tinte) für Text
// INNERHALB einer farbigen Fläche, je nach Helligkeit der Füllung.
function textOnFill(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#0b0b0b" : "#ffffff";
}

/** Gruppiert Incidents nach `keyFn`, sortiert absteigend — VOLLSTÄNDIG,
 * keine "Übrige"-Faltung hier (2026-07-18, Nutzerauftrag: Tabellen sollen
 * IMMER jede echte Kategorie einzeln zeigen). Faltung passiert erst in
 * `foldForChart()`, nur für die Tortendiagramm-Darstellung. */
function countBy(incidents, keyFn, labelFn) {
  const counts = new Map();
  incidents.forEach((incident) => {
    const key = keyFn(incident);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: labelFn(key), count }))
    .sort((a, b) => b.count - a.count);
}

/** Faltet den Schwanz einer VOLLSTÄNDIGEN countBy()-Liste in "Übrige",
 * falls mehr als MAX_SLICES echte Kategorien vorkommen — NUR fürs
 * Tortendiagramm gedacht, Tabellen nutzen weiterhin die volle Liste.
 * MAX_SLICES = 8 (nicht 7): "Übrige" nutzt seit der Grau+Schraffur-
 * Behandlung KEINEN Platz mehr aus PALETTE (8 Farben) — alle 8 echten
 * Farben stehen jetzt für echte Kategorien zur Verfügung, siehe
 * dataviz-Skill: "A 9th series is never a generated hue — it folds into
 * Other" (die 8 Palette-Farben sind genau die Grenze, keine willkürliche
 * Zahl). */
function foldForChart(entries) {
  if (entries.length <= MAX_SLICES) return entries;
  const head = entries.slice(0, MAX_SLICES);
  const tail = entries.slice(MAX_SLICES);
  const tailCount = tail.reduce((sum, e) => sum + e.count, 0);
  return [...head, { key: "__other__", label: "Übrige", count: tailCount }];
}

// Der Durchschnitt "Zeit zwischen zwei UPSIs" bezieht sich bewusst NUR auf
// die letzten RECENT_MONTHS Monate, nicht die gesamte (noch lückenhafte)
// Historie — ältere Zeiträume sind unterschiedlich vollständig erfasst und
// würden den Durchschnitt sonst verzerren (siehe frühere ~10-Jahres-Lücke
// durch unvollständigen Backfill, keine echte unfallfreie Zeit).
const RECENT_MONTHS = 6;

function cutoffDateIso(monthsAgo) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toISOString().slice(0, 10);
}

function computeGaps(incidents) {
  const sorted = [...incidents].sort((a, b) => {
    const da = `${a.event_date}T${a.event_time || "12:00"}`;
    const db = `${b.event_date}T${b.event_time || "12:00"}`;
    return da < db ? -1 : da > db ? 1 : 0;
  });
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1].event_date}T${sorted[i - 1].event_time || "12:00"}:00`);
    const cur = new Date(`${sorted[i].event_date}T${sorted[i].event_time || "12:00"}:00`);
    const days = (cur - prev) / (1000 * 60 * 60 * 24);
    gaps.push({
      date: sorted[i].event_date,
      location: sorted[i].location,
      days: Math.max(0, days),
    });
  }
  return gaps;
}

function renderDataTable(container, headers, rows) {
  const table = document.createElement("table");
  table.className = "data-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headers.forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((cell) => {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.innerHTML = "";
  container.appendChild(table);
}

function renderPieChart(wrapEl, entries, title) {
  const total = entries.reduce((sum, e) => sum + e.count, 0);
  const size = 220;
  const r = 95;
  const cx = size / 2;
  const cy = size / 2;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", title);

  // Schraffur-Pattern für "Übrige" (2026-07-18) -- eindeutige ID pro Chart
  // noetig, da mehrere Tortendiagramme gleichzeitig auf derselben Seite
  // stehen (party/line/brand) und SVG-<pattern>-IDs global im Dokument
  // eindeutig sein muessen.
  const hatchId = `other-hatch-${hatchPatternCounter++}`;
  const defs = document.createElementNS(svgNS, "defs");
  const pattern = document.createElementNS(svgNS, "pattern");
  pattern.setAttribute("id", hatchId);
  pattern.setAttribute("width", "6");
  pattern.setAttribute("height", "6");
  pattern.setAttribute("patternTransform", "rotate(45)");
  pattern.setAttribute("patternUnits", "userSpaceOnUse");
  const hatchBg = document.createElementNS(svgNS, "rect");
  hatchBg.setAttribute("width", "6");
  hatchBg.setAttribute("height", "6");
  hatchBg.setAttribute("fill", OTHER_GRAY);
  const hatchLine = document.createElementNS(svgNS, "line");
  hatchLine.setAttribute("x1", "0");
  hatchLine.setAttribute("y1", "0");
  hatchLine.setAttribute("x2", "0");
  hatchLine.setAttribute("y2", "6");
  hatchLine.setAttribute("stroke", "#c9c8c0");
  hatchLine.setAttribute("stroke-width", "2");
  pattern.appendChild(hatchBg);
  pattern.appendChild(hatchLine);
  defs.appendChild(pattern);
  svg.appendChild(defs);

  let angle = -Math.PI / 2; // 12-Uhr-Position als Start
  const legend = document.createElement("div");
  legend.className = "chart-legend";

  entries.forEach((entry, i) => {
    const isOther = entry.key === "__other__";
    const color = isOther ? OTHER_GRAY : PALETTE[i % PALETTE.length];
    const fillValue = isOther ? `url(#${hatchId})` : color;
    const fraction = total > 0 ? entry.count / total : 0;
    const sweep = fraction * 2 * Math.PI;
    const a0 = angle;
    const a1 = angle + sweep;
    angle = a1;

    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const largeArc = sweep > Math.PI ? 1 : 0;

    const path = document.createElementNS(svgNS, "path");
    const d = fraction >= 0.999
      ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
      : `M ${cx},${cy} L ${x0},${y0} A ${r},${r} 0 ${largeArc} 1 ${x1},${y1} Z`;
    path.setAttribute("d", d);
    path.setAttribute("fill", fillValue);
    path.setAttribute("stroke", SURFACE_COLOR);
    path.setAttribute("stroke-width", "2");
    path.style.cursor = "pointer";
    path.setAttribute("tabindex", "0");
    path.setAttribute("role", "button");
    const pct = (fraction * 100).toFixed(1).replace(".", ",");
    path.setAttribute("aria-label", `${entry.label}: ${entry.count} (${pct}%)`);

    const onEnter = (evt) => {
      path.setAttribute("opacity", "0.8");
      showTooltip(evt, [[entry.label, `${entry.count} (${pct}%)`]]);
    };
    const onMove = (evt) => showTooltip(evt, [[entry.label, `${entry.count} (${pct}%)`]]);
    const onLeave = () => {
      path.setAttribute("opacity", "1");
      hideTooltip();
    };
    path.addEventListener("pointerenter", onEnter);
    path.addEventListener("pointermove", onMove);
    path.addEventListener("pointerleave", onLeave);
    path.addEventListener("focus", onEnter);
    path.addEventListener("blur", onLeave);

    svg.appendChild(path);

    // Direktbeschriftung nur bei Segmenten, die groß genug sind (>= 8%),
    // sonst uebernimmt die Legende/Tooltip die Beschriftung.
    if (fraction >= 0.08) {
      const midAngle = (a0 + a1) / 2;
      const labelX = cx + r * 0.62 * Math.cos(midAngle);
      const labelY = cy + r * 0.62 * Math.sin(midAngle);
      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("x", labelX);
      text.setAttribute("y", labelY);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("fill", textOnFill(color));
      text.setAttribute("font-size", "12");
      text.setAttribute("font-weight", "bold");
      text.style.pointerEvents = "none";
      text.textContent = `${pct}%`;
      svg.appendChild(text);
    }

    const legendItem = document.createElement("div");
    legendItem.className = "chart-legend-item";
    const swatch = document.createElement("span");
    swatch.className = "chart-legend-swatch";
    // Legenden-Swatch bekommt dieselbe Schraffur-Optik wie das Tortenstück
    // (CSS-Streifen statt SVG-<pattern>, da hier ein HTML-<span> statt SVG).
    swatch.style.background = isOther
      ? `repeating-linear-gradient(45deg, ${OTHER_GRAY}, ${OTHER_GRAY} 2px, #c9c8c0 2px, #c9c8c0 4px)`
      : color;
    const label = document.createElement("span");
    label.textContent = `${entry.label} (${pct}%)`;
    legendItem.appendChild(swatch);
    legendItem.appendChild(label);
    legend.appendChild(legendItem);
  });

  const chartRow = document.createElement("div");
  chartRow.className = "chart-row";
  chartRow.appendChild(svg);
  chartRow.appendChild(legend);

  wrapEl.innerHTML = "";
  wrapEl.appendChild(chartRow);
}

function renderGapBarChart(wrapEl, gaps) {
  if (gaps.length === 0) {
    wrapEl.innerHTML = "<p>Noch nicht genug Daten für einen Verlauf.</p>";
    return;
  }
  const width = Math.max(320, gaps.length * 26);
  const height = 160;
  // padBottom/padTop vergrößert (2026-07-18, Nutzerauftrag), um Platz für
  // permanente Beschriftungen zu schaffen: Tage-Zahl über jedem Balken
  // (padTop) und volles Datum unter dem ersten/letzten Balken (padBottom).
  const padBottom = 34;
  const padTop = 22;
  const maxDays = Math.max(...gaps.map((g) => g.days), 1);
  const barW = 16;
  const gap = 10;
  const color = PALETTE[0];

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Tage zwischen aufeinanderfolgenden UPSIs, im Zeitverlauf");

  const baseline = document.createElementNS(svgNS, "line");
  baseline.setAttribute("x1", "0");
  baseline.setAttribute("x2", width);
  baseline.setAttribute("y1", height - padBottom);
  baseline.setAttribute("y2", height - padBottom);
  baseline.setAttribute("stroke", "#c3c2b7");
  baseline.setAttribute("stroke-width", "1");
  svg.appendChild(baseline);

  gaps.forEach((g, i) => {
    const x = i * (barW + gap) + gap / 2;
    const barH = ((height - padBottom - padTop) * g.days) / maxDays;
    const y = height - padBottom - barH;

    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", barW);
    rect.setAttribute("height", Math.max(barH, 1));
    rect.setAttribute("rx", "3");
    rect.setAttribute("fill", color);
    rect.style.cursor = "pointer";
    rect.setAttribute("tabindex", "0");
    rect.setAttribute("role", "button");
    const daysLabel = g.days.toFixed(1).replace(".", ",");
    rect.setAttribute("aria-label", `${g.date}: ${daysLabel} Tage seit dem vorherigen UPSI`);

    const onEnter = (evt) => {
      rect.setAttribute("opacity", "0.75");
      showTooltip(evt, [[`${g.date} — ${g.location}`, `${daysLabel} Tage`]]);
    };
    const onMove = (evt) => showTooltip(evt, [[`${g.date} — ${g.location}`, `${daysLabel} Tage`]]);
    const onLeave = () => {
      rect.setAttribute("opacity", "1");
      hideTooltip();
    };
    rect.addEventListener("pointerenter", onEnter);
    rect.addEventListener("pointermove", onMove);
    rect.addEventListener("pointerleave", onLeave);
    rect.addEventListener("focus", onEnter);
    rect.addEventListener("blur", onLeave);

    svg.appendChild(rect);

    // Tage-Zahl permanent ÜBER jedem Balken (2026-07-18, Nutzerauftrag) --
    // vorher nur im Tooltip beim Hovern sichtbar.
    const dayLabel = document.createElementNS(svgNS, "text");
    dayLabel.setAttribute("x", x + barW / 2);
    dayLabel.setAttribute("y", y - 4);
    dayLabel.setAttribute("text-anchor", "middle");
    dayLabel.setAttribute("font-size", "9");
    dayLabel.setAttribute("fill", "#5a5a52");
    dayLabel.textContent = g.days.toFixed(0);
    svg.appendChild(dayLabel);

    // NUR erster und letzter Balken bekommen ein volles Datum (2026-07-18,
    // Nutzerauftrag) -- weniger visuelles Rauschen bei vielen Balken.
    // Randbündig statt zentriert, damit die Beschriftung nicht über den
    // linken/rechten Rand des Diagramms hinausragt.
    if (i === 0 || i === gaps.length - 1) {
      const dateLabel = document.createElementNS(svgNS, "text");
      dateLabel.setAttribute("x", i === 0 ? x : x + barW);
      dateLabel.setAttribute("y", height - padBottom + 14);
      dateLabel.setAttribute("text-anchor", i === 0 ? "start" : "end");
      dateLabel.setAttribute("font-size", "9");
      dateLabel.setAttribute("fill", "#5a5a52");
      dateLabel.textContent = formatDateDMY(g.date);
      svg.appendChild(dateLabel);
    }
  });

  const scrollWrap = document.createElement("div");
  scrollWrap.className = "chart-scroll";
  scrollWrap.appendChild(svg);

  const caption = document.createElement("div");
  caption.className = "chart-caption";
  caption.textContent = "Jeder Balken: Abstand (in Tagen) zum jeweils vorherigen UPSI, chronologisch.";

  wrapEl.innerHTML = "";
  wrapEl.appendChild(scrollWrap);
  wrapEl.appendChild(caption);
}

function wireTableToggle(button) {
  button.addEventListener("click", () => {
    const target = document.getElementById(button.dataset.target);
    if (!target) return;
    const nowHidden = !target.hidden;
    target.hidden = nowHidden;
    button.textContent = nowHidden ? "Als Tabelle anzeigen" : "Tabelle ausblenden";
  });
}

async function init() {
  let incidents = [];
  try {
    const res = await fetch("data/incidents.json");
    incidents = await res.json();
  } catch (err) {
    document.querySelectorAll(".chart-loading").forEach((el) => {
      el.textContent = "Fehler beim Laden der Daten.";
    });
    return;
  }

  // 1) Zeit zwischen zwei UPSIs — Basis: nur die letzten RECENT_MONTHS Monate
  // (siehe Kommentar bei RECENT_MONTHS), nicht die gesamte Historie.
  const cutoff = cutoffDateIso(RECENT_MONTHS);
  const recentIncidents = incidents.filter((i) => i.event_date >= cutoff);
  const gaps = computeGaps(recentIncidents);
  const avgDays = gaps.length > 0 ? gaps.reduce((s, g) => s + g.days, 0) / gaps.length : 0;
  document.getElementById("gap-average").textContent = gaps.length > 0
    ? avgDays.toFixed(1).replace(".", ",")
    : "–";
  const note = document.createElement("div");
  note.className = "hero-note";
  note.textContent = `Basis: die letzten ${RECENT_MONTHS} Monate (${recentIncidents.length} UPSIs) — `
    + `ältere Zeiträume sind unterschiedlich vollständig erfasst und würden den `
    + `Durchschnitt verzerren.`;
  document.getElementById("gap-stat").insertBefore(note, document.getElementById("gap-chart-wrap"));
  renderGapBarChart(document.getElementById("gap-chart-wrap"), gaps);
  renderDataTable(
    document.getElementById("gap-table"),
    ["Datum", "Ort", "Tage seit vorherigem UPSI"],
    // Neueste zuerst (2026-07-18, Nutzerauftrag) -- `gaps` selbst bleibt
    // chronologisch aufsteigend (wird von renderGapBarChart gebraucht,
    // damit der neueste Balken ganz rechts landet), hier nur fürs
    // Tabellen-Rendering umgekehrt.
    [...gaps].reverse().map((g) => [g.date, g.location, g.days.toFixed(1).replace(".", ",")])
  );

  // 2) Gegenpartei-Verteilung — Tabelle zeigt IMMER alle echten Kategorien
  // (2026-07-18, Nutzerauftrag), nur das Tortendiagramm faltet ab MAX_SLICES.
  const partyEntries = countBy(
    incidents,
    (i) => i.other_party,
    (key) => OTHER_PARTY_LABELS[key] || key
  );
  renderPieChart(document.getElementById("party-chart-wrap"), foldForChart(partyEntries), "Verteilung der Gegenpartei");
  renderDataTable(
    document.getElementById("party-table"),
    ["Gegenpartei", "Anzahl", "Anteil"],
    partyEntries.map((e) => [e.label, fmtInt(e.count), `${((e.count / incidents.length) * 100).toFixed(1).replace(".", ",")}%`])
  );

  // 3) Linien-Verteilung
  const lineEntries = countBy(
    incidents,
    (i) => i.line_tag,
    (key) => key
  );
  renderPieChart(document.getElementById("line-chart-wrap"), foldForChart(lineEntries), "Unfälle nach Stadtbahnlinie");
  renderDataTable(
    document.getElementById("line-table"),
    ["Linie", "Anzahl", "Anteil"],
    lineEntries.map((e) => [e.label, fmtInt(e.count), `${((e.count / incidents.length) * 100).toFixed(1).replace(".", ",")}%`])
  );

  // 4) PKW-Marken-Verteilung — NUR Incidents mit other_party "car" UND einer
  // im Text erkannten Marke (car_brand_tag, siehe car_brands.py). Fälle ohne
  // erkennbare Marke fließen bewusst NICHT als "unbekannt"-Segment ein,
  // sondern werden komplett ausgeschlossen (Nutzeranweisung: "nur wenn wir
  // die Marke kennen").
  const carIncidents = incidents.filter((i) => i.other_party === "car");
  const brandedCarIncidents = carIncidents.filter((i) => i.car_brand_tag);
  document.getElementById("brand-note").textContent =
    `Basis: ${brandedCarIncidents.length} von ${carIncidents.length} PKW-Unfällen, `
    + `bei denen im Berichtstext eine Marke genannt wurde — die übrigen `
    + `${carIncidents.length - brandedCarIncidents.length} ohne erkennbare Marke sind hier nicht enthalten.`;
  const brandEntries = countBy(
    brandedCarIncidents,
    (i) => i.car_brand_tag,
    (key) => key
  );
  renderPieChart(document.getElementById("brand-chart-wrap"), foldForChart(brandEntries), "Verteilung der PKW-Marken");
  renderDataTable(
    document.getElementById("brand-table"),
    ["Marke", "Anzahl", "Anteil"],
    brandEntries.map((e) => [e.label, fmtInt(e.count), `${((e.count / brandedCarIncidents.length) * 100).toFixed(1).replace(".", ",")}%`])
  );

  document.querySelectorAll(".table-toggle").forEach(wireTableToggle);
}

document.addEventListener("DOMContentLoaded", init);
