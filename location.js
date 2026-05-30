const OFFICE_LAT = 13.736717;
const OFFICE_LNG = 100.523186;
const MAX_DISTANCE_M = 50;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function validateLocation(lat, lng) {
  const dist = haversine(lat, lng, OFFICE_LAT, OFFICE_LNG);
  return {
    valid: dist <= MAX_DISTANCE_M,
    distance: Math.round(dist),
    maxDistance: MAX_DISTANCE_M,
  };
}

module.exports = { OFFICE_LAT, OFFICE_LNG, MAX_DISTANCE_M, validateLocation };
