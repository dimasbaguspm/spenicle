import { Text, Tile } from '@dimasbaguspm/versaur';
import React from 'react';

import { LineChart } from '../../../../../components';
import type { LineChartDatum } from '../../../../../components/line-chart/line-chart';
import type { PeriodType } from '../../../hooks';

interface PeriodBreakdownChartProps {
  periodType: PeriodType;
  chartData: LineChartDatum[];
}

// chart section for period breakdown
export const PeriodBreakdownChart: React.FC<PeriodBreakdownChartProps> = ({ periodType, chartData }) => (
  <Tile className="space-y-4">
    <div>
      <Text as="h3" fontSize="lg" fontWeight="semibold">
        {periodType === 'weekly' ? 'Daily' : periodType === 'monthly' ? 'Weekly' : 'Monthly'} Financial Overview
      </Text>
      <Text as="p" fontSize="sm">
        Income and expenses breakdown for the selected period
      </Text>
    </div>
    <LineChart data={chartData} xKey="label" dataKey={['totalIncome', 'totalExpenses']} />
  </Tile>
);
