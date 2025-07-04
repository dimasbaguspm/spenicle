import dayjs from 'dayjs';

// Helper to get period range for summary queries
export function getPeriodRange(periodType: 'weekly' | 'monthly' | 'yearly', periodIndex: number) {
  const now = dayjs();
  if (periodType === 'weekly') {
    // Go back periodIndex weeks from current week
    const start = now.startOf('week').subtract(periodIndex, 'week');
    const end = start.endOf('week');
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  } else if (periodType === 'monthly') {
    // Go back periodIndex months from current month
    const start = now.startOf('month').subtract(periodIndex, 'month');
    const end = start.endOf('month');
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  } else {
    // yearly
    const start = now.startOf('year').subtract(periodIndex, 'year');
    const end = start.endOf('year');
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }
}
