import { useMapEvents } from "react-leaflet";

interface MapEventHandlerProps {
  onZoomChange: (zoom: number) => void;
  onMapMove: (lat: number, lng: number) => void;
}

/**
 * Component to handle map events (zoom and move)
 * Passes raw zoom value to parent for precision/radius calculation
 */
export const MapEventHandler = ({
  onZoomChange,
  onMapMove,
}: MapEventHandlerProps) => {
  const map = useMapEvents({
    zoomend: () => {
      const zoom = map.getZoom();
      onZoomChange(zoom); // Pass raw zoom, let parent decide precision/radius
    },
    moveend: () => {
      const center = map.getCenter();
      onMapMove(center.lat, center.lng);
    },
  });
  return null;
};
