import dayjs from 'dayjs';
import { useContext } from 'react';

import { cn } from '../../libs/utils';

import { DatePickerContext } from './date-picker-context';

export interface DatePickerCalendarProps {
  className?: string;
}

export function DatePickerCalendar({ className }: DatePickerCalendarProps) {
  const context = useContext(DatePickerContext);

  if (!context) {
    throw new Error('DatePickerCalendar must be used within a DatePicker component');
  }

  const { pendingDate, displayDate, onDateSelect } = context;

  // Get the first day of the month and calculate the calendar grid
  const startOfMonth = displayDate.startOf('month');
  const endOfMonth = displayDate.endOf('month');
  const startOfCalendar = startOfMonth.startOf('week');
  const endOfCalendar = endOfMonth.endOf('week');

  // Generate calendar days
  const calendarDays = [];
  let currentDay = startOfCalendar;

  while (currentDay.isBefore(endOfCalendar) || currentDay.isSame(endOfCalendar, 'day')) {
    calendarDays.push(currentDay);
    currentDay = currentDay.add(1, 'day');
  }

  const today = dayjs();

  const isSelected = (date: dayjs.Dayjs) => {
    // Use pendingDate for visual selection during interaction
    return pendingDate?.isSame(date, 'day');
  };

  const isToday = (date: dayjs.Dayjs) => {
    return date.isSame(today, 'day');
  };

  const isCurrentMonth = (date: dayjs.Dayjs) => {
    return date.isSame(displayDate, 'month');
  };

  return (
    <div className={cn('p-3', className)}>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-slate-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date) => {
          const selected = isSelected(date);
          const todayDate = isToday(date);
          const currentMonth = isCurrentMonth(date);

          return (
            <button
              key={date.format('YYYY-MM-DD')}
              onClick={() => onDateSelect(date)}
              className={cn(
                'h-8 w-8 flex items-center justify-center text-sm rounded transition-all hover:bg-coral-50',
                'focus:outline-none focus:ring-2 focus:ring-coral-300 focus:ring-offset-1',
                {
                  // Selected state
                  'bg-coral-500 text-cream-100 hover:bg-coral-600 font-medium': selected,

                  // Today state (but not selected)
                  'bg-sage-100 text-sage-700 font-medium hover:bg-sage-200': todayDate && !selected,

                  // Current month
                  'text-slate-700': currentMonth && !selected && !todayDate,

                  // Other months
                  'text-slate-400': !currentMonth,

                  // Hover states
                  'hover:text-coral-700': !selected && currentMonth,
                  'hover:text-slate-500': !selected && !currentMonth,
                }
              )}
            >
              {date.format('D')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
