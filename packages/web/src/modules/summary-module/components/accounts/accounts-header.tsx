import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';

import { Button, IconButton } from '../../../../components';

interface AccountsHeaderProps {
  periodType: 'weekly' | 'monthly' | 'yearly';
  periodIndex: number;
  setPeriodType: (type: 'weekly' | 'monthly' | 'yearly') => void;
  setPeriodIndex: (index: number) => void;
}

export const AccountsHeader: React.FC<AccountsHeaderProps> = ({
  periodType,
  periodIndex,
  setPeriodType,
  setPeriodIndex,
}) => {
  // Helper for period title (show real date range)
  const getPeriodTitle = () => {
    const now = dayjs();
    if (periodType === 'weekly') {
      const start = now.startOf('week').subtract(periodIndex, 'week');
      const end = start.endOf('week');
      const isCurrentYear = start.year() === now.year();
      if (isCurrentYear) {
        return `${start.format('D')} - ${end.format('D MMM')}`;
      } else {
        return `${start.format('D')} - ${end.format('D MMM YYYY')}`;
      }
    }
    if (periodType === 'monthly') {
      const start = now.startOf('month').subtract(periodIndex, 'month');
      const isCurrentYear = start.year() === now.year();
      if (isCurrentYear) {
        return start.format('MMMM');
      } else {
        return start.format('MMMM YYYY');
      }
    }
    if (periodType === 'yearly') {
      const start = now.startOf('year').subtract(periodIndex, 'year');
      return start.format('YYYY');
    }
    return '';
  };

  const handlePrev = () => {
    if (periodIndex < 100) setPeriodIndex(periodIndex + 1);
  };
  const handleNext = () => {
    if (periodIndex > 0) setPeriodIndex(periodIndex - 1);
  };

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Title and navigation */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Accounts by Period</h3>
        <div className="flex items-center gap-2">
          <IconButton
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={periodIndex >= 100}
            className="text-slate-600 hover:text-coral-600"
            aria-label="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <span className="font-medium text-slate-900 min-w-[120px] text-center">{getPeriodTitle()}</span>
          <IconButton
            variant="ghost"
            size="sm"
            onClick={handleNext}
            disabled={periodIndex <= 0}
            className="text-slate-600 hover:text-coral-600"
            aria-label="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
      {/* Period selector */}
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
        <Button
          variant={periodType === 'yearly' ? 'coral' : 'slate-outline'}
          size="sm"
          onClick={() => setPeriodType('yearly')}
        >
          Yearly
        </Button>
      </div>
    </div>
  );
};
