import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  PermissionStatus,
  GeolocationCoordinates,
  GeolocationError,
  CaptureOptions,
} from "./types";
import {
  isPermissionsAPISupported,
  queryPermissionStatus,
  getPermissionFlags,
} from "./helpers";
import {
  isGeolocationSupported,
  captureGeolocation,
} from "./helpers/geolocation";

export const useGeolocation = () => {
  const [status, setStatus] = useState<PermissionStatus>('prompt');
  const [coordinates, setCoordinates] = useState<GeolocationCoordinates | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize permission status and capture location on mount
  useEffect(() => {
    if (!isGeolocationSupported()) {
      setStatus('unavailable');
      setIsInitializing(false);
      return;
    }

    const initGeolocation = async () => {
      // Check permission status first
      const permissionStatus = await queryPermissionStatus('geolocation');
      setStatus(permissionStatus);

      // Proactively capture location if granted or prompt
      // This ensures coordinates are ready before user needs them
      if (permissionStatus === 'granted' || permissionStatus === 'prompt') {
        try {
          const coords = await captureGeolocation({ silent: true });
          setCoordinates(coords);
          setStatus('granted');
        } catch (err) {
          const geoError = err as GeolocationError;
          // Update status based on error code
          if (geoError.code === 1) {
            setStatus('denied');
          }
          // Don't set error during initialization (silent mode)
        }
      }

      setIsInitializing(false);
    };

    initGeolocation();

    // Listen for permission changes (if supported)
    if (isPermissionsAPISupported()) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        const handleChange = () => {
          setStatus(result.state as PermissionStatus);
        };
        result.addEventListener('change', handleChange);
      }).catch(() => {
        // Ignore if permissions API query fails
      });
    }
  }, []);

  const captureLocation = useCallback(
    async (options?: CaptureOptions): Promise<GeolocationCoordinates> => {
      setIsCapturing(true);
      setError(null);

      try {
        const coords = await captureGeolocation(options);
        setCoordinates(coords);
        setStatus('granted');
        setIsCapturing(false);
        return coords;
      } catch (err) {
        const geoError = err as GeolocationError;

        if (!options?.silent) {
          setError(geoError);
        }

        // Update status based on error code
        if (geoError.code === 1) {
          setStatus('denied');
        }

        setIsCapturing(false);
        throw geoError;
      }
    },
    []
  );

  const clearLocation = useCallback(() => {
    setCoordinates(null);
    setError(null);
  }, []);

  const getCoordinates = useCallback((): { latitude?: number; longitude?: number } => {
    // Return cached coordinates instantly (no async wait)
    // Coordinates are already captured during initialization
    if (coordinates) {
      return {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      };
    }

    // Return undefined if no coordinates available
    return {
      latitude: undefined,
      longitude: undefined,
    };
  }, [coordinates]);

  // Use reusable pattern for permission flags
  const flags = useMemo(() => getPermissionFlags(status), [status]);

  return {
    status,
    coordinates,
    error,
    isCapturing,
    isInitializing,
    ...flags, // isGranted, isDenied, isPrompt, isUnavailable
    captureLocation,
    clearLocation,
    getCoordinates,
  };
};
