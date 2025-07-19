import { Tabs, Text, Tile } from '@dimasbaguspm/versaur';
import React from 'react';

import { PieChart, type PieChartDatum } from '../../../../../components';

interface MobileCategoriesPieChartProps {
  chartData: PieChartDatum[];
  chartType: 'expenses' | 'income';
  onChartTypeChange: (chartType: 'expenses' | 'income') => void;
}

/**
 * Mobile-optimized pie chart section for categories breakdown
 * Follows the same pattern as desktop but with mobile-friendly layout and smart aggregation
 */
export const MobileCategoriesPieChart: React.FC<MobileCategoriesPieChartProps> = ({
  chartData,
  chartType,
  onChartTypeChange,
}) => {
  return (
    <Tile className="space-y-4">
      {/* mobile-optimized header with better spacing */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Text as="h3" fontSize="lg" fontWeight="semibold">
            Category Breakdown
          </Text>
          <Text as="p" fontSize="sm">
            Category distribution by {chartType.toLowerCase()} for the selected period
          </Text>
        </div>

        {/* mobile-optimized chart type selector */}
        <Tabs value={chartType} onValueChange={(value: string) => onChartTypeChange(value as 'expenses' | 'income')}>
          <Tabs.Trigger value="expenses">Expenses</Tabs.Trigger>
          <Tabs.Trigger value="income">Income</Tabs.Trigger>
        </Tabs>
      </div>

      <PieChart data={chartData} height={350} showLegend={false} />
    </Tile>
  );
};
