import dayjs from 'dayjs';

import type { PeriodType } from '../../hooks/use-desktop-summary-filters';

export interface PeriodOption {
  label: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  isFuture: boolean;
}

/**
 * Generates period options based on type and navigation date
 */
export const generatePeriodOptions = (periodType: PeriodType, navigationDate: dayjs.Dayjs): PeriodOption[] => {
  const now = dayjs();

  switch (periodType) {
    case 'weekly': {
      return generateWeeklyOptions(navigationDate, now);
    }

    case 'monthly': {
      return generateMonthlyOptions(navigationDate, now);
    }

    case 'yearly': {
      return generateYearlyOptions(navigationDate, now);
    }

    default:
      return [];
  }
};

/**
 * Generates weekly period options for a given month
 */
const generateWeeklyOptions = (navigationDate: dayjs.Dayjs, now: dayjs.Dayjs): PeriodOption[] => {
  const monthStart = navigationDate.startOf('month');
  const monthEnd = navigationDate.endOf('month');
  const weeks: PeriodOption[] = [];

  // start from a bit before the month to catch weeks that might belong to this month
  let cursor = monthStart.subtract(1, 'week').startOf('week');

  // continue until we're well past the month end
  while (cursor.isSameOrBefore(monthEnd.add(1, 'week'), 'week')) {
    const weekStart = cursor;
    const weekEnd = cursor.endOf('week');

    // check if this week should be included in the current navigation month
    const shouldInclude = shouldIncludeWeekInMonth(weekStart, weekEnd, monthStart, monthEnd);

    if (shouldInclude) {
      const isCurrent = weekStart.isSame(now, 'week');
      const isFuture = weekStart.isAfter(now, 'week');

      weeks.push({
        label: `${weekStart.format('MMM D')} - ${weekEnd.format('MMM D')}`,
        startDate: weekStart.toDate(),
        endDate: weekEnd.toDate(),
        isCurrent,
        isFuture,
      });
    }

    cursor = cursor.add(1, 'week');
  }

  return weeks;
};

/**
 * Determines if a week should be included in the current navigation month
 */
const shouldIncludeWeekInMonth = (
  weekStart: dayjs.Dayjs,
  weekEnd: dayjs.Dayjs,
  monthStart: dayjs.Dayjs,
  monthEnd: dayjs.Dayjs
): boolean => {
  // case 1: week contains dates from previous month AND current month
  if (weekStart.isBefore(monthStart) && weekEnd.isSameOrAfter(monthStart) && weekEnd.isSameOrBefore(monthEnd)) {
    return true;
  }
  // case 2: week is entirely within the current month
  if (weekStart.isSameOrAfter(monthStart) && weekEnd.isSameOrBefore(monthEnd)) {
    return true;
  }
  // case 3: week contains dates from current month AND next month (exclude from current month)
  if (weekStart.isSameOrAfter(monthStart) && weekStart.isSameOrBefore(monthEnd) && weekEnd.isAfter(monthEnd)) {
    return false;
  }

  return false;
};

/**
 * Generates monthly period options for a given year
 */
const generateMonthlyOptions = (navigationDate: dayjs.Dayjs, now: dayjs.Dayjs): PeriodOption[] => {
  const year = navigationDate.year();
  const months: PeriodOption[] = [];

  for (let i = 0; i < 12; i++) {
    const monthStart = dayjs().year(year).month(i).startOf('month');
    const monthEnd = monthStart.endOf('month');
    const isCurrent = monthStart.isSame(now, 'month');
    const isFuture = monthStart.isAfter(now, 'month');

    months.push({
      label: monthStart.format('MMMM'),
      startDate: monthStart.toDate(),
      endDate: monthEnd.toDate(),
      isCurrent,
      isFuture,
    });
  }

  return months;
};

/**
 * Generates yearly period options
 */
const generateYearlyOptions = (_navigationDate: dayjs.Dayjs, now: dayjs.Dayjs): PeriodOption[] => {
  const currentYear = now.year();
  const years: PeriodOption[] = [];

  for (let i = -2; i <= 1; i++) {
    const year = currentYear + i;
    const yearStart = dayjs().year(year).startOf('year');
    const yearEnd = yearStart.endOf('year');
    const isCurrent = yearStart.isSame(now, 'year');
    const isFuture = yearStart.isAfter(now, 'year');

    years.push({
      label: yearStart.format('YYYY'),
      startDate: yearStart.toDate(),
      endDate: yearEnd.toDate(),
      isCurrent,
      isFuture,
    });
  }

  return years;
};

/**
 * Checks if forward navigation is possible for the given period type
 */
export const canNavigateForward = (periodType: PeriodType, navigationDate: dayjs.Dayjs): boolean => {
  const now = dayjs();

  switch (periodType) {
    case 'weekly': {
      // can navigate forward if next month contains any non-future weeks
      const nextMonth = navigationDate.add(1, 'month');
      const nextMonthStart = nextMonth.startOf('month');
      const nextMonthEnd = nextMonth.endOf('month');

      // find the first week that overlaps with the next month
      let cursor = nextMonthStart.startOf('week');
      while (cursor.isBefore(nextMonthEnd.endOf('week'))) {
        const weekStart = cursor;
        const weekEnd = cursor.endOf('week');

        // check if this week has any days in the next month and is not future
        if (
          weekEnd.isAfter(nextMonthStart.subtract(1, 'day')) &&
          weekStart.isBefore(nextMonthEnd.add(1, 'day')) &&
          !weekStart.isAfter(now, 'week')
        ) {
          return true;
        }
        cursor = cursor.add(1, 'week');
      }
      return false;
    }

    case 'monthly': {
      // can navigate forward if next year contains any non-future months
      const nextYear = navigationDate.add(1, 'year').year();
      return nextYear <= now.year();
    }

    case 'yearly': {
      // can navigate forward if the next year range contains any non-future years
      const nextRangeStartYear = navigationDate.year() + 2; // next range starts 4 years forward from current - 2
      return nextRangeStartYear <= now.year();
    }

    default:
      return false;
  }
};

/**
 * Gets the navigation title for the current period type and date
 */
export const getNavigationTitle = (periodType: PeriodType, navigationDate: dayjs.Dayjs): string => {
  switch (periodType) {
    case 'weekly':
      return navigationDate.format('MMMM YYYY');
    case 'monthly':
      return navigationDate.format('YYYY');
    case 'yearly': {
      const startYear = navigationDate.year() - 2;
      const endYear = navigationDate.year() + 1;
      return `${startYear} - ${endYear}`;
    }
    default:
      return '';
  }
};

/**
 * Calculates the next navigation date based on period type
 */
export const getNextNavigationDate = (
  periodType: PeriodType,
  currentDate: dayjs.Dayjs,
  direction: 'forward' | 'back'
): dayjs.Dayjs => {
  const multiplier = direction === 'forward' ? 1 : -1;

  switch (periodType) {
    case 'weekly':
      return currentDate.add(multiplier, 'month');
    case 'monthly':
      return currentDate.add(multiplier, 'year');
    case 'yearly':
      return currentDate.add(multiplier * 4, 'years');
    default:
      return currentDate;
  }
};
