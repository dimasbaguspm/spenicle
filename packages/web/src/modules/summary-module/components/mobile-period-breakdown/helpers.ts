import dayjs from 'dayjs';

import type { SummaryTransactionsPeriod } from '../../../../types/api';

export function groupPeriods(
  data: SummaryTransactionsPeriod,
  periodType: 'weekly' | 'monthly',
  options?: { selectedMonth?: dayjs.Dayjs; selectedYear?: dayjs.Dayjs }
): SummaryTransactionsPeriod {
  if (!data || data.length === 0) {
    if (periodType === 'weekly' && options?.selectedMonth) {
      const startOfMonth = options.selectedMonth.startOf('month');
      const endOfMonth = options.selectedMonth.endOf('month');
      const weeks: SummaryTransactionsPeriod = [];
      let weekStart = startOfMonth.startOf('week');
      while (weekStart.isBefore(endOfMonth) || weekStart.isSame(endOfMonth, 'week')) {
        const weekEnd = weekStart.endOf('week');
        weeks.push({
          startDate: weekStart.format('YYYY-MM-DD'),
          endDate: weekEnd.format('YYYY-MM-DD'),
          totalIncome: 0,
          totalExpenses: 0,
          netAmount: 0,
        });
        weekStart = weekStart.add(1, 'week');
      }
      return weeks;
    }
    return [];
  }
  const now = dayjs();
  if (periodType === 'monthly') {
    const months: Record<string, SummaryTransactionsPeriod[number]> = {};
    data.forEach((item) => {
      if (!item.startDate) return;
      const monthKey = dayjs(item.startDate).startOf('month').format('YYYY-MM');
      if (dayjs(item.startDate).isAfter(now, 'month')) return;
      if (!months[monthKey]) {
        months[monthKey] = {
          startDate: item.startDate,
          endDate: item.endDate,
          totalIncome: 0,
          totalExpenses: 0,
          netAmount: 0,
        };
      }
      months[monthKey].totalIncome = (months[monthKey].totalIncome ?? 0) + (item.totalIncome ?? 0);
      months[monthKey].totalExpenses = (months[monthKey].totalExpenses ?? 0) + (item.totalExpenses ?? 0);
      months[monthKey].netAmount = (months[monthKey].netAmount ?? 0) + (item.netAmount ?? 0);
      if (!months[monthKey].endDate || dayjs(item.endDate).isAfter(dayjs(months[monthKey].endDate))) {
        months[monthKey].endDate = item.endDate;
      }
      if (!months[monthKey].startDate || dayjs(item.startDate).isBefore(dayjs(months[monthKey].startDate))) {
        months[monthKey].startDate = item.startDate;
      }
    });
    return Object.values(months).sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)));
  }
  // For weekly: only include a week in a month if its endOf('week') is in the selected month
  const weeks: Record<string, SummaryTransactionsPeriod[number]> = {};
  const selectedMonth = options?.selectedMonth ?? now;
  const startOfMonth = selectedMonth.startOf('month');
  const endOfMonth = selectedMonth.endOf('month');
  let weekStart = startOfMonth.startOf('week');
  while (weekStart.isBefore(endOfMonth) || weekStart.isSame(endOfMonth, 'week')) {
    const weekEnd = weekStart.endOf('week');
    // Only include week if its endOf('week') is in the selected month
    if (weekEnd.isSame(selectedMonth, 'month')) {
      const weekKey = weekStart.format('YYYY-MM-DD');
      weeks[weekKey] = {
        startDate: weekStart.format('YYYY-MM-DD'),
        endDate: weekEnd.format('YYYY-MM-DD'),
        totalIncome: 0,
        totalExpenses: 0,
        netAmount: 0,
      };
    }
    weekStart = weekStart.add(1, 'week');
  }
  data.forEach((item) => {
    if (!item.startDate) return;
    const d = dayjs(item.startDate);
    const weekStartOfItem = d.startOf('week');
    const weekEndOfItem = d.endOf('week');
    // Only group items whose week end is in the selected month
    if (weekEndOfItem.isSame(selectedMonth, 'month')) {
      const weekKey = weekStartOfItem.format('YYYY-MM-DD');
      if (weeks[weekKey]) {
        weeks[weekKey] = {
          ...weeks[weekKey],
          totalIncome: (weeks[weekKey].totalIncome ?? 0) + (item.totalIncome ?? 0),
          totalExpenses: (weeks[weekKey].totalExpenses ?? 0) + (item.totalExpenses ?? 0),
          netAmount: (weeks[weekKey].netAmount ?? 0) + (item.netAmount ?? 0),
          endDate:
            !weeks[weekKey].endDate || dayjs(item.endDate).isAfter(dayjs(weeks[weekKey].endDate))
              ? item.endDate
              : weeks[weekKey].endDate,
          startDate:
            !weeks[weekKey].startDate || dayjs(item.startDate).isBefore(dayjs(weeks[weekKey].startDate))
              ? item.startDate
              : weeks[weekKey].startDate,
        };
      }
    }
  });
  let result = Object.values(weeks).sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)));
  if (selectedMonth.isSame(now, 'month')) {
    result = result.filter((w) => !dayjs(w.startDate).isAfter(now, 'week'));
  }
  return result;
}

// Helper to compute start/end date for a given period type and index
export const getPeriodRange = (type: 'weekly' | 'monthly', index: number) => {
  const now = dayjs();
  if (type === 'weekly') {
    const start = now.startOf('month').subtract(index, 'month');
    const end = now.endOf('month').subtract(index, 'month');
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  } else {
    const start = now.startOf('year').subtract(index, 'year');
    const end = now.endOf('year').subtract(index, 'year');
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }
};

export function formatDateRange(startDate: string, endDate: string, type: 'weekly' | 'monthly') {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  if (type === 'weekly') {
    if (start.month() === end.month()) {
      return `${start.format('D')} - ${end.format('D MMM')}`;
    }
    return `${start.format('D MMM')} - ${end.format('D MMM')}`;
  }
  return start.format('MMMM YYYY');
}
