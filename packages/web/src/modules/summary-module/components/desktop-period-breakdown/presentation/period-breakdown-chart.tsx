import React from 'react';

import { Tile, LineChart } from '../../../../../components';
import type { LineChartDatum } from '../../../../../components/line-chart/line-chart';
import type { PeriodType } from '../../../hooks';

interface PeriodBreakdownChartProps {
  periodType: PeriodType;
  chartData: LineChartDatum[];
}

// chart section for period breakdown
export const PeriodBreakdownChart: React.FC<PeriodBreakdownChartProps> = ({ periodType, chartData }) => (
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
