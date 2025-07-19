import { Text } from '@dimasbaguspm/versaur';
import { cva, type VariantProps } from 'class-variance-authority';
import dayjs, { Dayjs } from 'dayjs';
import { forwardRef, useCallback, useMemo } from 'react';

import { cn } from '../../../../libs/utils';

import { generateWeekDays, formatDate, isSameDay, isToday } from './helpers';

const weeklyDateRibbonVariants = cva('sticky top-0 z-20 border-b border-slate-200 bg-white');

const dayItemVariants = cva(
  'relative flex-shrink-0 cursor-pointer px-2 py-3 transition-all duration-200 border-b-2 border-transparent select-none text-center hover:bg-slate-50 data-[selected=true]:bg-primary/10 data-[selected=true]:border-primary'
);

export interface WeeklyDateRibbonProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'>,
    VariantProps<typeof weeklyDateRibbonVariants> {
  /** Current selected date */
  selectedDate?: Dayjs;
  /** Callback when a date is selected */
  onDateSelect?: (date: Dayjs) => void;
}

const WeeklyDateRibbon = forwardRef<HTMLDivElement, WeeklyDateRibbonProps>(
  ({ className, selectedDate = dayjs(), onDateSelect, ...props }, ref) => {
    const days = useMemo(() => {
      return generateWeekDays(dayjs(selectedDate));
    }, [selectedDate]);

    // Handle date selection
    const handleDateSelect = useCallback((date: Dayjs) => onDateSelect?.(date), [onDateSelect]);

    return (
      <div ref={ref} className={cn(weeklyDateRibbonVariants(), className)} {...props}>
        <div className="flex w-full">
          {days.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const dayIsToday = isToday(date);

            return (
              <div
                key={date.toISOString()}
                data-date={date.toISOString()}
                data-selected={isSelected}
                className={cn('flex-1', dayItemVariants())}
                onClick={() => handleDateSelect(date)}
              >
                <div className="flex flex-col items-center">
                  <Text fontSize="xs" className="mb-1">
                    {formatDate(date, 'day')}
                  </Text>

                  <Text
                    fontSize="lg"
                    fontWeight={isSelected || (dayIsToday && !isSelected) ? 'bold' : 'normal'}
                    className="duration-200 transition-all"
                    color={isSelected ? 'primary' : 'ghost'}
                  >
                    {formatDate(date, 'dayNum')}
                  </Text>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

WeeklyDateRibbon.displayName = 'WeeklyDateRibbon';

export { WeeklyDateRibbon, weeklyDateRibbonVariants, dayItemVariants };
