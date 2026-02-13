import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

interface HeatmapLayerProps {
  points: [number, number, number][];
}

export const HeatmapLayer = ({ points }: HeatmapLayerProps) => {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      return;
    }

    // Get primary color from CSS variable (Versaur design system)
    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-primary")
      .trim();

    const heatLayer = L.heatLayer(points, {
      radius: 35, // Sharp, focused circles
      blur: 5, // Minimal blur for crisp edges
      maxZoom: 17,
      max: 1.0,
      minOpacity: 0.6,
      gradient: {
        0.0: "transparent",
        0.4: primaryColor + "60", // 37.5% opacity
        0.6: primaryColor + "A0", // 62.5% opacity
        0.8: primaryColor + "E0", // 87.5% opacity
        1.0: primaryColor, // 100% opacity
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
};
