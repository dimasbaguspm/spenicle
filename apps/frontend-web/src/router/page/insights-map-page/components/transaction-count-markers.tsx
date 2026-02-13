import { useMemo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import type { InsightsGeospatialModel } from "@/types/schemas";

interface TransactionCountMarkersProps {
  data: InsightsGeospatialModel | null | undefined;
}

export const TransactionCountMarkers = ({
  data,
}: TransactionCountMarkersProps) => {
  const markers = useMemo(() => {
    const gridCells = data?.data;
    if (!gridCells?.length) return [];

    // Get primary color from Versaur design system
    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-primary")
      .trim();

    const maxCount = Math.max(
      ...gridCells.map((cell) => cell.transactionCount ?? 0),
      1,
    );
    const minSize = 32;
    const maxSize = 64;

    // Sort by transaction count (ascending) so higher counts render on top
    return gridCells
      .slice()
      .sort((a, b) => (a.transactionCount ?? 0) - (b.transactionCount ?? 0))
      .map((cell, index) => {
      const count = cell.transactionCount ?? 0;
      const size = Math.round(
        minSize + (count / maxCount) * (maxSize - minSize),
      );

      const fontSize = Math.max(11, Math.round(size / 3.5));

      const icon = L.divIcon({
        className: "transaction-count-marker",
        html: `
          <div style="
            background: ${primaryColor};
            color: white;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${fontSize}px;
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            border: 3px solid white;
            transition: transform 0.2s;
          ">
            ${count}
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      return {
        key: `${cell.gridLat}-${cell.gridLon}-${index}`,
        position: [cell.gridLat, cell.gridLon] as [number, number],
        icon,
        count,
        size,
      };
    });
  }, [data]);

  return (
    <>
      {markers.map((marker) => (
        <Marker
          key={marker.key}
          position={marker.position}
          icon={marker.icon}
        />
      ))}
    </>
  );
};
