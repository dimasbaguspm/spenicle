import { useEffect, useMemo } from "react";
import { useFilterState, type UseFilterStateReturn } from "@/hooks/use-filter-state/base/use-filter-state";
import type { InsightsTransactionsSearchModel } from "@/types/schemas";
import { useWebAPIProvider } from "@/providers/web-api-provider";
import dayjs from "dayjs";
import { DEFAULT_CENTER, normalizeCoordinates } from "../utils/map-helpers";

/**
 * Filter model for insights map page
 * Combines date filters from insights with map-specific parameters
 * Note: mapRadius and mapPrecision are calculated from zoom, not stored in filters
 */
export interface InsightsMapFilterModel {
  // Date filters (inherited from insights)
  startDate: InsightsTransactionsSearchModel["startDate"];
  endDate: InsightsTransactionsSearchModel["endDate"];

  // Map-specific parameters
  mapLat?: number;
  mapLng?: number;
}

export interface UseInsightsMapFilterReturn extends UseFilterStateReturn<InsightsMapFilterModel> {
  appliedFilters: InsightsMapFilterModel;
  setMapCenter: (lat: number, lng: number) => void;
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

    return {
      startDate: filters.getSingle("startDate") || now.subtract(3, "month").startOf("month").toISOString(),
      endDate: filters.getSingle("endDate") || now.endOf("month").toISOString(),
      mapLat: normalizedCoords.lat,
      mapLng: normalizedCoords.lng,
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

    // Initialize map center with defaults using replaceAll
    filters.replaceAll({
      startDate: appliedFilters.startDate,
      endDate: appliedFilters.endDate,
      mapLat: lat,
      mapLng: lng,
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

  return {
    ...filters,
    appliedFilters,
    setMapCenter,
  };
};
