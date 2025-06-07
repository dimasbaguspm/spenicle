import { useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import React from 'react';

import { Tile, LineChart } from '../../../../components';
import { useApiSummaryTransactionsQuery } from '../../../../hooks';
import type { SummaryTransactionsPeriod } from '../../../../types/api';

import { getPeriodRange, groupPeriods } from './helpers';
import { PeriodBreakdownCardList } from './period-breakdown-card-list';
import { PeriodBreakdownHeader } from './period-breakdown-header';
import { PeriodBreakdownLoader } from './period-breakdown-loader';

export interface PeriodBreakdownProps {
  periodType: 'weekly' | 'monthly';
  periodIndex: number;
  setPeriodType: (type: 'weekly' | 'monthly') => void;
  setPeriodIndex: (index: number) => void;
}

export const PeriodBreakdown: React.FC<PeriodBreakdownProps> = ({
  periodType,
  periodIndex,
  setPeriodType,
  setPeriodIndex,
}) => {
  const now = dayjs();
  const selectedMonth = now.subtract(periodIndex, 'month');
  const selectedYear = now.subtract(periodIndex, 'year');
  const navigate = useNavigate();

  const { startDate, endDate } = React.useMemo(
    () => getPeriodRange(periodType, periodIndex),
    [periodType, periodIndex]
  );

  const [data, , queryState] = useApiSummaryTransactionsQuery(
    { startDate, endDate },
    {
      staleTime: 60000,
      gcTime: 300000,
    }
  );

  const groupedData = React.useMemo(() => {
    if (periodType === 'weekly') {
      return groupPeriods(
        (data ?? []).filter(
          (item) => dayjs(item.startDate).isSame(selectedMonth, 'month') && !dayjs(item.startDate).isAfter(now, 'week')
        ),
        'weekly',
        { selectedMonth }
      );
    } else {
      return groupPeriods(
        (data ?? []).filter(
          (item) => dayjs(item.startDate).isSame(selectedYear, 'year') && !dayjs(item.startDate).isAfter(now, 'month')
        ),
        'monthly'
      );
    }
  }, [data, periodType, periodIndex]);

  /**
   * Remap summary data for the chart:
   * - If weekly: show all weeks in the selected month (W1, W2, ...)
   * - If monthly: show all months in the selected year (Jan, Feb, ...)
   * Fills missing periods with zeroes for chart continuity and clarity.
   */
  function getChartData(
    chartPeriodType: 'weekly' | 'monthly',
    chartPeriodIndex: number,
    rawData: SummaryTransactionsPeriod[number][]
  ) {
    const chartNow = dayjs();
    if (chartPeriodType === 'weekly') {
      // Show all weeks in the selected month
      const chartMonth = chartNow.subtract(chartPeriodIndex, 'month');
      const monthStart = chartMonth.startOf('month');
      const monthEnd = chartMonth.endOf('month');
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
      const chartYear = chartNow.subtract(chartPeriodIndex, 'year');
      return Array.from({ length: 12 }).map((_, i) => {
        const month = chartYear.month(i);
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
  }

  const handlePeriodCardClick = React.useCallback(
    async (period: SummaryTransactionsPeriod[number]) => {
      if (periodType === 'monthly' && period.startDate) {
        const clickedMonth = dayjs(period.startDate).startOf('month');

        const newPeriodIndex = now.startOf('month').diff(clickedMonth, 'month');
        setPeriodType('weekly');
        setPeriodIndex(newPeriodIndex);
      } else if (periodType === 'weekly' && period.startDate && period.endDate) {
        await navigate({
          to: '/transactions/period',
          search: {
            startDate: dayjs(period.startDate).toISOString(),
            endDate: dayjs(period.endDate).toISOString(),
          },
        });
      }
    },
    [periodType, setPeriodType, setPeriodIndex, now, navigate]
  );

  return (
    <Tile className="p-6">
      <PeriodBreakdownHeader
        periodType={periodType}
        periodIndex={periodIndex}
        setPeriodType={setPeriodType}
        setPeriodIndex={setPeriodIndex}
      />
      {queryState.isFetching ? (
        <PeriodBreakdownLoader count={5} />
      ) : (
        <div className="space-y-6">
          <LineChart
            data={getChartData(periodType, periodIndex, data ?? [])}
            xKey="label"
            dataKey={['totalIncome', 'totalExpenses']}
          />
          <PeriodBreakdownCardList
            periods={groupedData}
            periodType={periodType}
            onPeriodClick={handlePeriodCardClick}
          />
        </div>
      )}
    </Tile>
  );
};
