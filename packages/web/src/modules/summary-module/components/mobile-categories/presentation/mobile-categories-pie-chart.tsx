import React from 'react';

import { Tile, PieChart, Segment, type PieChartDatum } from '../../../../../components';

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
    <Tile className="p-4 md:p-6">
      <div className="space-y-4">
        {/* mobile-optimized header with better spacing */}
        <div className="space-y-3">
          <div className="text-center sm:text-left">
            <div className="flex justify-between items-center gap-2 w-full">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {chartType === 'expenses' ? 'Expenses' : 'Income'} Distribution
              </h3>
              <div>
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
                  className="bg-mist-50 rounded-lg flex-grow-1"
                />
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Breakdown of {chartType} across categories
              {chartData.length > 0 && (
                <span className="text-slate-500 block sm:inline sm:ml-1">
                  {chartData.length} categor{chartData.length === 1 ? 'y' : 'ies'}
                </span>
              )}
            </p>
          </div>

          {/* mobile-friendly segment toggle with better styling */}
          <div className="flex items-center justify-between"></div>
        </div>

        {chartData.length > 0 ? (
          <div className="space-y-3">
            <PieChart data={chartData} height={350} showLegend={false} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-slate-400 mb-2">
              <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
