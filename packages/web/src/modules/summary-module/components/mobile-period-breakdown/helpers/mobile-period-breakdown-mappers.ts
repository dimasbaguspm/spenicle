import dayjs from 'dayjs';

import type { SummaryTransactionsPeriod } from '../../../../../types/api';
import type { PeriodType } from '../../../hooks';

// chart data mapping - follows exact desktop pattern
export function mapChartData({
  rawData,
  startDate,
  periodType,
}: {
  rawData: SummaryTransactionsPeriod[number][];
  startDate: Date;
  periodType: PeriodType;
}) {
  const start = dayjs(startDate);
  const now = dayjs();

  if (periodType === 'weekly') {
    const weekStart = start.startOf('week');
    const weekEnd = start.endOf('week');
    const days: dayjs.Dayjs[] = [];
    let cursor = weekStart;
    while (cursor.isSameOrBefore(weekEnd, 'day') && cursor.isSameOrBefore(now, 'day')) {
      days.push(cursor);
      cursor = cursor.add(1, 'day');
    }
    return days.map((day) => {
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
    const monthStart = start.startOf('month');
    const monthEnd = start.endOf('month');
    const currentMonth = start.month();
    const weeks: { start: dayjs.Dayjs; end: dayjs.Dayjs }[] = [];
    let cursor = monthStart.startOf('week');
    while (cursor.isBefore(monthEnd) || cursor.isSame(monthEnd, 'week')) {
      const weekStart = cursor;
      const weekEnd = cursor.endOf('week');
      const weekExtendsToNextMonth = weekEnd.month() > currentMonth;
      const shouldIncludeWeek = weekStart.isSameOrBefore(now, 'week') && !weekExtendsToNextMonth;
      if (shouldIncludeWeek) {
        weeks.push({ start: weekStart, end: weekEnd });
      }
      cursor = cursor.add(1, 'week');
    }
    return weeks.map((w) => {
      const periodData = rawData.filter((d) => d.startDate && dayjs(d.startDate).isSame(w.start, 'week'));
      const totalIncome = periodData.reduce((sum, d) => sum + (d.totalIncome ?? 0), 0);
      const totalExpenses = periodData.reduce((sum, d) => sum + (d.totalExpenses ?? 0), 0);
      const totalNet = periodData.reduce((sum, d) => sum + (d.netAmount ?? 0), 0);
      const weekStart = w.start;
      const weekEnd = w.end;
      const isSameMonth = weekStart.month() === weekEnd.month();
      let label = '';
      if (isSameMonth) {
        const startDay = weekStart.format('D');
        const endDay = weekEnd.format('D');
        const monthName = weekStart.format('MMM');
        label = `${startDay}-${endDay} ${monthName}`;
      } else {
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
    const yearStart = start.startOf('year');
    const currentMonth = now.month();
    const currentYear = now.year();
    const selectedYear = start.year();
    const lastMonthToShow = selectedYear === currentYear ? currentMonth : 11;
    const months = [];
    for (let monthIndex = 0; monthIndex <= lastMonthToShow; monthIndex++) {
      const month = yearStart.month(monthIndex);
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
}

// table data mapping - follows exact desktop pattern
type EnrichedTableData = Array<SummaryTransactionsPeriod[number] & { label: string; transactionCount: number }>;

export function mapEnrichedTableData({
  groupedData,
  periodType,
}: {
  groupedData: SummaryTransactionsPeriod;
  periodType: PeriodType;
}): EnrichedTableData {
  const tableData = groupedData.map((period) => {
    let label = '';
    if (periodType === 'weekly' && period.startDate) {
      const day = dayjs(period.startDate);
      label = day.format('dddd, MMM D');
    } else if (periodType === 'monthly' && period.startDate && period.endDate) {
      const weekStart = dayjs(period.startDate);
      const weekEnd = dayjs(period.endDate);
      const isSameMonth = weekStart.month() === weekEnd.month();
      if (isSameMonth) {
        label = `${weekStart.format('D')} - ${weekEnd.format('D')} ${weekEnd.format('MMM')}`;
      } else {
        const startMonth = weekStart.format('MMM');
        const endMonth = weekEnd.format('MMM');
        label = `${weekStart.format('D')} ${startMonth} - ${weekEnd.format('D')} ${endMonth}`;
      }
    } else if (periodType === 'yearly' && period.startDate) {
      label = dayjs(period.startDate).format('MMMM YYYY');
    }
    return {
      ...period,
      label,
      transactionCount: period.totalTransactions ?? 0,
    };
  });
  if (periodType === 'weekly' || periodType === 'monthly' || periodType === 'yearly') {
    return tableData.reverse();
  }
  return tableData;
}
