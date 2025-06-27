import { useSearch } from '@tanstack/react-router';
import dayjs from 'dayjs';
import type { FC } from 'react';

import { PageLayout } from '../../../components';
import { PeriodTransactionList } from '../components/period-transaction-list';
import { TransactionFilterEntry } from '../components/transaction-filter-entry';
import { TransactionPeriodInsightsWidget } from '../components/transaction-period-insights-widget';

export const MobileTransactionPeriodPage: FC = () => {
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
    <PageLayout title="Period Analysis" showBackButton>
      <div className="space-y-4 p-4">
        <TransactionPeriodInsightsWidget startDate={startDate} endDate={endDate} className="mb-4" />
      </div>
      <PeriodTransactionList startDate={startDate} endDate={endDate} />
      <TransactionFilterEntry />
    </PageLayout>
  );
};
