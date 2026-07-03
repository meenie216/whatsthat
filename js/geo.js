// Geospatial maths: distance, bearing, elevation angle, and direction vectors.
// All angles in degrees at the public API; radians internally.

const R_EARTH = 6371008.8; // mean Earth radius, metres
// Effective radius including standard atmospheric refraction (~7/6 * R).
const R_REFRACT = R_EARTH * 7 / 6;
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export { D2R, R2D };

// Great-circle distance in metres (haversine).
export function distanceM(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * D2R;
  const dLon = (lon2 - lon1) * D2R;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * D2R) * Math.cos(lat2 * D2R) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Initial great-circle bearing from point 1 to point 2, degrees clockwise from true north (0..360).
export function bearingDeg(lat1, lon1, lat2, lon2) {
  const p1 = lat1 * D2R;
  const p2 = lat2 * D2R;
  const dl = (lon2 - lon1) * D2R;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * R2D + 360) % 360;
}

// Elevation angle (degrees) of a target above the local horizontal, accounting
// for Earth curvature and refraction. Positive = above horizon.
//   distance : great-circle distance to target (m)
//   dh       : target altitude minus observer altitude (m)
export function elevationDeg(distance, dh) {
  if (distance <= 0) return dh >= 0 ? 90 : -90;
  const drop = (distance * distance) / (2 * R_REFRACT); // how far the target sinks below flat horizon
  return Math.atan2(dh - drop, distance) * R2D;
}

// Unit direction vector in East-North-Up coordinates for a given bearing & elevation.
export function enuVector(bearing, elevation) {
  const b = bearing * D2R;
  const e = elevation * D2R;
  const ce = Math.cos(e);
  return [
    Math.sin(b) * ce, // east
    Math.cos(b) * ce, // north
    Math.sin(e),      // up
  ];
}
