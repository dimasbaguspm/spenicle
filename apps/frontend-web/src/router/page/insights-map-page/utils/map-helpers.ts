export const getPrecisionFromZoom = (zoom: number): 1 | 2 | 3 | 4 => {
  if (zoom <= 11) return 1; // World/country: 11km grids
  if (zoom <= 13) return 2; // Regional: 1.1km grids
  if (zoom <= 16) return 3; // City: 110m grids
  return 4; // Neighborhood: 11m grids
};

export const getZoomFromPrecision = (precision: 1 | 2 | 3 | 4): number => {
  const zoomMap = { 1: 9, 2: 11, 3: 14, 4: 17 };
  return zoomMap[precision];
};

/**
 * Get recommended search radius based on grid precision
 * Larger grids need larger search radius to capture meaningful data
 */
export const getRadiusFromPrecision = (precision: 1 | 2 | 3 | 4): number => {
  const radiusMap = {
    1: 20000, // 20km for world/country view (~11km grids)
    2: 10000, // 10km for regional view (~1.1km grids)
    3: 5000, // 5km for city view (~110m grids)
    4: 2000, // 2km for neighborhood view (~11m grids)
  };
  return radiusMap[precision];
};

/**
 * Normalize longitude to valid range (-180 to 180)
 * Handles map wrap-around when panning across the world
 */
export const normalizeLongitude = (lng: number): number => {
  // Normalize to -180 to 180 range
  return ((((lng + 180) % 360) + 360) % 360) - 180;
};

/**
 * Clamp latitude to valid range (-90 to 90)
 */
export const normalizeLatitude = (lat: number): number => {
  return Math.max(-90, Math.min(90, lat));
};

/**
 * Normalize both coordinates to valid ranges
 */
export const normalizeCoordinates = (
  lat: number,
  lng: number,
): { lat: number; lng: number } => {
  return {
    lat: normalizeLatitude(lat),
    lng: normalizeLongitude(lng),
  };
};

// Default fallback coordinates (Yogyakarta)
export const DEFAULT_CENTER = { lat: -7.7956, lng: 110.3695 };
