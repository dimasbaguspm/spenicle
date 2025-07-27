import { SegmentSingleInput } from '@dimasbaguspm/versaur/forms';
import { Text, Tile } from '@dimasbaguspm/versaur/primitive';
import React from 'react';

import { PieChart, type PieChartDatum } from '../../../../../components';

interface CategoriesPieChartProps {
  chartData: PieChartDatum[];
  chartType: 'expenses' | 'income';
  onChartTypeChange: (chartType: 'expenses' | 'income') => void;
}

/**
 * Pie chart section for categories breakdown showing distribution by usage
 */
export const CategoriesPieChart: React.FC<CategoriesPieChartProps> = ({ chartData, chartType, onChartTypeChange }) => {
  return (
    <Tile className="space-y-4">
      {/* header with integrated toggle */}
      <div className="flex items-start justify-between gap-12">
        <div>
          <Text as="h3" fontSize="lg" fontWeight="semibold">
            {chartType === 'expenses' ? 'Expenses' : 'Income'} Distribution
          </Text>
          <Text as="p" fontSize="sm">
            Percentage breakdown of {chartType} across categories for the selected period
            {chartData.length > 0 && (
              <span className="text-slate-500 ml-1">
                ({chartData.length} categor{chartData.length === 1 ? 'y' : 'ies'})
              </span>
            )}
          </Text>
        </div>

        {/* integrated segment toggle - visually balanced */}
        <div className="flex-grow-1">
          <SegmentSingleInput
            className="flex justify-end"
            name="accounts-tab"
            size="sm"
            variant="ghost"
            value={chartType}
            onChange={(value) => onChartTypeChange(value as 'income' | 'expenses')}
          >
            <SegmentSingleInput.Option value="expenses">Expenses</SegmentSingleInput.Option>
            <SegmentSingleInput.Option value="income">Income</SegmentSingleInput.Option>
          </SegmentSingleInput>
        </div>
      </div>
      <PieChart data={chartData} height={300} showLegend={false} />
    </Tile>
  );
};
