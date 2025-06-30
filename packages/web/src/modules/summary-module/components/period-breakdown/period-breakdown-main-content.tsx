import { useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import React from 'react';

import { Tile, LineChart, DataTable } from '../../../../components';
import { useApiSummaryTransactionsQuery } from '../../../../hooks';
import type { SummaryTransactionsPeriod } from '../../../../types/api';
import type { PeriodType } from '../../hooks';

import { PeriodBreakdownLoader } from './period-breakdown-loader';
import { createPeriodBreakdownColumns } from './period-breakdown-table-config';

export interface PeriodBreakdownMainContentProps {
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
export const PeriodBreakdownMainContent: React.FC<PeriodBreakdownMainContentProps> = ({
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

  const groupedData = React.useMemo(() => {
    const start = dayjs(startDate);
    const now = dayjs();

    if (periodType === 'weekly') {
      // for weekly view, create daily entries for each day of the week
      const weekStart = start.startOf('week');
      const weekEnd = start.endOf('week');
      const days: SummaryTransactionsPeriod = [];

      let cursor = weekStart;
      while (cursor.isSameOrBefore(weekEnd, 'day') && cursor.isSameOrBefore(now, 'day')) {
        // find data for this specific day
        const dayData = (data ?? []).filter((item) => item.startDate && dayjs(item.startDate).isSame(cursor, 'day'));

        // aggregate data for this day
        const totalIncome = dayData.reduce((sum, item) => sum + (item.totalIncome ?? 0), 0);
        const totalExpenses = dayData.reduce((sum, item) => sum + (item.totalExpenses ?? 0), 0);
        const netAmount = dayData.reduce((sum, item) => sum + (item.netAmount ?? 0), 0);

        days.push({
          startDate: cursor.format('YYYY-MM-DD'),
          endDate: cursor.format('YYYY-MM-DD'),
          totalIncome,
          totalExpenses,
          netAmount,
        });

        cursor = cursor.add(1, 'day');
      }

      return days;
    } else if (periodType === 'monthly') {
      // for monthly view, create weekly entries for each week in the month
      const monthStart = start.startOf('month');
      const monthEnd = start.endOf('month');
      const currentMonth = start.month();

      const weeks: SummaryTransactionsPeriod = [];

      let cursor = monthStart.startOf('week');
      while (cursor.isBefore(monthEnd) || cursor.isSame(monthEnd, 'week')) {
        const weekStart = cursor;
        const weekEnd = cursor.endOf('week');

        // only include this week if:
        // 1. it's up to the current week, AND
        // 2. if the week extends into next month, don't include it (show it in next month instead)
        // 3. if the week starts from previous month, include it (it belongs to current month)
        const weekExtendsToNextMonth = weekEnd.month() > currentMonth;
        const shouldIncludeWeek = weekStart.isSameOrBefore(now, 'week') && !weekExtendsToNextMonth;

        if (shouldIncludeWeek) {
          // find data for this specific week
          const weekData = (data ?? []).filter(
            (item) => item.startDate && dayjs(item.startDate).isSame(weekStart, 'week')
          );

          // aggregate data for this week
          const totalIncome = weekData.reduce((sum, item) => sum + (item.totalIncome ?? 0), 0);
          const totalExpenses = weekData.reduce((sum, item) => sum + (item.totalExpenses ?? 0), 0);
          const netAmount = weekData.reduce((sum, item) => sum + (item.netAmount ?? 0), 0);

          weeks.push({
            startDate: weekStart.format('YYYY-MM-DD'),
            endDate: weekEnd.format('YYYY-MM-DD'),
            totalIncome,
            totalExpenses,
            netAmount,
          });
        }

        cursor = cursor.add(1, 'week');
      }

      return weeks;
    } else {
      // for yearly view, show months within the selected year up to current month
      const yearStart = start.startOf('year');
      const currentMonth = now.month();
      const currentYear = now.year();
      const selectedYear = start.year();

      const months: SummaryTransactionsPeriod = [];

      // determine the last month to show
      const lastMonthToShow = selectedYear === currentYear ? currentMonth : 11; // 11 = December (0-indexed)

      for (let monthIndex = 0; monthIndex <= lastMonthToShow; monthIndex++) {
        const monthStart = yearStart.month(monthIndex);

        // find data for this specific month
        const monthData = (data ?? []).filter(
          (item) => item.startDate && dayjs(item.startDate).isSame(monthStart, 'month')
        );

        // aggregate data for this month
        const totalIncome = monthData.reduce((sum, item) => sum + (item.totalIncome ?? 0), 0);
        const totalExpenses = monthData.reduce((sum, item) => sum + (item.totalExpenses ?? 0), 0);
        const netAmount = monthData.reduce((sum, item) => sum + (item.netAmount ?? 0), 0);

        months.push({
          startDate: monthStart.format('YYYY-MM-DD'),
          endDate: monthStart.endOf('month').format('YYYY-MM-DD'),
          totalIncome,
          totalExpenses,
          netAmount,
        });
      }

      return months;
    }
  }, [data, periodType, startDate]);

  /**
   * Remap summary data for the chart with enhanced display labels
   */
  const getChartData = React.useCallback(
    (rawData: SummaryTransactionsPeriod[number][]) => {
      const start = dayjs(startDate);
      const now = dayjs();

      if (periodType === 'weekly') {
        // show days in the selected week (Monday to Sunday), but only up to today
        const weekStart = start.startOf('week');
        const weekEnd = start.endOf('week');
        const days: dayjs.Dayjs[] = [];
        let cursor = weekStart;
        while (cursor.isSameOrBefore(weekEnd, 'day') && cursor.isSameOrBefore(now, 'day')) {
          days.push(cursor);
          cursor = cursor.add(1, 'day');
        }

        return days.map((day) => {
          // sum all data for this day
          const periodData = rawData.filter((d) => d.startDate && dayjs(d.startDate).isSame(day, 'day'));
          const totalIncome = periodData.reduce((sum, d) => sum + (d.totalIncome ?? 0), 0);
          const totalExpenses = periodData.reduce((sum, d) => sum + (d.totalExpenses ?? 0), 0);
          const totalNet = periodData.reduce((sum, d) => sum + (d.netAmount ?? 0), 0);

          return {
            label: day.format('ddd D'),
            dayStart: day.toISOString(),
            totalIncome,
            totalExpenses,
            totalNet,
          };
        });
      } else if (periodType === 'monthly') {
        // for monthly view, show weeks within the month, only up to current week
        const monthStart = start.startOf('month');
        const monthEnd = start.endOf('month');
        const currentMonth = start.month();
        const weeks: { start: dayjs.Dayjs; end: dayjs.Dayjs }[] = [];
        let cursor = monthStart.startOf('week');
        while (cursor.isBefore(monthEnd) || cursor.isSame(monthEnd, 'week')) {
          const weekStart = cursor;
          const weekEnd = cursor.endOf('week');

          // only include this week if:
          // 1. it's up to the current week, AND
          // 2. if the week extends into next month, don't include it (show it in next month instead)
          // 3. if the week starts from previous month, include it (it belongs to current month)
          const weekExtendsToNextMonth = weekEnd.month() > currentMonth;
          const shouldIncludeWeek = weekStart.isSameOrBefore(now, 'week') && !weekExtendsToNextMonth;

          if (shouldIncludeWeek) {
            weeks.push({ start: weekStart, end: weekEnd });
          }

          cursor = cursor.add(1, 'week');
        }

        return weeks.map((w) => {
          // sum all data for this week
          const periodData = rawData.filter((d) => d.startDate && dayjs(d.startDate).isSame(w.start, 'week'));
          const totalIncome = periodData.reduce((sum, d) => sum + (d.totalIncome ?? 0), 0);
          const totalExpenses = periodData.reduce((sum, d) => sum + (d.totalExpenses ?? 0), 0);
          const totalNet = periodData.reduce((sum, d) => sum + (d.netAmount ?? 0), 0);

          // format week label with date range within the month bounds
          const weekStart = w.start;
          const weekEnd = w.end;
          const isSameMonth = weekStart.month() === weekEnd.month();

          let label = '';
          if (isSameMonth) {
            // if the week is within a single month, show start and end dates
            const startDay = weekStart.format('D');
            const endDay = weekEnd.format('D');
            const monthName = weekStart.format('MMM');
            label = `${startDay}-${endDay} ${monthName}`;
          } else {
            // if the week spans two months, show start and end dates with month names
            const startDay = weekStart.format('D');
            const endDay = weekEnd.format('D');
            const startMonthName = weekStart.format('MMM');
            const endMonthName = weekEnd.format('MMM');
            label = `${startDay} ${startMonthName} - ${endDay} ${endMonthName}`;
          }

          return {
            label,
            weekStart: w.start.toISOString(),
            weekEnd: w.end.toISOString(),
            totalIncome,
            totalExpenses,
            totalNet,
          };
        });
      } else {
        // show months in the selected year up to current month (yearly view)
        const yearStart = start.startOf('year');
        const currentMonth = now.month();
        const currentYear = now.year();
        const selectedYear = start.year();

        // determine the last month to show
        const lastMonthToShow = selectedYear === currentYear ? currentMonth : 11; // 11 = December (0-indexed)

        const months = [];
        for (let monthIndex = 0; monthIndex <= lastMonthToShow; monthIndex++) {
          const month = yearStart.month(monthIndex);
          // sum all data for this month
          const periodData = rawData.filter((d) => d.startDate && dayjs(d.startDate).isSame(month, 'month'));
          const totalIncome = periodData.reduce((sum, d) => sum + (d.totalIncome ?? 0), 0);
          const totalExpenses = periodData.reduce((sum, d) => sum + (d.totalExpenses ?? 0), 0);
          const totalNet = periodData.reduce((sum, d) => sum + (d.netAmount ?? 0), 0);

          months.push({
            label: month.format('MMM'),
            month: month.toISOString(),
            totalIncome,
            totalExpenses,
            totalNet,
          });
        }

        return months;
      }
    },
    [startDate, periodType]
  );

  /**
   * enhanced table data with labels and transaction counts
   */
  const enrichedTableData = React.useMemo(() => {
    const tableData = groupedData.map((period) => {
      let label = '';

      if (periodType === 'weekly' && period.startDate) {
        // for weekly period type, show individual day labels (Monday, Tuesday, etc.)
        const day = dayjs(period.startDate);
        label = day.format('dddd, MMM D');
      } else if (periodType === 'monthly' && period.startDate && period.endDate) {
        // for monthly period type, show week date ranges (1-7 Jan, 8-14 Jan, etc.)
        const weekStart = dayjs(period.startDate);
        const weekEnd = dayjs(period.endDate);

        const isSameMonth = weekStart.month() === weekEnd.month();
        if (isSameMonth) {
          label = `${weekStart.format('D')} - ${weekEnd.format('D')} ${weekEnd.format('MMM')}`;
        } else {
          // if the week spans two months, show start and end dates with month names
          const startMonth = weekStart.format('MMM');
          const endMonth = weekEnd.format('MMM');
          label = `${weekStart.format('D')} ${startMonth} - ${weekEnd.format('D')} ${endMonth}`;
        }
      } else if (periodType === 'yearly' && period.startDate) {
        // for yearly period type, show month names
        label = dayjs(period.startDate).format('MMMM YYYY');
      }

      return {
        ...period,
        label,
        transactionCount: 0, // todo: derive from actual transaction count if available
      };
    });

    // for weekly, monthly, and yearly periods, reverse the order so most recent period is at the top
    if (periodType === 'weekly' || periodType === 'monthly' || periodType === 'yearly') {
      return tableData.reverse();
    }

    return tableData;
  }, [groupedData, periodType]);

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

  const columns = createPeriodBreakdownColumns(periodType, handlePeriodCardClick);

  if (queryState.isFetching) {
    return (
      <div className="space-y-6">
        <Tile className="p-6">
          <PeriodBreakdownLoader count={5} />
        </Tile>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* enhanced chart display */}
      <Tile className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {periodType === 'weekly' ? 'Daily' : periodType === 'monthly' ? 'Weekly' : 'Monthly'} Financial Overview
            </h3>
            <p className="text-sm text-slate-600">Income and expenses breakdown for the selected period</p>
          </div>
          <LineChart data={getChartData(data ?? [])} xKey="label" dataKey={['totalIncome', 'totalExpenses']} />
        </div>
      </Tile>

      {/* enhanced data table */}
      <Tile className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Period Breakdown Details</h3>
            <p className="text-sm text-slate-600">
              Detailed financial metrics for each{' '}
              {periodType === 'weekly' ? 'day' : periodType === 'monthly' ? 'week' : 'month'}
            </p>
          </div>
          <DataTable
            data={enrichedTableData}
            columns={columns}
            emptyMessage="No period data available"
            emptyDescription="Try selecting a different time period or check back later"
            className="rounded-lg border border-mist-200"
          />
        </div>
      </Tile>
    </div>
  );
};
