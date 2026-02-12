/**
 * Check if Geolocation API is supported by the browser
 */
export const isGeolocationSupported = (): boolean => {
  return 'geolocation' in navigator;
};

/**
 * Capture geolocation coordinates
 */
export const captureGeolocation = async (options?: {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  silent?: boolean;
}): Promise<{
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}> => {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject({
        code: 0,
        message: 'Geolocation is not supported by this browser',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        reject({
          code: error.code,
          message: error.message,
        });
      },
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 0,
      }
    );
  });
};
