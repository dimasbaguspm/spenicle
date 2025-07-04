import { useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import React from 'react';

import { Tile, LineChart } from '../../../../components';
import { useApiSummaryTransactionsQuery } from '../../../../hooks';
import type { SummaryTransactionsPeriod } from '../../../../types/api';
import { useDesktopSummaryFilters } from '../../hooks';

import { groupPeriods } from './helpers';
import { MobilePeriodBreakdownCardList } from './mobile-period-breakdown-card-list';
import { MobilePeriodBreakdownLoader } from './mobile-period-breakdown-loader';

export interface MobilePeriodBreakdownProps {
  startDate: Date;
  endDate: Date;
  currentPeriodDisplay: string;
  isCurrentPeriod: boolean;
}

export const MobilePeriodBreakdown: React.FC<MobilePeriodBreakdownProps> = ({ startDate, endDate }) => {
  const navigate = useNavigate();
  const { actions } = useDesktopSummaryFilters();

  // derive period type from date range
  const periodType = React.useMemo(() => {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const daysDiff = end.diff(start, 'days');

    if (daysDiff <= 7) return 'weekly';
    if (daysDiff <= 32) return 'monthly';
    return 'yearly';
  }, [startDate, endDate]);

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

  const groupedData = React.useMemo(() => {
    const start = dayjs(startDate);
    const now = dayjs();

    if (periodType === 'weekly') {
      // filter to current month's weeks for weekly view
      return groupPeriods(
        (data ?? []).filter(
          (item) => dayjs(item.startDate).isSame(start, 'month') && !dayjs(item.startDate).isAfter(now, 'week')
        ),
        'weekly',
        { selectedMonth: start }
      );
    } else {
      // filter to current year's months for monthly view
      return groupPeriods(
        (data ?? []).filter(
          (item) => dayjs(item.startDate).isSame(start, 'year') && !dayjs(item.startDate).isAfter(now, 'month')
        ),
        'monthly'
      );
    }
  }, [data, periodType, startDate]);

  /**
   * Remap summary data for the chart:
   * - If weekly: show all weeks in the selected month (W1, W2, ...)
   * - If monthly: show all months in the selected year (Jan, Feb, ...)
   * Fills missing periods with zeroes for chart continuity and clarity.
   */
  const getChartData = React.useCallback(
    (chartPeriodType: 'weekly' | 'monthly', rawData: SummaryTransactionsPeriod[number][]) => {
      const start = dayjs(startDate);

      if (chartPeriodType === 'weekly') {
        // Show all weeks in the selected month
        const monthStart = start.startOf('month');
        const monthEnd = start.endOf('month');
        const weeks: { start: dayjs.Dayjs; end: dayjs.Dayjs }[] = [];
        let cursor = monthStart.startOf('week');
        while (cursor.isBefore(monthEnd) || cursor.isSame(monthEnd, 'week')) {
          const weekStart = cursor;
          const weekEnd = cursor.endOf('week');
          weeks.push({ start: weekStart, end: weekEnd });
          cursor = cursor.add(1, 'week');
        }
        return weeks.map((w, i) => {
          // Sum all data for this week
          const periodData = rawData.filter((d) => d.startDate && dayjs(d.startDate).isSame(w.start, 'week'));
          const totalIncome = periodData.reduce((sum, d) => sum + (d.totalIncome ?? 0), 0);
          const totalExpenses = periodData.reduce((sum, d) => sum + (d.totalExpenses ?? 0), 0);
          const totalNet = periodData.reduce((sum, d) => sum + (d.netAmount ?? 0), 0);
          return {
            label: `W${i + 1}`,
            weekStart: w.start.toISOString(),
            weekEnd: w.end.toISOString(),
            totalIncome,
            totalExpenses,
            totalNet,
          };
        });
      } else {
        // Show all months in the selected year
        const year = start.startOf('year');
        return Array.from({ length: 12 }).map((_, i) => {
          const month = year.month(i);
          // Sum all data for this month
          const periodData = rawData.filter((d) => d.startDate && dayjs(d.startDate).isSame(month, 'month'));
          const totalIncome = periodData.reduce((sum, d) => sum + (d.totalIncome ?? 0), 0);
          const totalExpenses = periodData.reduce((sum, d) => sum + (d.totalExpenses ?? 0), 0);
          const totalNet = periodData.reduce((sum, d) => sum + (d.netAmount ?? 0), 0);
          return {
            label: month.format('MMM'),
            month: month.toISOString(),
            totalIncome,
            totalExpenses,
            totalNet,
          };
        });
      }
    },
    [startDate]
  );

  const handlePeriodCardClick = React.useCallback(
    async (period: SummaryTransactionsPeriod[number]) => {
      if (periodType === 'monthly' && period.startDate) {
        // navigate to weekly view for the clicked month
        const clickedMonth = dayjs(period.startDate).startOf('month');
        actions.updateDateRange({
          start: clickedMonth.toDate(),
          end: clickedMonth.endOf('month').toDate(),
        });
      } else if (periodType === 'weekly' && period.startDate && period.endDate) {
        // navigate to transactions for the specific week
        await navigate({
          to: '/transactions/period',
          search: {
            startDate: dayjs(period.startDate).toISOString(),
            endDate: dayjs(period.endDate).toISOString(),
          },
        });
      }
    },
    [periodType, actions, navigate]
  );

  // filter period type for this component (only weekly/monthly)
  const filteredPeriodType = periodType === 'yearly' ? 'monthly' : periodType;

  return (
    <Tile className="p-6">
      {queryState.isFetching ? (
        <MobilePeriodBreakdownLoader count={5} />
      ) : (
        <div className="space-y-6">
          <LineChart
            data={getChartData(filteredPeriodType, data ?? [])}
            xKey="label"
            dataKey={['totalIncome', 'totalExpenses']}
          />
          <MobilePeriodBreakdownCardList
            periods={groupedData}
            periodType={filteredPeriodType}
            onPeriodClick={handlePeriodCardClick}
          />
        </div>
      )}
    </Tile>
  );
};
