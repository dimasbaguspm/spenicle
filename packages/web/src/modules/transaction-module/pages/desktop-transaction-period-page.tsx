import { useSearch } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { type FC } from 'react';

import { PageLayout } from '../../../components';
import { DesktopTransactionOverviewWidget } from '../components/desktop-transaction-overview-widget';
import { DesktopTransactionPeriodSidebar } from '../components/desktop-transaction-period-sidebar';
import { PeriodTransactionList } from '../components/period-transaction-list';

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
    <PageLayout background="cream" title="Transaction Period Analysis" showBackButton>
      <div className="flex flex-col gap-6">
        {/* main content grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* left sidebar with filters only */}
          <DesktopTransactionPeriodSidebar />

          {/* main content area */}
          <div className="col-span-9 space-y-6">
            {/* period transaction insights */}
            <DesktopTransactionOverviewWidget
              startDate={startDate}
              endDate={endDate}
              title="Period Overview"
              subtitle={`${dayjs(startDate).format('MMM D')} - ${dayjs(endDate).format('MMM D, YYYY')}`}
              description="Financial metrics and transaction summary for the selected period"
            />

            {/* transactions chart and list */}
            <div className="bg-white rounded-lg border border-mist-200 p-6 min-h-[600px]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Transaction Analysis</h2>
                  <p className="text-sm text-slate-500 mt-1">Detailed breakdown with charts and transaction list</p>
                </div>
              </div>

              {/* main transaction list with charts */}
              <PeriodTransactionList startDate={startDate} endDate={endDate} />
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};
