import dayjs from 'dayjs';
import { useMemo } from 'react';

import type { SummaryTransactionsPeriod } from '../../../../../types/api';
import type { PeriodType } from '../../../hooks';

interface UsePeriodBreakdownDataProps {
  data: SummaryTransactionsPeriod;
  periodType: PeriodType;
  startDate: Date;
}

export function usePeriodBreakdownData({ data, periodType, startDate }: UsePeriodBreakdownDataProps) {
  return useMemo(() => {
    const start = dayjs(startDate);
    const now = dayjs();

    if (periodType === 'weekly') {
      const weekStart = start.startOf('week');
      const weekEnd = start.endOf('week');
      const days: SummaryTransactionsPeriod = [];
      let cursor = weekStart;
      while (cursor.isSameOrBefore(weekEnd, 'day') && cursor.isSameOrBefore(now, 'day')) {
        const dayData = (data ?? []).filter((item) => item.startDate && dayjs(item.startDate).isSame(cursor, 'day'));
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
      const monthStart = start.startOf('month');
      const monthEnd = start.endOf('month');
      const currentMonth = start.month();
      const weeks: SummaryTransactionsPeriod = [];
      let cursor = monthStart.startOf('week');
      while (cursor.isBefore(monthEnd) || cursor.isSame(monthEnd, 'week')) {
        const weekStart = cursor;
        const weekEnd = cursor.endOf('week');
        const weekExtendsToNextMonth = weekEnd.month() > currentMonth;
        const shouldIncludeWeek = weekStart.isSameOrBefore(now, 'week') && !weekExtendsToNextMonth;
        if (shouldIncludeWeek) {
          const weekData = (data ?? []).filter(
            (item) => item.startDate && dayjs(item.startDate).isSame(weekStart, 'week')
          );
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
      const yearStart = start.startOf('year');
      const currentMonth = now.month();
      const currentYear = now.year();
      const selectedYear = start.year();
      const months: SummaryTransactionsPeriod = [];
      const lastMonthToShow = selectedYear === currentYear ? currentMonth : 11;
      for (let monthIndex = 0; monthIndex <= lastMonthToShow; monthIndex++) {
        const monthStart = yearStart.month(monthIndex);
        const monthData = (data ?? []).filter(
          (item) => item.startDate && dayjs(item.startDate).isSame(monthStart, 'month')
        );
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
}
