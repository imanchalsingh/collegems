/**
 * Geo helpers for bus tracking (#706) — Haversine + ETA + deviation.
 */

const EARTH_RADIUS_M = 6371000;

export function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function distanceMeters(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/**
 * ETA in minutes given distance (m) and speed (km/h).
 * Falls back to walking-bus average 25 km/h when speed is near zero.
 */
export function etaMinutes(distanceM, speedKmh) {
  const speed = speedKmh && speedKmh > 2 ? speedKmh : 25;
  const hours = distanceM / 1000 / speed;
  return Math.max(1, Math.round(hours * 60));
}

/**
 * Find nearest stop with coordinates.
 */
export function nearestStop(lat, lng, stops = []) {
  let best = null;
  for (const stop of stops) {
    if (typeof stop.lat !== "number" || typeof stop.lng !== "number") continue;
    const d = distanceMeters(lat, lng, stop.lat, stop.lng);
    if (!best || d < best.distanceM) {
      best = { stop, distanceM: d };
    }
  }
  return best;
}

/**
 * True if bus is farther than corridorRadiusM from every stop with coords
 * (simple corridor proxy when full polyline is unavailable).
 */
export function isRouteDeviated(lat, lng, stops = [], corridorRadiusM = 800) {
  const withCoords = stops.filter(
    (s) => typeof s.lat === "number" && typeof s.lng === "number"
  );
  if (!withCoords.length) return false;
  const nearest = nearestStop(lat, lng, withCoords);
  return nearest ? nearest.distanceM > corridorRadiusM : false;
}

/**
 * Stops currently inside their geo-fence (approaching / at stop).
 */
export function stopsInsideGeofence(lat, lng, stops = []) {
  return stops.filter((s) => {
    if (typeof s.lat !== "number" || typeof s.lng !== "number") return false;
    const radius = s.radiusM || 1000;
    return distanceMeters(lat, lng, s.lat, s.lng) <= radius;
  });
}
