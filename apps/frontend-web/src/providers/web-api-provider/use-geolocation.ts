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

interface GeolocationState {
  status: PermissionStatus;
  coordinates: GeolocationCoordinates | null;
  error: GeolocationError | null;
  isCapturing: boolean;
  isInitializing: boolean;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    status: "prompt",
    coordinates: null,
    error: null,
    isCapturing: false,
    isInitializing: true,
  });

  // Initialize permission status and capture location on mount
  useEffect(() => {
    if (!isGeolocationSupported()) {
      setState((prev) => ({
        ...prev,
        status: "unavailable",
        isInitializing: false,
      }));
      return;
    }

    let permissionListener: (() => void) | null = null;

    const initGeolocation = async () => {
      const permissionStatus = await queryPermissionStatus("geolocation");

      // Proactively capture location if granted or prompt
      // This ensures coordinates are ready before user needs them
      if (permissionStatus === "granted" || permissionStatus === "prompt") {
        try {
          const coords = await captureGeolocation({ silent: true });
          setState((prev) => ({
            ...prev,
            status: "granted",
            coordinates: coords,
            isInitializing: false,
          }));
        } catch (err) {
          const geoError = err as GeolocationError;
          setState((prev) => ({
            ...prev,
            status: geoError.code === 1 ? "denied" : permissionStatus,
            isInitializing: false,
          }));
        }
      } else {
        setState((prev) => ({
          ...prev,
          status: permissionStatus,
          isInitializing: false,
        }));
      }
    };

    initGeolocation();

    if (isPermissionsAPISupported()) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          const handleChange = () => {
            setState((prev) => ({
              ...prev,
              status: result.state as PermissionStatus,
            }));
          };
          result.addEventListener("change", handleChange);
          permissionListener = () =>
            result.removeEventListener("change", handleChange);
        })
        .catch(() => {
          // Ignore if permissions API query fails
        });
    }

    return () => {
      permissionListener?.();
    };
  }, []);

  const captureLocation = useCallback(
    async (options?: CaptureOptions): Promise<GeolocationCoordinates> => {
      setState((prev) => ({ ...prev, isCapturing: true, error: null }));

      try {
        const coords = await captureGeolocation(options);
        setState((prev) => ({
          ...prev,
          coordinates: coords,
          status: "granted",
          isCapturing: false,
        }));
        return coords;
      } catch (err) {
        const geoError = err as GeolocationError;
        setState((prev) => ({
          ...prev,
          error: options?.silent ? prev.error : geoError,
          status: geoError.code === 1 ? "denied" : prev.status,
          isCapturing: false,
        }));
        throw geoError;
      }
    },
    [],
  );

  const clearLocation = useCallback(() => {
    setState((prev) => ({ ...prev, coordinates: null, error: null }));
  }, []);

  const getCoordinates = useCallback((): {
    latitude?: number;
    longitude?: number;
  } => {
    return {
      latitude: state.coordinates?.latitude,
      longitude: state.coordinates?.longitude,
    };
  }, [state.coordinates]);

  const flags = useMemo(() => getPermissionFlags(state.status), [state.status]);

  return {
    ...state,
    ...flags,
    captureLocation,
    clearLocation,
    getCoordinates,
  };
};
