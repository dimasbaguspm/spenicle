import { useSearch } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { type FC } from 'react';

import { PageLayout, Tile } from '../../../components';
import { PeriodTransactionList } from '../components/period-transaction-list';
import { TransactionFilterInline } from '../components/transaction-filter-inline';
import { TransactionPeriodInsightsWidget } from '../components/transaction-period-insights-widget';

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
      <div className="space-y-6">
        {/* Period Header with Key Stats */}
        <TransactionPeriodInsightsWidget startDate={startDate} endDate={endDate} />

        {/* Desktop Grid Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel: Filters and Controls - Sticky */}
          <div className="col-span-3">
            <div className="sticky top-6 space-y-4">
              <Tile className="p-4">
                <div className="space-y-1 mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Quick Filters</h3>
                  <p className="text-sm text-slate-500">Fast access filters</p>
                </div>
                <TransactionFilterInline />
              </Tile>
            </div>
          </div>

          {/* Right Panel: Transaction Data and Visualization */}
          <div className="col-span-9">
            <Tile className="p-6 min-h-[600px]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Transaction Analysis</h2>
                  <p className="text-sm text-slate-500 mt-1">Detailed breakdown with charts and transaction list</p>
                </div>
              </div>

              {/* Main transaction list with charts */}
              <PeriodTransactionList startDate={startDate} endDate={endDate} />
            </Tile>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};
