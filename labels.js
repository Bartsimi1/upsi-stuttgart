// UPSI - Stuttgart — gemeinsame Beschriftungen, von index.html UND
// statistik.html genutzt (vor app.js bzw. statistik.js einbinden).

const EVENT_TYPE_LABELS = {
  collision: "Kollision",
  pedestrian_hit: "Fußgänger erfasst",
  derailment: "Entgleisung",
  rear_end: "Auffahrunfall",
  other: "Sonstiges",
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

const INJURIES_LABELS = {
  none: "keine Verletzten",
  minor: "leicht verletzt",
  severe: "schwer verletzt",
  fatal: "Todesfall",
  unknown: "unbekannt",
};
