import { useEffect, useMemo } from "react";
import { useFilterState, type UseFilterStateReturn } from "@/hooks/use-filter-state/base/use-filter-state";
import type { InsightsTransactionsSearchModel } from "@/types/schemas";
import { useWebAPIProvider } from "@/providers/web-api-provider";
import dayjs from "dayjs";
import { DEFAULT_CENTER, normalizeCoordinates } from "../utils/map-helpers";

// Constant search radius (5km) regardless of zoom/precision
const SEARCH_RADIUS_METERS = 5000;

/**
 * Filter model for insights map page
 * Combines date filters from insights with map-specific parameters
 */
export interface InsightsMapFilterModel {
  // Date filters (inherited from insights)
  startDate: InsightsTransactionsSearchModel["startDate"];
  endDate: InsightsTransactionsSearchModel["endDate"];

  // Map-specific parameters
  mapLat?: number;
  mapLng?: number;
  mapRadius?: number;      // 100-50000 meters
  mapPrecision?: 1 | 2 | 3 | 4;  // Grid precision level
}

export interface UseInsightsMapFilterReturn extends UseFilterStateReturn<InsightsMapFilterModel> {
  appliedFilters: InsightsMapFilterModel;
  setMapView: (lat: number, lng: number, precision?: 1 | 2 | 3 | 4) => void;
  setMapCenter: (lat: number, lng: number) => void;
  setMapPrecision: (precision: 1 | 2 | 3 | 4) => void;
}

/**
 * Filter hook for insights map page
 * Extends base useFilterState and handles geolocation initialization
 */
export const useInsightsMapFilter = (): UseInsightsMapFilterReturn => {
  const { geolocation } = useWebAPIProvider();
  const filters = useFilterState<InsightsMapFilterModel>({ adapter: "url" });

  // Compute applied filters with defaults and coordinate validation
  const appliedFilters: InsightsMapFilterModel = useMemo(() => {
    const now = dayjs();
    const rawLat = filters.getSingle("mapLat") ? Number(filters.getSingle("mapLat")) : undefined;
    const rawLng = filters.getSingle("mapLng") ? Number(filters.getSingle("mapLng")) : undefined;

    // Normalize coordinates if both exist
    const normalizedCoords = rawLat !== undefined && rawLng !== undefined
      ? normalizeCoordinates(rawLat, rawLng)
      : { lat: rawLat, lng: rawLng };

    const precision = filters.getSingle("mapPrecision")
      ? (Number(filters.getSingle("mapPrecision")) as 1 | 2 | 3 | 4)
      : 3; // Default precision

    // Always use constant 5km radius
    const radius = SEARCH_RADIUS_METERS;

    return {
      startDate: filters.getSingle("startDate") || now.subtract(3, "month").startOf("month").toISOString(),
      endDate: filters.getSingle("endDate") || now.endOf("month").toISOString(),
      mapLat: normalizedCoords.lat,
      mapLng: normalizedCoords.lng,
      mapRadius: radius,
      mapPrecision: precision,
    };
  }, [filters]);

  // Initialize map parameters from geolocation on mount
  useEffect(() => {
    // Skip if already initialized in URL
    if (appliedFilters.mapLat && appliedFilters.mapLng) {
      return;
    }

    // Wait for geolocation to finish initializing
    if (geolocation.isInitializing) {
      return;
    }

    // Get coordinates from geolocation or fallback to Yogyakarta
    const coords = geolocation.getCoordinates();
    const rawLat = coords.latitude ?? DEFAULT_CENTER.lat;
    const rawLng = coords.longitude ?? DEFAULT_CENTER.lng;

    // Normalize coordinates to ensure they're within valid ranges
    const { lat, lng } = normalizeCoordinates(rawLat, rawLng);

    // Initialize all map params with defaults using replaceAll
    filters.replaceAll({
      startDate: appliedFilters.startDate,
      endDate: appliedFilters.endDate,
      mapLat: lat,
      mapLng: lng,
      mapRadius: SEARCH_RADIUS_METERS,  // Constant 5km radius
      mapPrecision: 3,                   // Default precision
    });
  }, [geolocation.isInitializing, appliedFilters.mapLat, appliedFilters.mapLng]);

  /**
   * Update map center coordinates (with validation)
   */
  const setMapCenter = (lat: number, lng: number) => {
    const { lat: normalizedLat, lng: normalizedLng } = normalizeCoordinates(lat, lng);
    filters.replaceAll({
      ...appliedFilters,
      mapLat: normalizedLat,
      mapLng: normalizedLng,
    });
  };

  /**
   * Update grid precision (radius stays constant at 5km)
   */
  const setMapPrecision = (precision: 1 | 2 | 3 | 4) => {
    filters.replaceSingle("mapPrecision", precision);
  };

  /**
   * Update map view (center and optionally precision) atomically (with validation)
   */
  const setMapView = (lat: number, lng: number, precision?: 1 | 2 | 3 | 4) => {
    const { lat: normalizedLat, lng: normalizedLng } = normalizeCoordinates(lat, lng);

    if (precision) {
      // Update all at once for atomic change
      filters.replaceAll({
        ...appliedFilters,
        mapLat: normalizedLat,
        mapLng: normalizedLng,
        mapPrecision: precision,
      });
    } else {
      // Just update center
      setMapCenter(normalizedLat, normalizedLng);
    }
  };

  return {
    ...filters,
    appliedFilters,
    setMapView,
    setMapCenter,
    setMapPrecision,
  };
};
