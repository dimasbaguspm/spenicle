import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { PageContent, useMobileBreakpoint } from "@dimasbaguspm/versaur";
import { useWebAPIProvider } from "@/providers/web-api-provider";
import { useApiInsightsGeospatialSummaryQuery } from "@/hooks/use-api";
import { UserLocationMarker, TransactionCountMarkers } from "./components";
import { useInsightsMapFilter } from "./hooks";
import {
  DEFAULT_CENTER,
  getZoomFromPrecision,
  getPrecisionFromZoom,
  normalizeCoordinates,
} from "./utils/map-helpers";
import "leaflet/dist/leaflet.css";

// Component to handle map events
const MapEventHandler = ({
  onPrecisionChange,
  onMapMove,
}: {
  onPrecisionChange: (p: 1 | 2 | 3 | 4) => void;
  onMapMove: (lat: number, lng: number) => void;
}) => {
  const map = useMapEvents({
    zoomend: () => {
      const zoom = map.getZoom();
      const newPrecision = getPrecisionFromZoom(zoom);
      onPrecisionChange(newPrecision);
    },
    moveend: () => {
      const center = map.getCenter();
      onMapMove(center.lat, center.lng);
    },
  });
  return null;
};

const InsightsMapPage = () => {
  const isMobile = useMobileBreakpoint();
  const { geolocation } = useWebAPIProvider();
  const { appliedFilters, setMapPrecision, setMapView } =
    useInsightsMapFilter();

  // Fetch geospatial data
  const [geospatialData, , { isLoading }] =
    useApiInsightsGeospatialSummaryQuery(
      {
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
        latitude: appliedFilters.mapLat!,
        longitude: appliedFilters.mapLng!,
        radiusMeters: appliedFilters.mapRadius ?? 5000,
        gridPrecision: appliedFilters.mapPrecision ?? 3,
      },
      { enabled: !!appliedFilters.mapLat && !!appliedFilters.mapLng },
    );

  const handlePrecisionChange = (newPrecision: 1 | 2 | 3 | 4) => {
    if (newPrecision !== appliedFilters.mapPrecision) {
      setMapPrecision(newPrecision);
    }
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
      setMapView(normalized.lat, normalized.lng);
    }
  };

  const center: [number, number] = [
    appliedFilters.mapLat ?? DEFAULT_CENTER.lat,
    appliedFilters.mapLng ?? DEFAULT_CENTER.lng,
  ];
  const zoom = getZoomFromPrecision(appliedFilters.mapPrecision ?? 3);

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
            onPrecisionChange={handlePrecisionChange}
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
