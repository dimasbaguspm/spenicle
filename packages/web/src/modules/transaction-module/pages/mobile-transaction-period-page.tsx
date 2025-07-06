import { useSearch } from '@tanstack/react-router';
import dayjs from 'dayjs';
import type { FC } from 'react';

import { PageLayout } from '../../../components';
import { DesktopTransactionOverviewWidget } from '../components/desktop-transaction-overview-widget';
import { PeriodTransactionList } from '../components/period-transaction-list';

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
        <DesktopTransactionOverviewWidget
          startDate={startDate}
          endDate={endDate}
          title="Period Overview"
          subtitle={`${dayjs(startDate).format('MMM D')} - ${dayjs(endDate).format('MMM D, YYYY')}`}
          description="Financial metrics and transaction summary for the selected period"
          className="mb-4"
        />
      </div>
      <PeriodTransactionList startDate={startDate} endDate={endDate} />
    </PageLayout>
  );
};
