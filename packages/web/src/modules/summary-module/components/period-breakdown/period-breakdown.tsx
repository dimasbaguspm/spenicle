import dayjs from 'dayjs';
import React from 'react';

import { Tile } from '../../../../components';
import { useApiSummaryTransactionsQuery } from '../../../../hooks';
import type { SummaryTransactionsPeriod } from '../../../../types/api';

import { getPeriodRange, groupPeriods } from './helpers';
import { PeriodBreakdownCardList } from './period-breakdown-card-list';
import { PeriodBreakdownHeader } from './period-breakdown-header';
import { PeriodBreakdownLoader } from './period-breakdown-loader';

export interface PeriodBreakdownProps {
  periodType: 'weekly' | 'monthly';
  periodIndex: number;
  setPeriodType: (type: 'weekly' | 'monthly') => void;
  setPeriodIndex: (index: number) => void;
}

export const PeriodBreakdown: React.FC<PeriodBreakdownProps> = ({
  periodType,
  periodIndex,
  setPeriodType,
  setPeriodIndex,
}) => {
  const now = dayjs();
  const selectedMonth = now.subtract(periodIndex, 'month');
  const selectedYear = now.subtract(periodIndex, 'year');

  const { startDate, endDate } = React.useMemo(
    () => getPeriodRange(periodType, periodIndex),
    [periodType, periodIndex]
  );

  const [data, , queryState] = useApiSummaryTransactionsQuery({ startDate, endDate }, { staleTime: 0, gcTime: 0 });

  const groupedData = React.useMemo(() => {
    if (periodType === 'weekly') {
      return groupPeriods(
        (data ?? []).filter(
          (item) => dayjs(item.startDate).isSame(selectedMonth, 'month') && !dayjs(item.startDate).isAfter(now, 'week')
        ),
        'weekly',
        { selectedMonth }
      );
    } else {
      return groupPeriods(
        (data ?? []).filter(
          (item) => dayjs(item.startDate).isSame(selectedYear, 'year') && !dayjs(item.startDate).isAfter(now, 'month')
        ),
        'monthly'
      );
    }
  }, [data, periodType, periodIndex]);

  const handlePeriodCardClick = React.useCallback(
    (period: SummaryTransactionsPeriod[number]) => {
      if (periodType === 'monthly' && period.startDate) {
        const clickedMonth = dayjs(period.startDate).startOf('month');

        const newPeriodIndex = now.startOf('month').diff(clickedMonth, 'month');
        setPeriodType('weekly');
        setPeriodIndex(newPeriodIndex);
      }
    },
    [periodType, setPeriodType, setPeriodIndex, now]
  );

  return (
    <Tile className="p-6">
      <PeriodBreakdownHeader
        periodType={periodType}
        periodIndex={periodIndex}
        setPeriodType={setPeriodType}
        setPeriodIndex={setPeriodIndex}
        data={data ?? []}
      />
      {queryState.isFetching ? (
        <PeriodBreakdownLoader count={5} />
      ) : (
        <PeriodBreakdownCardList
          periods={groupedData}
          periodType={periodType}
          onPeriodClick={periodType === 'monthly' ? handlePeriodCardClick : undefined}
        />
      )}
    </Tile>
  );
};
