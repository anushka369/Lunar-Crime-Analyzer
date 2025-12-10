export function isValidLatitude(lat: number): boolean {
  return !isNaN(lat) && isFinite(lat) && lat >= -90 && lat <= 90;
}

export function isValidLongitude(lng: number): boolean {
  return !isNaN(lng) && isFinite(lng) && lng >= -180 && lng <= 180;
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  return isValidLatitude(lat) && isValidLongitude(lng);
}