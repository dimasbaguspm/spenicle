export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unavailable';

export interface PermissionStatusFlags {
  isGranted: boolean;
  isDenied: boolean;
  isPrompt: boolean;
  isUnavailable: boolean;
}

export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

export interface CaptureOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  silent?: boolean;
}

export interface WebAPIProviderModel {
  geolocation: {
    status: PermissionStatus;
    coordinates: GeolocationCoordinates | null;
    error: GeolocationError | null;
    isCapturing: boolean;
    isInitializing: boolean;
    captureLocation: (options?: CaptureOptions) => Promise<GeolocationCoordinates>;
    clearLocation: () => void;
    getCoordinates: () => { latitude?: number; longitude?: number };
  } & PermissionStatusFlags;
}
