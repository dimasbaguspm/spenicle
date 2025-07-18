import { Layers, List } from 'lucide-react';
import React from 'react';

import { Tile, PieChart, type PieChartDatum, Tab } from '../../../../../components';

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
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">Category Breakdown</h3>
            <p className="text-sm text-slate-500">
              Category distribution by {chartType.toLowerCase()} for the selected period
            </p>
          </div>

          {/* mobile-optimized chart type selector */}
          <Tab
            value={chartType}
            onValueChange={(value: string) => onChartTypeChange(value as 'expenses' | 'income')}
            type="tabs"
          >
            <Tab.List className="w-full grid grid-cols-2 gap-1 p-1 bg-mist-100 rounded-lg">
              <Tab.Trigger
                value="expenses"
                className="text-center text-sm font-medium px-4 py-2 rounded-md transition-all"
              >
                <div className="flex items-center justify-center gap-2">
                  <List className="h-4 w-4" />
                  <span>Expenses</span>
                </div>
              </Tab.Trigger>
              <Tab.Trigger
                value="income"
                className="text-center text-sm font-medium px-4 py-2 rounded-md transition-all"
              >
                <div className="flex items-center justify-center gap-2">
                  <Layers className="h-4 w-4" />
                  <span>Income</span>
                </div>
              </Tab.Trigger>
            </Tab.List>
          </Tab>
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
