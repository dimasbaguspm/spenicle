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
  <Tile className="p-6">
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-12">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {chartType === 'expenses' ? 'Expenses' : 'Income'} Distribution
          </h3>
          <p className="text-sm text-slate-600">
            Percentage breakdown of {chartType} across accounts for the selected period
            {chartData.length > 0 && (
              <span className="text-slate-500 ml-1">
                ({chartData.length} account{chartData.length === 1 ? '' : 's'})
              </span>
            )}
          </p>
        </div>
        <div className="flex-grow-1">
          <Segment
            label="Distribution Type"
            showLabel={false}
            variant="default"
            size="sm"
            options={[
              { value: 'expenses', label: 'Expenses' },
              { value: 'income', label: 'Income' },
            ]}
            value={chartType}
            onValueChange={(value) => onChartTypeChange(value as 'expenses' | 'income')}
            className="w-full"
          />
        </div>
      </div>
      <PieChart data={chartData} />
    </div>
  </Tile>
);
