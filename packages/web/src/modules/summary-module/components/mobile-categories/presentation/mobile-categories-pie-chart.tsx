import { Text, Tile } from '@dimasbaguspm/versaur/primitive';
import React from 'react';

import { PieChart, type PieChartDatum } from '../../../../../components';

interface MobileCategoriesPieChartProps {
  chartData: PieChartDatum[];
  chartType: 'expenses' | 'income';
}

/**
 * Mobile-optimized pie chart section for categories breakdown
 * Follows the same pattern as desktop but with mobile-friendly layout and smart aggregation
 */
export const MobileCategoriesPieChart: React.FC<MobileCategoriesPieChartProps> = ({ chartData, chartType }) => {
  return (
    <Tile className="space-y-4">
      <div className="space-y-1">
        <Text as="h3" fontSize="lg" fontWeight="semibold">
          Category Breakdown
        </Text>
        <Text as="p" fontSize="sm" color="gray">
          Category distribution by {chartType.toLowerCase()}
        </Text>
      </div>

      <PieChart data={chartData} height={350} showLegend={false} />
    </Tile>
  );
};
