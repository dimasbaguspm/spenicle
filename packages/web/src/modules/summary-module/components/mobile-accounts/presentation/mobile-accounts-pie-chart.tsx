import { Layers, List } from 'lucide-react';
import React from 'react';

import { Tile, PieChart, Tab, type PieChartDatum } from '../../../../../components';

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
  const hasData = chartData.length > 0;
  const chartTypeLabel = chartType === 'expenses' ? 'Expenses' : 'Income';

  return (
    <Tile className="p-4">
      <div className="space-y-4">
        {/* header with chart type toggle */}
        <div className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">Account Breakdown</h3>
            <p className="text-sm text-slate-500">
              Account distribution by {chartTypeLabel.toLowerCase()} for the selected period
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

        {/* pie chart display */}
        {hasData ? (
          <div className="space-y-3">
            <PieChart data={chartData} height={350} showLegend={false} />
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-center">
            <div className="space-y-2">
              <div className="text-slate-400">
                <Layers className="h-12 w-12 mx-auto" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">No {chartTypeLabel.toLowerCase()} data</p>
                <p className="text-xs text-slate-500">Add some transactions to see the breakdown</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Tile>
  );
};
