import { Text, Tile } from '@dimasbaguspm/versaur/primitive';
import React from 'react';

import { LineChart } from '../../../../../components';
import type { LineChartDatum } from '../../../../../components/line-chart/line-chart';
import type { PeriodType } from '../../../hooks';

interface MobilePeriodBreakdownChartProps {
  periodType: PeriodType;
  chartData: LineChartDatum[];
}

// mobile-optimized chart section for period breakdown - follows desktop pattern
export const MobilePeriodBreakdownChart: React.FC<MobilePeriodBreakdownChartProps> = ({ periodType, chartData }) => (
  <Tile>
    <div>
      <Text as="h3" fontSize="lg" fontWeight="semibold">
        {periodType === 'weekly' ? 'Daily' : periodType === 'monthly' ? 'Weekly' : 'Monthly'} Financial Overview
      </Text>
      <Text as="p" fontSize="sm" color="gray">
        Income and expenses breakdown for the selected period
      </Text>
    </div>
    <LineChart data={chartData} xKey="label" dataKey={['totalIncome', 'totalExpenses']} />
  </Tile>
);
