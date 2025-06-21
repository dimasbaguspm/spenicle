import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import { DatePickerCalendar } from './date-picker-calendar';
import { DatePickerContext } from './date-picker-context';
import { DatePickerHeader } from './date-picker-header';

export interface DatePickerInlineProps {
  value?: Date | string | null;
  onChange?: (date: Date | null) => void;
  minDate?: Date | string;
  maxDate?: Date | string;
  showTodayButton?: boolean;
  showClearButton?: boolean;
  todayButtonText?: string;
  clearButtonText?: string;
  className?: string;
  /**
   * If true, fires onChange immediately when a date is selected in the calendar (default: true)
   */
  autoSubmitOnSelect?: boolean;
}

// date-picker-inline: calendar and controls rendered inline, no modal or input
export function DatePickerInline({
  value,
  onChange,
  minDate,
  maxDate,
  className,
  autoSubmitOnSelect = true,
}: DatePickerInlineProps) {
  const [pendingDate, setPendingDate] = useState<dayjs.Dayjs | null>(value ? dayjs(value) : dayjs());
  const [displayDate, setDisplayDate] = useState(() => {
    if (value) return dayjs(value);
    return dayjs();
  });

  const selectedDate = value ? dayjs(value) : null;

  const handleDateSelect = (date: dayjs.Dayjs | null) => {
    setPendingDate(date);
    if (autoSubmitOnSelect && date) {
      if (minDate && date.isBefore(dayjs(minDate), 'day')) return;
      if (maxDate && date.isAfter(dayjs(maxDate), 'day')) return;
      onChange?.(date.toDate());
    }
  };

  const handleConfirm = () => {
    if (pendingDate) {
      if (minDate && pendingDate.isBefore(dayjs(minDate), 'day')) return;
      if (maxDate && pendingDate.isAfter(dayjs(maxDate), 'day')) return;
      onChange?.(pendingDate.toDate());
    } else {
      onChange?.(null);
    }
  };

  const handleDisplayDateChange = (date: dayjs.Dayjs) => {
    setDisplayDate(date);
  };

  useEffect(() => {
    if (value) {
      setDisplayDate(dayjs(value));
    }
  }, [value]);

  const contextValue = {
    selectedDate,
    pendingDate,
    displayDate,
    onDateSelect: handleDateSelect,
    onDisplayDateChange: handleDisplayDateChange,
    onConfirm: handleConfirm,
    onClose: () => {}, // no-op for inline
    isOpen: true,
  };

  return (
    <DatePickerContext.Provider value={contextValue}>
      <div className={className ?? 'bg-white rounded w-full'}>
        <DatePickerHeader variant="compact" />
        <DatePickerCalendar />
      </div>
    </DatePickerContext.Provider>
  );
}
