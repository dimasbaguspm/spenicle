import { type VariantProps } from 'class-variance-authority';
import dayjs from 'dayjs';
import { Calendar, Clock } from 'lucide-react';
import { useState, useRef } from 'react';

import { cn } from '../../libs/utils';
import { DatePicker } from '../date-picker';
import { textInputVariants } from '../text-input/text-input';
import { TimePicker } from '../time-picker';

export interface DateTimePickerProps extends VariantProps<typeof textInputVariants> {
  value?: Date | string | null;
  onChange?: (dateTime: Date | null) => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
  errorText?: string;
  disabled?: boolean;
  required?: boolean;
  showLabel?: boolean;
  labelClassName?: string;
  helperClassName?: string;
  errorClassName?: string;
  wrapperClassName?: string;
  className?: string;
  id?: string;
  name?: string;
  dateFormat?: string;
  is24Hour?: boolean;
  minDate?: Date | string;
  maxDate?: Date | string;
  // Modal options
  modalSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  // Footer options for date picker
  showTodayButton?: boolean;
  showDateClearButton?: boolean;
  todayButtonText?: string;
  dateClearButtonText?: string;
  // Footer options for time picker
  showNowButton?: boolean;
  showTimeClearButton?: boolean;
  nowButtonText?: string;
  timeClearButtonText?: string;
  // TextInput compatibility
  state?: 'default' | 'disabled' | 'error' | 'success';
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Select date and time...',
  label,
  helperText,
  errorText,
  disabled = false,
  required = false,
  showLabel = true,
  labelClassName,
  helperClassName,
  errorClassName,
  wrapperClassName,
  className,
  id,
  name,
  dateFormat = 'MM/DD/YYYY',
  is24Hour = false,
  minDate,
  maxDate,
  variant,
  size,
  modalSize = 'sm',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showTodayButton = true,
  showDateClearButton = true,
  todayButtonText = 'Today',
  dateClearButtonText = 'Clear',
  showNowButton = true,
  showTimeClearButton = true,
  nowButtonText = 'Now',
  timeClearButtonText = 'Clear',
  state,
}: DateTimePickerProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Convert value to dayjs for internal use
  const selectedDateTime = value ? dayjs(value) : null;

  // Format the display value
  const formatDateTime = (dateTime: dayjs.Dayjs | null): string => {
    if (!dateTime) return '';

    const dateString = dateTime.format(dateFormat);
    const timeString = is24Hour ? dateTime.format('HH:mm') : dateTime.format('h:mm A');

    return `${dateString} ${timeString}`;
  };

  const displayValue = formatDateTime(selectedDateTime);

  // Determine the actual state based on props (matching TextInput logic)
  const actualState = disabled ? 'disabled' : errorText ? 'error' : state;

  const handleDateChange = (date: Date | null) => {
    if (!date) {
      onChange?.(null);
      return;
    }

    // Preserve existing time if available, otherwise use current time
    const currentTime = selectedDateTime ?? dayjs();
    const newDateTime = dayjs(date).hour(currentTime.hour()).minute(currentTime.minute()).second(currentTime.second());

    onChange?.(newDateTime.toDate());
  };

  const handleTimeChange = (time: { hour: number; minute: number } | null) => {
    if (!time) {
      onChange?.(null);
      return;
    }

    // Preserve existing date if available, otherwise use today
    const currentDate = selectedDateTime ?? dayjs();
    const newDateTime = currentDate.hour(time.hour).minute(time.minute).second(0).millisecond(0);

    onChange?.(newDateTime.toDate());
  };

  const extractDateFromValue = (): Date | null => {
    return selectedDateTime ? selectedDateTime.toDate() : null;
  };

  const extractTimeFromValue = (): { hour: number; minute: number } | null => {
    if (!selectedDateTime) return null;
    return {
      hour: selectedDateTime.hour(),
      minute: selectedDateTime.minute(),
    };
  };

  return (
    <div className={cn('w-full', wrapperClassName)}>
      {/* Label */}
      {label && showLabel && (
        <label
          htmlFor={id}
          className={cn(
            'block text-sm font-medium mb-2',
            actualState === 'error' ? 'text-danger-700' : 'text-slate-700',
            disabled && 'text-slate-400',
            labelClassName
          )}
        >
          {label}
        </label>
      )}

      {/* Input Container - Using TextInput styling */}
      <div
        className={cn(
          textInputVariants({ variant, size, state: actualState }),
          'cursor-pointer relative flex items-center justify-between',
          className
        )}
        onClick={() => {
          if (!disabled) {
            setIsDatePickerOpen(true);
          }
        }}
      >
        {/* Clickable Value Display */}
        {displayValue ? (
          <div className="flex items-center space-x-2 flex-1">
            {/* Date Portion - Clickable */}
            <button
              type="button"
              className={cn(
                'text-left hover:text-coral-600 transition-colors focus:outline-none focus:ring-1 focus:ring-coral-300 rounded px-1',
                disabled && 'pointer-events-none'
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                  setIsDatePickerOpen(true);
                }
              }}
              disabled={disabled}
            >
              {selectedDateTime?.format(dateFormat)}
            </button>

            {/* Separator */}
            <span className="text-slate-400">|</span>

            {/* Time Portion - Clickable */}
            <button
              type="button"
              className={cn(
                'text-left hover:text-coral-600 transition-colors focus:outline-none focus:ring-1 focus:ring-coral-300 rounded px-1',
                disabled && 'pointer-events-none'
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                  setIsTimePickerOpen(true);
                }
              }}
              disabled={disabled}
            >
              {is24Hour ? selectedDateTime?.format('HH:mm') : selectedDateTime?.format('h:mm A')}
            </button>
          </div>
        ) : (
          /* Placeholder when no value */
          <span className="text-slate-400 flex-1">{placeholder || 'Select date and time'}</span>
        )}

        {/* Icons Container */}
        <div className="flex items-center space-x-1 ml-2">
          {/* Date Icon */}
          <button
            type="button"
            className={cn(
              'p-1 rounded hover:bg-slate-100 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-coral-300',
              disabled && 'pointer-events-none'
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                setIsDatePickerOpen(true);
              }
            }}
            disabled={disabled}
            aria-label="Select date"
          >
            <Calendar className={cn('h-4 w-4 text-slate-400', disabled && 'text-slate-300')} />
          </button>

          {/* Time Icon */}
          <button
            type="button"
            className={cn(
              'p-1 rounded hover:bg-slate-100 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-coral-300',
              disabled && 'pointer-events-none'
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                setIsTimePickerOpen(true);
              }
            }}
            disabled={disabled}
            aria-label="Select time"
          >
            <Clock className={cn('h-4 w-4 text-slate-400', disabled && 'text-slate-300')} />
          </button>
        </div>
      </div>

      {/* Helper Text */}
      {helperText && !errorText && (
        <p id={id ? `${id}-helper` : undefined} className={cn('mt-2 text-xs text-slate-500', helperClassName)}>
          {helperText}
        </p>
      )}

      {/* Error Text */}
      {errorText && (
        <p
          id={id ? `${id}-error` : undefined}
          className={cn('mt-2 text-xs text-danger-600 flex items-center gap-1', errorClassName)}
        >
          <svg
            className="h-3 w-3 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {errorText}
        </p>
      )}

      {/* Hidden input for form compatibility */}
      <input
        ref={inputRef}
        type="hidden"
        id={id}
        name={name}
        value={displayValue}
        required={required}
        aria-invalid={actualState === 'error'}
        aria-describedby={errorText ? `${id}-error` : helperText ? `${id}-helper` : undefined}
      />

      {/* Date Picker Modal */}
      <DatePicker
        value={extractDateFromValue()}
        onChange={handleDateChange}
        isOpen={isDatePickerOpen}
        onOpenChange={setIsDatePickerOpen}
        showInput={false}
        minDate={minDate}
        maxDate={maxDate}
        modalSize={modalSize}
        closeOnOverlayClick={closeOnOverlayClick}
        closeOnEscape={closeOnEscape}
        showTodayButton={showTodayButton}
        showClearButton={showDateClearButton}
        todayButtonText={todayButtonText}
        clearButtonText={dateClearButtonText}
      />

      {/* Time Picker Modal */}
      <TimePicker
        value={extractTimeFromValue()}
        onChange={handleTimeChange}
        isOpen={isTimePickerOpen}
        onOpenChange={setIsTimePickerOpen}
        showInput={false}
        is24Hour={is24Hour}
        modalSize={modalSize}
        closeOnOverlayClick={closeOnOverlayClick}
        closeOnEscape={closeOnEscape}
        showNowButton={showNowButton}
        showClearButton={showTimeClearButton}
        nowButtonText={nowButtonText}
        clearButtonText={timeClearButtonText}
      />
    </div>
  );
}
