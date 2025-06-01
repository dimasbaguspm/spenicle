import { cva, type VariantProps } from 'class-variance-authority';
import dayjs, { Dayjs } from 'dayjs';
import { forwardRef, useCallback, useMemo } from 'react';

import { cn } from '../../../../libs/utils';

import { generateWeekDays, formatDate, isSameDay, isToday } from './helpers';

const weeklyDateRibbonVariants = cva('sticky top-0 z-20 border-b border-slate-200 bg-white', {
  variants: {
    variant: {
      default: '',
      coral: 'bg-coral-50 border-coral-200',
      sage: 'bg-sage-50 border-sage-200',
      mist: 'bg-mist-50 border-mist-200',
      cream: 'bg-cream-50 border-cream-200',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const dayItemVariants = cva(
  'relative flex-shrink-0 w-16 px-2 py-3 cursor-pointer transition-all duration-200 border-b-2 border-transparent select-none text-center',
  {
    variants: {
      variant: {
        default: 'hover:bg-slate-50 data-[selected=true]:bg-coral-50 data-[selected=true]:border-coral-500',
        coral: 'hover:bg-coral-100 data-[selected=true]:bg-coral-100 data-[selected=true]:border-coral-500',
        sage: 'hover:bg-sage-100 data-[selected=true]:bg-sage-100 data-[selected=true]:border-sage-500',
        mist: 'hover:bg-mist-100 data-[selected=true]:bg-mist-100 data-[selected=true]:border-mist-500',
        cream: 'hover:bg-cream-100 data-[selected=true]:bg-cream-100 data-[selected=true]:border-cream-500',
      },
      size: {
        sm: 'w-12 px-1 py-2',
        md: 'w-16 px-2 py-3',
        lg: 'w-20 px-3 py-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface WeeklyDateRibbonProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'>,
    VariantProps<typeof weeklyDateRibbonVariants> {
  /** Current selected date */
  selectedDate?: Dayjs;
  /** Callback when a date is selected */
  onDateSelect?: (date: Dayjs) => void;

  /** Size variant for day items */
  size?: 'sm' | 'md' | 'lg';
}

const WeeklyDateRibbon = forwardRef<HTMLDivElement, WeeklyDateRibbonProps>(
  ({ className, variant, selectedDate = dayjs(), onDateSelect, size = 'md', ...props }, ref) => {
    const days = useMemo(() => {
      return generateWeekDays(dayjs(selectedDate));
    }, [selectedDate]);

    // Handle date selection
    const handleDateSelect = useCallback((date: Dayjs) => onDateSelect?.(date), [onDateSelect]);

    return (
      <div ref={ref} className={cn(weeklyDateRibbonVariants({ variant }), className)} {...props}>
        <div className="flex justify-between">
          {days.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const dayIsToday = isToday(date);

            return (
              <div
                key={date.toISOString()}
                data-date={date.toISOString()}
                data-selected={isSelected}
                className={cn(dayItemVariants({ variant, size }))}
                onClick={() => handleDateSelect(date)}
              >
                <div className="flex flex-col items-center">
                  <div className="text-xs text-slate-500 mb-1">{formatDate(date, 'day')}</div>
                  <div
                    className={cn(
                      'text-lg font-medium transition-all duration-200',
                      dayIsToday && !isSelected && 'text-coral-600 font-bold',
                      isSelected && 'text-coral-600 font-bold',
                      !isSelected && !dayIsToday && 'text-slate-900'
                    )}
                  >
                    {formatDate(date, 'dayNum')}
                  </div>
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
