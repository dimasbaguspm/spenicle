import React from 'react';

import { Tile, PieChart, type PieChartDatum } from '../../../../../components';

interface AccountsPieChartProps {
  chartData: PieChartDatum[];
  chartType: 'expenses' | 'income';
}

/**
 * Pie chart section for accounts breakdown showing distribution by usage
 */
export const AccountsPieChart: React.FC<AccountsPieChartProps> = ({ chartData, chartType }) => (
  <Tile className="p-6">
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          {chartType === 'expenses' ? 'Expenses' : 'Income'} Distribution
        </h3>
        <p className="text-sm text-slate-600">
          Percentage breakdown of {chartType} across accounts for the selected period
        </p>
      </div>
      <PieChart data={chartData} />
    </div>
  </Tile>
);
