import type { Dayjs } from 'dayjs';
import { Clock } from 'lucide-react';

import { cn } from '../../../../libs/utils';

interface TransactionCalendarWeekHeaderProps {
  weekDays: Dayjs[];
  selectedDate: Dayjs;
  onDateSelect?: (date: Dayjs) => void;
}

export const TransactionCalendarWeekHeader = ({
  weekDays,
  selectedDate,
  onDateSelect,
}: TransactionCalendarWeekHeaderProps) => (
  <div className="sticky top-0 z-10 bg-white border-b border-mist-200">
    <div className="grid grid-cols-8 border-r border-mist-200">
      {/* Time column header */}
      <div className="p-3 border-r border-mist-200 bg-cream-50">
        <div className="flex items-center justify-center">
          <Clock className="h-4 w-4 text-slate-400" />
        </div>
      </div>
      {/* Day headers */}
      {weekDays.map((day) => (
        <div
          key={day.format('YYYY-MM-DD')}
          className={cn(
            'p-3 text-center border-r border-mist-200 cursor-pointer hover:bg-coral-50 transition-colors',
            day.isSame(selectedDate, 'day') && 'bg-coral-100 border-coral-300'
          )}
          onClick={() => onDateSelect?.(day)}
        >
          <div className="text-xs text-slate-500 font-medium">{day.format('ddd')}</div>
          <div
            className={cn(
              'text-sm mt-1 font-medium',
              day.isSame(new Date(), 'day') && 'text-coral-600 font-bold',
              day.isSame(selectedDate, 'day') && 'text-coral-700'
            )}
          >
            {day.format('D')}
          </div>
        </div>
      ))}
    </div>
  </div>
);
