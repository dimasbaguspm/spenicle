import { Tabs, Text, Tile } from '@dimasbaguspm/versaur';
import React from 'react';

import { PieChart, type PieChartDatum } from '../../../../../components';

interface MobileAccountsPieChartProps {
  chartData: PieChartDatum[];
  chartType: 'expenses' | 'income';
  onChartTypeChange: (type: 'expenses' | 'income') => void;
}

/**
 * Mobile-optimized pie chart for accounts data
 * Includes chart type toggle and responsive design
 */
export const MobileAccountsPieChart: React.FC<MobileAccountsPieChartProps> = ({
  chartData,
  chartType,
  onChartTypeChange,
}) => {
  const chartTypeLabel = chartType === 'expenses' ? 'Expenses' : 'Income';

  return (
    <Tile className="space-y-4">
      {/* header with chart type toggle */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Text as="h3" fontSize="lg" fontWeight="semibold">
            Account Breakdown
          </Text>
          <Text as="p" fontSize="sm">
            Account distribution by {chartTypeLabel.toLowerCase()} for the selected period
          </Text>
        </div>

        {/* mobile-optimized chart type selector */}
        <Tabs value={chartType} onValueChange={(value: string) => onChartTypeChange(value as 'expenses' | 'income')}>
          <Tabs.Trigger value="expenses">Expenses</Tabs.Trigger>
          <Tabs.Trigger value="income">Income</Tabs.Trigger>
        </Tabs>
      </div>

      {/* pie chart display */}
      <PieChart data={chartData} height={350} showLegend={false} />
    </Tile>
  );
};
