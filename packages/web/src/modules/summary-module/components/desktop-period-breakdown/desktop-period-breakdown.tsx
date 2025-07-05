import { useNavigate } from '@tanstack/react-router';
import React from 'react';

import { Tile } from '../../../../components';
import { useApiSummaryTransactionsQuery } from '../../../../hooks';
import type { PeriodType } from '../../hooks';

import { DesktopPeriodBreakdownLoader } from './desktop-period-breakdown-loader';
import { mapChartData, mapEnrichedTableData } from './helpers';
import { usePeriodBreakdownData } from './hooks';
import { PeriodBreakdownChart, PeriodBreakdownTable, createDesktopPeriodBreakdownColumns } from './presentation';

export interface DesktopPeriodBreakdownMainContentProps {
  periodType: PeriodType;
  startDate: Date;
  endDate: Date;
  currentPeriodDisplay: string;
  isCurrentPeriod: boolean;
}

/**
 * Main content component for period breakdown analytics.
 * Displays enhanced chart and data table with period financial data.
 * Uses computed period type from useDesktopSummaryFilters hook.
 */
export const DesktopPeriodBreakdown: React.FC<DesktopPeriodBreakdownMainContentProps> = ({
  periodType,
  startDate,
  endDate,
}) => {
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

  // use custom hook for grouped data
  const groupedData = usePeriodBreakdownData({ data: data ?? [], periodType, startDate });

  // use extracted helpers for chart and table data
  const chartData = React.useMemo(
    () => mapChartData({ rawData: data ?? [], startDate, periodType }),
    [data, startDate, periodType]
  );
  const enrichedTableData = React.useMemo(
    () => mapEnrichedTableData({ groupedData, periodType }),
    [groupedData, periodType]
  );

  const handleMoreClick = React.useCallback(async () => {
    await navigate({
      to: '/transactions/period',
      search: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  }, [startDate, endDate, navigate]);

  const columns = createDesktopPeriodBreakdownColumns(periodType);

  if (queryState.isFetching) {
    return (
      <div className="space-y-6">
        <Tile className="p-6">
          <DesktopPeriodBreakdownLoader count={5} />
        </Tile>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* enhanced chart display */}
      <PeriodBreakdownChart periodType={periodType} chartData={chartData} />
      {/* enhanced data table */}
      <PeriodBreakdownTable
        data={enrichedTableData}
        columns={columns}
        periodType={periodType}
        onMoreClick={handleMoreClick}
      />
    </div>
  );
};
