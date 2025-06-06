import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { PeriodBreakdown } from '../../../../modules/summary-module';

export const Route = createFileRoute('/_protected/_experienced-user/analytics/period-breakdown')({
  component: RouteComponent,
});

function RouteComponent() {
  const [periodBreakdownType, setPeriodBreakdownTypeState] = useState<'weekly' | 'monthly'>('weekly');
  const [periodBreakdownIndex, setPeriodBreakdownIndex] = useState(0);

  const setPeriodBreakdownType = (type: 'weekly' | 'monthly') => {
    setPeriodBreakdownTypeState(type);
    setPeriodBreakdownIndex(0);
  };

  return (
    <PeriodBreakdown
      periodType={periodBreakdownType}
      periodIndex={periodBreakdownIndex}
      setPeriodType={setPeriodBreakdownType}
      setPeriodIndex={setPeriodBreakdownIndex}
    />
  );
}
