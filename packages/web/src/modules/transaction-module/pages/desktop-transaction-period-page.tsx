import { useSearch } from '@tanstack/react-router';
import dayjs from 'dayjs';
import type { FC } from 'react';

import { PageLayout } from '../../../components';
import { PeriodTransactionList } from '../components/period-transaction-list';
import { TransactionFilterEntry } from '../components/transaction-filter-entry';

export const DesktopTransactionPeriodPage: FC = () => {
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
    <PageLayout>
      <PeriodTransactionList startDate={startDate} endDate={endDate} />
      <TransactionFilterEntry />
    </PageLayout>
  );
};
