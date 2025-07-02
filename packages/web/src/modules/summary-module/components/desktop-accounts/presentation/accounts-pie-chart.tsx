import React from 'react';

import { Tile, PieChart, Segment, type PieChartDatum } from '../../../../../components';

interface AccountsPieChartProps {
  chartData: PieChartDatum[];
  chartType: 'expenses' | 'income';
  onChartTypeChange: (chartType: 'expenses' | 'income') => void;
}

/**
 * Pie chart section for accounts breakdown with expenses/income toggle
 * Includes segment control in the header for chart type selection
 */
export const AccountsPieChart: React.FC<AccountsPieChartProps> = ({ chartData, chartType, onChartTypeChange }) => (
  <Tile className="p-4 md:p-6">
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg md:text-xl font-semibold text-slate-900">
            {chartType === 'expenses' ? 'Expenses' : 'Income'} Distribution
          </h3>
          <p className="text-sm text-slate-500">
            Percentage breakdown of {chartType} across accounts for the selected period
          </p>
        </div>
        <div className="flex-shrink-0">
          <Segment
            value={chartType}
            onValueChange={(value) => onChartTypeChange(value as 'expenses' | 'income')}
            options={[
              { value: 'expenses', label: 'Expenses' },
              { value: 'income', label: 'Income' },
            ]}
            size="sm"
          />
        </div>
      </div>
      <PieChart data={chartData} />
    </div>
  </Tile>
);
