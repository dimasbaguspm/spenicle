import React from 'react';

import { Tile, LineChart } from '../../../../../components';
import type { LineChartDatum } from '../../../../../components/line-chart/line-chart';
import type { PeriodType } from '../../../hooks';

interface MobilePeriodBreakdownChartProps {
  periodType: PeriodType;
  chartData: LineChartDatum[];
}

// mobile-optimized chart section for period breakdown - follows desktop pattern
export const MobilePeriodBreakdownChart: React.FC<MobilePeriodBreakdownChartProps> = ({ periodType, chartData }) => (
  <Tile className="p-6">
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          {periodType === 'weekly' ? 'Daily' : periodType === 'monthly' ? 'Weekly' : 'Monthly'} Financial Overview
        </h3>
        <p className="text-sm text-slate-600">Income and expenses breakdown for the selected period</p>
      </div>
      <LineChart data={chartData} xKey="label" dataKey={['totalIncome', 'totalExpenses']} />
    </div>
  </Tile>
);
