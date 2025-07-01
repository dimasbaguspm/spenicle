import React from 'react';

import { Tile, PieChart, type PieChartDatum } from '../../../../../components';

interface CategoriesPieChartProps {
  chartData: PieChartDatum[];
  chartType: 'expenses' | 'income';
}

/**
 * Pie chart section for categories breakdown showing distribution by usage
 */
export const CategoriesPieChart: React.FC<CategoriesPieChartProps> = ({ chartData, chartType }) => {
  // calculate dynamic height based on number of categories
  // more categories need more space for legend and better readability
  const getDynamicHeight = () => {
    const categoryCount = chartData.length;
    if (categoryCount <= 5) return 320; // 320px for few categories
    if (categoryCount <= 10) return 384; // 384px for medium amount
    if (categoryCount <= 15) return 448; // 448px for many categories
    return 512; // 512px for lots of categories
  };

  return (
    <Tile className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {chartType === 'expenses' ? 'Expenses' : 'Income'} Distribution
          </h3>
          <p className="text-sm text-slate-600">
            Percentage breakdown of {chartType} across categories for the selected period
          </p>
        </div>
        <PieChart data={chartData} height={getDynamicHeight()} />
      </div>
    </Tile>
  );
};
