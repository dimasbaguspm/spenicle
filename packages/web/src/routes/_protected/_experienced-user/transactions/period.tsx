import { createFileRoute, useSearch } from '@tanstack/react-router';
import dayjs from 'dayjs';

import { PageHeader, PageLayout } from '../../../../components';
import { PeriodTransactionList, TransactionFilterEntry } from '../../../../modules/transaction-module';

export const Route = createFileRoute('/_protected/_experienced-user/transactions/period')({
  component: RouteComponent,
});

function RouteComponent() {
  const { startDate, endDate } = useSearch({
    strict: false,
    select: (bar) => {
      const { startDate: unsanitizedStartDate, endDate: unsanitizedEndDate } = bar ?? {};

      const defaultStartDate = dayjs().startOf('month');
      const defaultEndDate = dayjs().endOf('day');

      const start = unsanitizedStartDate ? dayjs(unsanitizedStartDate).startOf('day') : dayjs(defaultStartDate);
      const end = unsanitizedEndDate ? dayjs(unsanitizedEndDate).endOf('day') : dayjs(defaultEndDate);

      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    },
  });

  return (
    <PageLayout
      background="cream"
      mainProps={{ padding: 'none' }}
      header={
        <div>
          <PageHeader
            title="Transactions Period"
            showBackButton
            rightContent={
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-medium text-primary-700 bg-primary-50 rounded px-2 py-0.5"
                  aria-label={`Selected period: ${formatPeriod(startDate, endDate)}`}
                >
                  {formatPeriod(startDate, endDate)}
                </span>
              </div>
            }
            className="p-4 pb-0 mb-2"
          />
        </div>
      }
    >
      <PeriodTransactionList startDate={startDate} endDate={endDate} />

      <TransactionFilterEntry />
    </PageLayout>
  );
}

// Helper to format the period concisely
function formatPeriod(start: string, end: string): string {
  const s = dayjs(start);
  const e = dayjs(end);
  if (s.isSame(e, 'month') && s.date() === 1 && e.date() === e.daysInMonth()) {
    // Full month
    return s.format('MMM YYYY');
  }
  if (s.isSame(e, 'month')) {
    return `${s.format('MMM D')} - ${e.format('D, YYYY')}`;
  }
  if (s.year() === e.year()) {
    return `${s.format('MMM D')} - ${e.format('MMM D, YYYY')}`;
  }
  // Different years
  return `${s.format('MMM D, YYYY')} - ${e.format('MMM D, YYYY')}`;
}
