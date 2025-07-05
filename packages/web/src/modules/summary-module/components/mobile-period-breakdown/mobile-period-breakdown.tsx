import { useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import React from 'react';

import { useApiSummaryTransactionsQuery } from '../../../../hooks';
import type { SummaryTransactionsPeriod } from '../../../../types/api';
import type { PeriodType } from '../../hooks';

import { mapChartData, mapEnrichedTableData } from './helpers/mobile-period-breakdown-mappers';
import { usePeriodBreakdownData } from './hooks';
import { MobilePeriodBreakdownLoader } from './mobile-period-breakdown-loader';
import { MobilePeriodBreakdownChart, MobilePeriodBreakdownTable } from './presentation';

export interface MobilePeriodBreakdownProps {
  periodType: PeriodType;
  startDate: Date;
  endDate: Date;
  currentPeriodDisplay: string;
  isCurrentPeriod: boolean;
}

/**
 * Main content component for mobile period breakdown analytics.
 * Displays enhanced chart and data table with period financial data.
 * Follows exact same logic as desktop but with mobile-optimized UI.
 */
export const MobilePeriodBreakdown: React.FC<MobilePeriodBreakdownProps> = ({ periodType, startDate, endDate }) => {
  const navigate = useNavigate();

  // use the computed dates for API calls
  const [data, , queryState] = useApiSummaryTransactionsQuery(
    {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    },
    {
      staleTime: 60000,
      gcTime: 300000,
    }
  );

  // use custom hook for grouped data - follows desktop pattern
  const groupedData = usePeriodBreakdownData({ data: data ?? [], periodType, startDate });

  // use extracted helpers for chart and table data - follows desktop pattern
  const chartData = React.useMemo(
    () => mapChartData({ rawData: data ?? [], startDate, periodType }),
    [data, startDate, periodType]
  );

  const enrichedTableData = React.useMemo(
    () => mapEnrichedTableData({ groupedData, periodType }),
    [groupedData, periodType]
  );

  const handlePeriodCardClick = React.useCallback(
    async (period: SummaryTransactionsPeriod[number]) => {
      if (periodType === 'monthly' && period.startDate) {
        // navigate to weekly view for the clicked month - handled by filters hook
        return;
      } else if (periodType === 'weekly' && period.startDate && period.endDate) {
        // navigate to transactions for the specific day
        await navigate({
          to: '/transactions/period',
          search: {
            startDate: dayjs(period.startDate).toISOString(),
            endDate: dayjs(period.endDate).toISOString(),
          },
        });
      }
    },
    [periodType, navigate]
  );

  if (queryState.isFetching) {
    return <MobilePeriodBreakdownLoader count={5} />;
  }

  return (
    <div className="space-y-6">
      {/* enhanced chart display */}
      <MobilePeriodBreakdownChart periodType={periodType} chartData={chartData} />
      {/* enhanced data table */}
      <MobilePeriodBreakdownTable
        data={enrichedTableData}
        periodType={periodType}
        onPeriodClick={handlePeriodCardClick}
      />
    </div>
  );
};
