import React from 'react';

import { Tile, PieChart, Segment, type PieChartDatum } from '../../../../../components';

interface CategoriesPieChartProps {
  chartData: PieChartDatum[];
  chartType: 'expenses' | 'income';
  onChartTypeChange: (chartType: 'expenses' | 'income') => void;
}

/**
 * Pie chart section for categories breakdown showing distribution by usage
 */
export const CategoriesPieChart: React.FC<CategoriesPieChartProps> = ({ chartData, chartType, onChartTypeChange }) => {
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
        {/* header with integrated toggle */}
        <div className="flex items-start justify-between gap-12">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {chartType === 'expenses' ? 'Expenses' : 'Income'} Distribution
            </h3>
            <p className="text-sm text-slate-600">
              Percentage breakdown of {chartType} across categories for the selected period
              {chartData.length > 0 && (
                <span className="text-slate-500 ml-1">
                  ({chartData.length} categor{chartData.length === 1 ? 'y' : 'ies'})
                </span>
              )}
            </p>
          </div>

          {/* integrated segment toggle - visually balanced */}
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
        {chartData.length > 0 ? (
          <PieChart data={chartData} height={getDynamicHeight()} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-slate-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h4 className="text-sm font-medium text-slate-700 mb-1">No {chartType} data available</h4>
            <p className="text-xs text-slate-500">No categories have {chartType} recorded for the selected period</p>
          </div>
        )}
      </div>
    </Tile>
  );
};
