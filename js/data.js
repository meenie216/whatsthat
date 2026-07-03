// Loads the POI dataset and prepares a working set relative to the observer.

import { distanceM, bearingDeg, elevationDeg } from "./geo.js";

let ALL = [];

// POI record shape (see data/pois.sample.json):
//   { n: name, lat, lon, el: elevationMetres, pop: population, k: kind }
// kind: "city" | "town" | "landmark" | "peak"
export async function loadPois(url = "data/pois.sample.json") {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load POIs: ${res.status}`);
  ALL = await res.json();
  return ALL.length;
}

export function poiCount() {
  return ALL.length;
}

// Returns POIs within maxKm and minPopulation, each annotated with distance,
// bearing and elevation from the observer. Peaks/landmarks ignore the pop filter.
export function nearby(observer, maxKm, minPop) {
  const { lat, lon, alt } = observer;
  const maxM = maxKm * 1000;
  const out = [];

  for (const p of ALL) {
    const passesPop = p.k === "peak" || p.k === "landmark" || (p.pop ?? 0) >= minPop;
    if (!passesPop) continue;

    const dist = distanceM(lat, lon, p.lat, p.lon);
    if (dist > maxM || dist < 1) continue;

    out.push({
      poi: p,
      dist,
      bearing: bearingDeg(lat, lon, p.lat, p.lon),
      elevation: elevationDeg(dist, (p.el ?? 0) - alt),
    });
  }
  return out;
}
