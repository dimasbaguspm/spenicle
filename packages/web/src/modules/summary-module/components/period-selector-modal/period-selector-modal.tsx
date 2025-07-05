import dayjs from 'dayjs';
import { Calendar, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';

import { Button } from '../../../../components/button/button';
import { IconButton } from '../../../../components/button/icon-button';
import { Drawer } from '../../../../components/drawer';
import { Segment } from '../../../../components/segment/segment';
import type { PeriodType } from '../../hooks/use-desktop-summary-filters';

export interface PeriodSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodType: PeriodType;
  startDate: Date;
  endDate: Date;
  onPeriodTypeChange: (type: PeriodType) => void;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onConfirm: () => void;
}

interface PeriodOption {
  label: string;
  startDate: Date;
  endDate: Date;
  isSelected: boolean;
  isCurrent: boolean;
  isFuture: boolean;
}

/**
 * Mobile-optimized period selector drawer for analytics views.
 * Provides intuitive period type selection and pre-defined period options
 * with touch-friendly interface and clear visual hierarchy.
 */
export const PeriodSelectorModal: React.FC<PeriodSelectorModalProps> = ({
  isOpen,
  onClose,
  periodType,
  startDate,
  endDate,
  onPeriodTypeChange,
  onStartDateChange,
  onEndDateChange,
  onConfirm,
}) => {
  // navigation state for period browser
  const [navigationDate, setNavigationDate] = useState(() => dayjs(startDate));

  // update navigation date when props change
  useEffect(() => {
    setNavigationDate(dayjs(startDate));
  }, [startDate]);

  // generate period options based on type and navigation date
  const periodOptions = useMemo((): PeriodOption[] => {
    const now = dayjs();
    const currentStart = dayjs(startDate);

    switch (periodType) {
      case 'weekly': {
        // show weeks that belong to the navigation month
        // include weeks that contain dates from previous/next month in the appropriate month
        const monthStart = navigationDate.startOf('month');
        const monthEnd = navigationDate.endOf('month');
        const weeks: PeriodOption[] = [];

        // start from a bit before the month to catch weeks that might belong to this month
        let cursor = monthStart.subtract(1, 'week').startOf('week');

        // continue until we're well past the month end
        while (cursor.isSameOrBefore(monthEnd.add(1, 'week'), 'week')) {
          const weekStart = cursor;
          const weekEnd = cursor.endOf('week');

          // check if this week should be included in the current navigation month
          let shouldInclude = false;

          // case 1: week contains dates from previous month AND current month
          if (weekStart.isBefore(monthStart) && weekEnd.isSameOrAfter(monthStart) && weekEnd.isSameOrBefore(monthEnd)) {
            // include this week in current month if it spans from previous month into current month
            shouldInclude = true;
          }
          // case 2: week is entirely within the current month
          else if (weekStart.isSameOrAfter(monthStart) && weekEnd.isSameOrBefore(monthEnd)) {
            shouldInclude = true;
          }
          // case 3: week contains dates from current month AND next month
          else if (
            weekStart.isSameOrAfter(monthStart) &&
            weekStart.isSameOrBefore(monthEnd) &&
            weekEnd.isAfter(monthEnd)
          ) {
            // include this week in next month (so exclude from current month)
            shouldInclude = false;
          }

          if (shouldInclude) {
            const isSelected = weekStart.isSame(currentStart, 'week');
            const isCurrent = weekStart.isSame(now, 'week');
            const isFuture = weekStart.isAfter(now, 'week');

            weeks.push({
              label: `${weekStart.format('MMM D')} - ${weekEnd.format('MMM D')}`,
              startDate: weekStart.toDate(),
              endDate: weekEnd.toDate(),
              isSelected,
              isCurrent,
              isFuture,
            });
          }

          cursor = cursor.add(1, 'week');
        }

        return weeks;
      }

      case 'monthly': {
        // show months in the navigation year
        const year = navigationDate.year();
        const months: PeriodOption[] = [];

        for (let i = 0; i < 12; i++) {
          const monthStart = dayjs().year(year).month(i).startOf('month');
          const monthEnd = monthStart.endOf('month');
          const isSelected = monthStart.isSame(currentStart, 'month');
          const isCurrent = monthStart.isSame(now, 'month');
          const isFuture = monthStart.isAfter(now, 'month');

          months.push({
            label: monthStart.format('MMMM'),
            startDate: monthStart.toDate(),
            endDate: monthEnd.toDate(),
            isSelected,
            isCurrent,
            isFuture,
          });
        }

        return months;
      }

      case 'yearly': {
        // show recent years
        const currentYear = now.year();
        const years: PeriodOption[] = [];

        for (let i = -2; i <= 1; i++) {
          const year = currentYear + i;
          const yearStart = dayjs().year(year).startOf('year');
          const yearEnd = yearStart.endOf('year');
          const isSelected = yearStart.isSame(currentStart, 'year');
          const isCurrent = yearStart.isSame(now, 'year');
          const isFuture = yearStart.isAfter(now, 'year');

          years.push({
            label: yearStart.format('YYYY'),
            startDate: yearStart.toDate(),
            endDate: yearEnd.toDate(),
            isSelected,
            isCurrent,
            isFuture,
          });
        }

        return years;
      }

      default:
        return [];
    }
  }, [periodType, navigationDate, startDate, endDate]);

  // check if forward navigation would lead to future periods
  const canNavigateForward = useMemo(() => {
    const now = dayjs();

    switch (periodType) {
      case 'weekly': {
        // can navigate forward if next month contains any non-future weeks
        const nextMonth = navigationDate.add(1, 'month');
        const nextMonthStart = nextMonth.startOf('month');
        const nextMonthEnd = nextMonth.endOf('month');

        // find the first week that overlaps with the next month
        let cursor = nextMonthStart.startOf('week');
        while (cursor.isBefore(nextMonthEnd.endOf('week'))) {
          const weekStart = cursor;
          const weekEnd = cursor.endOf('week');

          // check if this week has any days in the next month and is not future
          if (
            weekEnd.isAfter(nextMonthStart.subtract(1, 'day')) &&
            weekStart.isBefore(nextMonthEnd.add(1, 'day')) &&
            !weekStart.isAfter(now, 'week')
          ) {
            return true;
          }
          cursor = cursor.add(1, 'week');
        }
        return false;
      }

      case 'monthly': {
        // can navigate forward if next year contains any non-future months
        const nextYear = navigationDate.add(1, 'year').year();
        return nextYear <= now.year();
      }

      case 'yearly': {
        // can navigate forward if the next year range contains any non-future years
        const nextRangeStartYear = navigationDate.year() + 2; // next range starts 4 years forward from current - 2
        return nextRangeStartYear <= now.year();
      }

      default:
        return false;
    }
  }, [periodType, navigationDate]);

  // navigation handlers
  const handleNavigateBack = () => {
    switch (periodType) {
      case 'weekly':
        setNavigationDate((prev) => prev.subtract(1, 'month'));
        break;
      case 'monthly':
        setNavigationDate((prev) => prev.subtract(1, 'year'));
        break;
      case 'yearly':
        setNavigationDate((prev) => prev.subtract(4, 'years'));
        break;
    }
  };

  const handleNavigateForward = () => {
    if (!canNavigateForward) return;

    switch (periodType) {
      case 'weekly':
        setNavigationDate((prev) => prev.add(1, 'month'));
        break;
      case 'monthly':
        setNavigationDate((prev) => prev.add(1, 'year'));
        break;
      case 'yearly':
        setNavigationDate((prev) => prev.add(4, 'years'));
        break;
    }
  };

  // get navigation title
  const navigationTitle = useMemo(() => {
    switch (periodType) {
      case 'weekly':
        return navigationDate.format('MMMM YYYY');
      case 'monthly':
        return navigationDate.format('YYYY');
      case 'yearly': {
        const startYear = navigationDate.year() - 2;
        const endYear = navigationDate.year() + 1;
        return `${startYear} - ${endYear}`;
      }
      default:
        return '';
    }
  }, [periodType, navigationDate]);

  // handle period selection
  const handlePeriodSelect = (option: PeriodOption) => {
    if (option.isFuture) return; // prevent selecting future periods

    onStartDateChange(option.startDate);
    onEndDateChange(option.endDate);
  };

  const typeOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  return (
    <>
      {isOpen && (
        <Drawer size="md" onClose={onClose} closeOnOverlayClick closeOnEscape>
          <Drawer.Header>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-coral-50">
                <Calendar className="w-5 h-5 text-coral-600" />
              </div>
              <div>
                <Drawer.Title className="text-lg font-semibold text-slate-900">Select Period</Drawer.Title>
                <Drawer.Description className="text-sm text-slate-600">
                  Choose your analysis timeframe
                </Drawer.Description>
              </div>
            </div>
          </Drawer.Header>

          <Drawer.Content>
            <div className="space-y-6">
              {/* period type selector */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Period Type</label>
                <Segment
                  options={typeOptions}
                  value={periodType}
                  onValueChange={(val) => onPeriodTypeChange(val as PeriodType)}
                  variant="mist"
                  segmentSize="lg"
                  className="w-full"
                />
              </div>

              {/* period navigation */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-700">Available Periods</h3>
                  <div className="flex items-center gap-2">
                    <IconButton
                      variant="mist-ghost"
                      size="sm"
                      onClick={handleNavigateBack}
                      aria-label="Previous period range"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </IconButton>
                    <span className="text-sm font-medium text-slate-600 min-w-[120px] text-center">
                      {navigationTitle}
                    </span>
                    <IconButton
                      variant="mist-ghost"
                      size="sm"
                      onClick={handleNavigateForward}
                      disabled={!canNavigateForward}
                      aria-label="Next period range"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </IconButton>
                  </div>
                </div>

                {/* period options grid */}
                <div className="grid grid-cols-2 gap-2">
                  {periodOptions.map((option, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handlePeriodSelect(option)}
                      disabled={option.isFuture}
                      className={`
                        relative p-3 rounded-lg border-2 transition-all duration-200 text-left
                        ${
                          option.isFuture
                            ? 'border-mist-100 bg-mist-50 text-mist-400 cursor-not-allowed'
                            : option.isSelected
                              ? 'border-coral-500 bg-coral-50 text-coral-900'
                              : 'border-mist-200 bg-white text-slate-700 hover:border-mist-300 hover:bg-mist-25'
                        }
                        ${option.isCurrent && !option.isSelected && !option.isFuture ? 'ring-2 ring-sage-200 border-sage-300' : ''}
                      `}
                    >
                      <div className="font-medium text-sm">{option.label}</div>
                      {periodType !== 'weekly' && (
                        <div className="text-xs text-slate-500 mt-1">
                          {dayjs(option.startDate).format('MMM D')} - {dayjs(option.endDate).format('MMM D')}
                        </div>
                      )}
                      {option.isCurrent && (
                        <div className="absolute top-1 right-1">
                          <div className="w-2 h-2 rounded-full bg-sage-500"></div>
                        </div>
                      )}
                      {option.isSelected && (
                        <div className="absolute top-1 right-1">
                          <Check className="w-3 h-3 text-coral-600" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Drawer.Content>

          <Drawer.Footer>
            <div className="flex gap-3 justify-end">
              <Button variant="mist-outline" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="coral" onClick={onConfirm}>
                Apply
              </Button>
            </div>
          </Drawer.Footer>
        </Drawer>
      )}
    </>
  );
};
