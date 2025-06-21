import dayjs from 'dayjs';
import { useState, type FC } from 'react';

import { PageLayout, Tile } from '../../../components';
import { DatePickerInline } from '../../../components/date-picker';
import type { TransactionQueryParameters } from '../../../types/api';
import { TransactionFilterInline } from '../components/transaction-filter-inline';
import { useTransactionFilters } from '../hooks';

export const DesktopTransactionPage: FC = () => {
  const [date, setDate] = useState(dayjs());
  const { accountIds, categoryIds, types } = useTransactionFilters();

  const filters = {
    accountIds,
    categoryIds,
    startDate: date.startOf('day').toISOString(),
    endDate: date.endOf('day').toISOString(),
    type: types?.[0],
  } satisfies TransactionQueryParameters;

  return (
    <PageLayout>
      <Tile className="flex flex-row">
        <div className="p-4 max-w-[30%] flex flex-col gap-4">
          <DatePickerInline autoSubmitOnSelect onChange={(value) => setDate(dayjs(value))} value={date.toDate()} />
          <TransactionFilterInline />
        </div>
        <div className="flex-1 p-4 flex flex-col flex-wrap">
          calendar
          {/* filter summary list - only show non-empty filters with readable labels */}
          <div className="mt-4">
            <h3 className="font-semibold mb-2 text-gray-700 text-sm">Active Filters</h3>
            <ul className="text-sm text-gray-800 space-y-1">
              {accountIds && accountIds.length > 0 && (
                <li>
                  <span className="font-medium">Accounts:</span> {accountIds.join(', ')}
                </li>
              )}
              {categoryIds && categoryIds.length > 0 && (
                <li>
                  <span className="font-medium">Categories:</span> {categoryIds.join(', ')}
                </li>
              )}
              {types && types.length > 0 && (
                <li>
                  <span className="font-medium">Types:</span> {types.join(', ')}
                </li>
              )}
              <li>
                <span className="font-medium">Date:</span> {date.format('YYYY-MM-DD')}
              </li>
            </ul>
          </div>
        </div>
      </Tile>
    </PageLayout>
  );
};
