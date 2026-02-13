import { useMemo } from "react";
import type { InsightsGeospatialModel } from "@/types/schemas";

export const useHeatMapData = (
  data: InsightsGeospatialModel | null | undefined,
): [number, number, number][] => {
  return useMemo(() => {
    const gridCells = data?.data;
    if (!gridCells?.length) {
      return [];
    }

    // Find max transaction count for normalization
    const maxCount = Math.max(
      ...gridCells.map((cell) => cell.transactionCount ?? 0),
      1,
    );

    // Transform to [lat, lng, intensity] format
    const heatPoints = gridCells.map(
      (cell) =>
        [
          cell.gridLat,
          cell.gridLon,
          (cell.transactionCount ?? 0) / maxCount, // Normalize to 0-1
        ] as [number, number, number],
    );

    return heatPoints;
  }, [data]);
};
