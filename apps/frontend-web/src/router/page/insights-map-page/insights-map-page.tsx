import { useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { PageContent, useMobileBreakpoint } from "@dimasbaguspm/versaur";
import { useWebAPIProvider } from "@/providers/web-api-provider";
import { useApiInsightsGeospatialSummaryQuery } from "@/hooks/use-api";
import {
  MapEventHandler,
  UserLocationMarker,
  TransactionCountMarkers,
} from "./components";
import { useInsightsMapFilter } from "./hooks";
import {
  DEFAULT_CENTER,
  getPrecisionFromZoom,
  getRadiusFromPrecision,
  normalizeCoordinates,
} from "./utils/map-helpers";
import "leaflet/dist/leaflet.css";

const InsightsMapPage = () => {
  const isMobile = useMobileBreakpoint();
  const { geolocation } = useWebAPIProvider();
  const { appliedFilters, setMapCenter } = useInsightsMapFilter();

  // Zoom is local UI state, not persisted in filters
  const [zoom, setZoom] = useState(14); // Default: city view (precision 3)

  // Calculate precision and radius dynamically from zoom
  const precision = getPrecisionFromZoom(zoom);
  const radius = getRadiusFromPrecision(precision);

  const [geospatialData, , { isLoading }] =
    useApiInsightsGeospatialSummaryQuery(
      {
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
        latitude: appliedFilters.mapLat!,
        longitude: appliedFilters.mapLng!,
        radiusMeters: radius,
        gridPrecision: precision,
      },
      { enabled: !!appliedFilters.mapLat && !!appliedFilters.mapLng },
    );

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  const handleMapMove = (lat: number, lng: number) => {
    // Normalize coordinates to valid ranges (lat: -90 to 90, lng: -180 to 180)
    const normalized = normalizeCoordinates(lat, lng);

    // Only update if coordinates changed significantly (avoid excessive updates)
    const latChanged =
      Math.abs(normalized.lat - (appliedFilters.mapLat ?? 0)) > 0.0001;
    const lngChanged =
      Math.abs(normalized.lng - (appliedFilters.mapLng ?? 0)) > 0.0001;

    if (latChanged || lngChanged) {
      setMapCenter(normalized.lat, normalized.lng);
    }
  };

  const center: [number, number] = [
    appliedFilters.mapLat ?? DEFAULT_CENTER.lat,
    appliedFilters.mapLng ?? DEFAULT_CENTER.lng,
  ];

  // Get actual user location (separate from map center)
  const userCoords = geolocation.getCoordinates();
  const hasUserLocation = userCoords.latitude && userCoords.longitude;

  return (
    <PageContent
      size={isMobile ? "narrow" : "wide"}
      className={isMobile ? "pb-20" : undefined}
    >
      <div className="h-[700px] w-full overflow-hidden rounded-lg border border-border">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: "100%", width: "100%" }}
          zoomControl={!isMobile}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapEventHandler
            onZoomChange={handleZoomChange}
            onMapMove={handleMapMove}
          />

          {/* User location pin - only show actual geolocation */}
          {hasUserLocation && (
            <UserLocationMarker
              lat={userCoords.latitude!}
              lng={userCoords.longitude!}
            />
          )}

          {/* Transaction count markers - size scales with count */}
          {!isLoading && geospatialData && (
            <TransactionCountMarkers data={geospatialData} />
          )}
        </MapContainer>
      </div>
    </PageContent>
  );
};

export default InsightsMapPage;
