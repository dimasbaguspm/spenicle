import { useEffect, useRef } from "react";
import { useApiRefreshGeoCache } from "@/hooks/use-api";
import { useWebAPIProvider } from "@/providers/web-api-provider";

/**
 * GeoCacheInitializer - Non-blocking background initialization
 *
 * Triggers geo cache refresh once on mount with captured geolocation coordinates.
 * Runs as a sibling to Outlet in the router, ensuring it doesn't block app rendering.
 *
 * - Fire-and-forget pattern (no loading state, no error UI)
 * - Silent failures (optional optimization, not critical)
 * - Runs after authentication and geolocation initialization
 * - Renders nothing (null component)
 */
export const GeoCacheInitializer = () => {
  const { geolocation } = useWebAPIProvider();
  const hasInitialized = useRef(false);
  const [refreshGeoCache] = useApiRefreshGeoCache();

  useEffect(() => {
    // Only run once after geolocation initialization completes
    if (geolocation.isInitializing || hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;

    // Fire and forget - don't await or handle errors
    // Background indexing happens asynchronously in backend
    refreshGeoCache({
      latitude: geolocation.coordinates?.latitude ?? null,
      longitude: geolocation.coordinates?.longitude ?? null,
    }).catch(() => {
      // Silent failure - geo cache refresh is optional optimization
      // Don't block app if it fails
    });
  }, [geolocation.isInitializing, geolocation.coordinates, refreshGeoCache]);

  // Render nothing - this is a background worker component
  return null;
};
