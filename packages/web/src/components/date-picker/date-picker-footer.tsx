import dayjs from 'dayjs';
import { useContext } from 'react';

import { cn } from '../../libs/utils';
import { Button } from '../button';

import { DatePickerContext } from './date-picker-context';

export interface DatePickerFooterProps {
  className?: string;
  showTodayButton?: boolean;
  showClearButton?: boolean;
  todayButtonText?: string;
  clearButtonText?: string;
}

export function DatePickerFooter({
  className,
  showTodayButton = true,
  showClearButton = true,
  todayButtonText = 'Today',
  clearButtonText = 'Clear',
}: DatePickerFooterProps) {
  const context = useContext(DatePickerContext);

  if (!context) {
    throw new Error('DatePickerFooter must be used within a DatePicker component');
  }

  const { onDateSelect, onConfirm } = context;

  const handleTodayClick = () => {
    const today = dayjs();
    onDateSelect(today);
  };

  const handleClearClick = () => {
    onDateSelect(null); // Clear selection
  };

  return (
    <div className={cn('flex items-center justify-between p-3 border-t border-mist-200 bg-cream-50', className)}>
      <div className="flex gap-2">
        {showTodayButton && (
          <Button variant="success-ghost" size="sm" onClick={handleTodayClick} className="text-xs">
            {todayButtonText}
          </Button>
        )}

        {showClearButton && (
          <Button variant="ghost" size="sm" onClick={handleClearClick} className="text-xs">
            {clearButtonText}
          </Button>
        )}
      </div>

      <Button variant="coral" size="sm" onClick={onConfirm} className="text-xs">
        Done
      </Button>
    </div>
  );
}
