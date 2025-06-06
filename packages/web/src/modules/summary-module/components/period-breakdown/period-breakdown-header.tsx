import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
        <div className="flex items-center gap-2">
          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => navigatePeriod('prev')}
            disabled={!canNavigatePrev()}
            className="text-slate-600 hover:text-coral-600"
          >
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <PeriodBreakdownTitle title={getPeriodTitle()} />
          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => navigatePeriod('next')}
            disabled={!canNavigateNext()}
            className="text-slate-600 hover:text-coral-600"
          >
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="flex items-center gap-2">
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
    </div>
  );
};
