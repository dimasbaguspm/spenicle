import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useContext } from 'react';

import { cn } from '../../libs/utils';
import { IconButton } from '../button';

import { DatePickerContext } from './date-picker-context';

export interface DatePickerHeaderProps {
  className?: string;
}

export function DatePickerHeader({ className }: DatePickerHeaderProps) {
  const context = useContext(DatePickerContext);

  if (!context) {
    throw new Error('DatePickerHeader must be used within a DatePicker component');
  }

  const { displayDate, onDisplayDateChange } = context;

  const handlePreviousMonth = () => {
    onDisplayDateChange(displayDate.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    onDisplayDateChange(displayDate.add(1, 'month'));
  };

  const handlePreviousYear = () => {
    onDisplayDateChange(displayDate.subtract(1, 'year'));
  };

  const handleNextYear = () => {
    onDisplayDateChange(displayDate.add(1, 'year'));
  };

  return (
    <div className={cn('flex items-center justify-between p-3 border-b border-mist-200', className)}>
      {/* Month navigation */}
      <div className="flex items-center gap-1">
        <IconButton
          variant="ghost"
          size="sm"
          onClick={handlePreviousMonth}
          className="text-slate-600 hover:text-coral-600"
        >
          <ChevronLeft className="h-4 w-4" />
        </IconButton>

        <button className="text-lg font-semibold text-slate-800 hover:text-coral-600 transition-colors px-2 py-1 rounded">
          {displayDate.format('MMMM YYYY')}
        </button>

        <IconButton variant="ghost" size="sm" onClick={handleNextMonth} className="text-slate-600 hover:text-coral-600">
          <ChevronRight className="h-4 w-4" />
        </IconButton>
      </div>

      {/* Year navigation */}
      <div className="flex items-center gap-1">
        <IconButton
          variant="ghost"
          size="sm"
          onClick={handlePreviousYear}
          className="text-slate-500 hover:text-coral-600"
        >
          <ChevronLeft className="h-3 w-3" />
        </IconButton>

        <span className="text-sm text-slate-600 min-w-[50px] text-center">{displayDate.format('YYYY')}</span>

        <IconButton variant="ghost" size="sm" onClick={handleNextYear} className="text-slate-500 hover:text-coral-600">
          <ChevronRight className="h-3 w-3" />
        </IconButton>
      </div>
    </div>
  );
}
