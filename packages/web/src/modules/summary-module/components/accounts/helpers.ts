import dayjs from 'dayjs';

export function getPeriodRange(periodType: 'weekly' | 'monthly' | 'yearly', periodIndex: number) {
  const now = dayjs();
  if (periodType === 'weekly') {
    const start = now.startOf('week').subtract(periodIndex, 'week');
    const end = start.endOf('week');
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }
  if (periodType === 'monthly') {
    const start = now.startOf('month').subtract(periodIndex, 'month');
    const end = start.endOf('month');
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }
  if (periodType === 'yearly') {
    const start = now.startOf('year').subtract(periodIndex, 'year');
    const end = start.endOf('year');
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }
  return { startDate: undefined, endDate: undefined };
}
