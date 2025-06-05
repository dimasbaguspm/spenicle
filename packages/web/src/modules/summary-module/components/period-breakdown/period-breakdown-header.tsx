import dayjs from 'dayjs';
import React from 'react';

import { Button, IconButton } from '../../../../components';
import type { SummaryTransactionsPeriod } from '../../../../types/api';

import { PeriodBreakdownTitle } from './period-breakdown-title';

interface PeriodBreakdownHeaderProps {
  periodType: 'weekly' | 'monthly';
  periodIndex: number;
  setPeriodType: (type: 'weekly' | 'monthly') => void;
  setPeriodIndex: (index: number) => void;
  data: SummaryTransactionsPeriod;
}

export const PeriodBreakdownHeader: React.FC<PeriodBreakdownHeaderProps> = ({
  periodType,
  periodIndex,
  setPeriodType,
  setPeriodIndex,
  data,
}) => {
  const now = dayjs();
  const selectedMonth = now.subtract(periodIndex, 'month');
  const selectedYear = now.subtract(periodIndex, 'year');

  const getPeriodTitle = () => {
    if (periodType === 'weekly') {
      return selectedMonth.format('MMMM YYYY');
    } else {
      return selectedYear.format('YYYY');
    }
  };

  const canNavigatePrev = () => {
    if (periodType === 'weekly') {
      const earliest = (data ?? []).reduce((min, item) => {
        const d = dayjs(item.startDate);
        return d.isBefore(min) ? d : min;
      }, now);
      return selectedMonth.startOf('month').isAfter(earliest.startOf('month'));
    } else {
      const earliest = (data ?? []).reduce((min, item) => {
        const d = dayjs(item.startDate);
        return d.isBefore(min) ? d : min;
      }, now);
      return selectedYear.startOf('year').isAfter(earliest.startOf('year'));
    }
  };

  const canNavigateNext = () => {
    if (periodType === 'weekly') {
      return selectedMonth.isBefore(now, 'month');
    } else {
      return selectedYear.isBefore(now, 'year');
    }
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && canNavigatePrev()) {
      setPeriodIndex(periodIndex + 1);
    } else if (direction === 'next' && canNavigateNext()) {
      setPeriodIndex(periodIndex - 1);
    }
  };

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Period Breakdown</h3>
        <div className="flex items-center gap-2">
          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => navigatePeriod('prev')}
            disabled={!canNavigatePrev()}
            className="text-slate-600 hover:text-coral-600"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </IconButton>
          <PeriodBreakdownTitle title={getPeriodTitle()} />
          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => navigatePeriod('next')}
            disabled={!canNavigateNext()}
            className="text-slate-600 hover:text-coral-600"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </IconButton>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant={periodType === 'weekly' ? 'coral' : 'slate-outline'}
          size="sm"
          onClick={() => setPeriodType('weekly')}
        >
          Weekly
        </Button>
        <Button
          variant={periodType === 'monthly' ? 'coral' : 'slate-outline'}
          size="sm"
          onClick={() => setPeriodType('monthly')}
        >
          Monthly
        </Button>
      </div>
    </div>
  );
};
