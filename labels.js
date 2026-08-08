// UPSI - Stuttgart — gemeinsame Beschriftungen, von index.html UND
// statistik.html genutzt (vor app.js bzw. statistik.js einbinden).
// *_EN-Varianten (2026-08-08): feste, kurze Vokabeln -- werden bei
// aktivierter Sprachumschaltung (strings.js) statt der DE-Maps genutzt.
// Freitext (incident.summary/location) bleibt bewusst unübersetzt, siehe
// strings.js-Kommentar.

const EVENT_TYPE_LABELS = {
  collision: "Kollision",
  pedestrian_hit: "Fußgänger erfasst",
  derailment: "Entgleisung",
  rear_end: "Auffahrunfall",
  other: "Sonstiges",
};

const EVENT_TYPE_LABELS_EN = {
  collision: "Collision",
  pedestrian_hit: "Pedestrian struck",
  derailment: "Derailment",
  rear_end: "Rear-end collision",
  other: "Other",
};

const OTHER_PARTY_LABELS = {
  car: "PKW",
  van: "Transporter",
  pedestrian: "Fußgänger",
  cyclist: "Fahrrad",
  e_scooter: "E-Scooter",
  motorcycle: "Motorrad",
  truck: "LKW",
  bus: "Bus",
  other_tram: "andere Stadtbahn",
  train: "Zug",
  other: "Sonstiges",
  unknown: "unbekannt",
  none: "kein Unfallgegner (Alleinunfall)",
};

const OTHER_PARTY_LABELS_EN = {
  car: "Car",
  van: "Van",
  pedestrian: "Pedestrian",
  cyclist: "Bicycle",
  e_scooter: "E-scooter",
  motorcycle: "Motorcycle",
  truck: "Truck",
  bus: "Bus",
  other_tram: "Other tram",
  train: "Train",
  other: "Other",
  unknown: "unknown",
  none: "no other party (solo accident)",
};

const INJURIES_LABELS = {
  none: "keine Verletzten",
  minor: "leicht verletzt",
  severe: "schwer verletzt",
  fatal: "Todesfall",
  unknown: "unbekannt",
};

const INJURIES_LABELS_EN = {
  none: "no injuries",
  minor: "minor injuries",
  severe: "severe injuries",
  fatal: "fatality",
  unknown: "unknown",
};
