import { cva, type VariantProps } from 'class-variance-authority';
import dayjs from 'dayjs';
import { Calendar } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

import { cn } from '../../libs/utils';
import { Modal } from '../modal';
import { TextInput } from '../text-input';

import { DatePickerCalendar } from './date-picker-calendar';
import { DatePickerContext } from './date-picker-context';
import { DatePickerFooter } from './date-picker-footer';
import { DatePickerHeader } from './date-picker-header';

const datePickerVariants = cva('relative', {
  variants: {
    variant: {
      default: '',
      coral: '',
      sage: '',
      mist: '',
      slate: '',
    },
    size: {
      sm: '',
      md: '',
      lg: '',
      xl: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

export interface DatePickerProps extends VariantProps<typeof datePickerVariants> {
  value?: Date | string | null;
  onChange?: (date: Date | null) => void;
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
  format?: string;
  minDate?: Date | string;
  maxDate?: Date | string;
  // Modal control
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Footer options
  showTodayButton?: boolean;
  showClearButton?: boolean;
  todayButtonText?: string;
  clearButtonText?: string;
  // Modal options
  modalSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  // Input display
  showInput?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select a date...',
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
  format = 'MM/DD/YYYY',
  minDate,
  maxDate,
  variant,
  size,
  isOpen,
  onOpenChange,
  showTodayButton = true,
  showClearButton = true,
  todayButtonText = 'Today',
  clearButtonText = 'Clear',
  modalSize = 'sm',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showInput = true,
}: DatePickerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<dayjs.Dayjs | null>(null); // New: temporary selection
  const [displayDate, setDisplayDate] = useState(() => {
    if (value) {
      return dayjs(value);
    }
    return dayjs();
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Use external isOpen prop if provided, otherwise use internal state
  const modalIsOpen = isOpen ?? internalIsOpen;

  // Convert value to dayjs for internal use
  const selectedDate = value ? dayjs(value) : null;

  // Format the display value
  const displayValue = selectedDate ? selectedDate.format(format) : '';

  const handleDateSelect = (date: dayjs.Dayjs | null) => {
    // Now this just updates the pending selection, doesn't trigger onChange immediately
    setPendingDate(date);
  };

  const handleConfirm = () => {
    // This is where we actually trigger the onChange with the pending date
    if (pendingDate) {
      // Check min/max constraints
      if (minDate && pendingDate.isBefore(dayjs(minDate), 'day')) return;
      if (maxDate && pendingDate.isAfter(dayjs(maxDate), 'day')) return;

      onChange?.(pendingDate.toDate());
    } else {
      onChange?.(null);
    }

    // Close the modal after confirming
    handleClose();
  };

  const handleDisplayDateChange = (date: dayjs.Dayjs) => {
    setDisplayDate(date);
  };

  const handleClose = () => {
    if (onOpenChange) {
      onOpenChange(false);
    } else {
      setInternalIsOpen(false);
    }
  };

  const handleInputClick = () => {
    if (!disabled) {
      if (onOpenChange) {
        onOpenChange(true);
      } else {
        setInternalIsOpen(true);
      }
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) {
        if (onOpenChange) {
          onOpenChange(true);
        } else {
          setInternalIsOpen(true);
        }
      }
    }
  };

  // Update display date when value changes
  useEffect(() => {
    if (value) {
      setDisplayDate(dayjs(value));
    }
  }, [value]);

  // Initialize pending date when modal opens (only on modal open, not on selectedDate changes)
  useEffect(() => {
    if (modalIsOpen) {
      setPendingDate(selectedDate);
    }
  }, [modalIsOpen]); // Removed selectedDate from dependencies to prevent circular updates

  const contextValue = {
    selectedDate,
    pendingDate,
    displayDate,
    onDateSelect: handleDateSelect,
    onDisplayDateChange: handleDisplayDateChange,
    onConfirm: handleConfirm,
    onClose: handleClose,
    isOpen: modalIsOpen,
  };

  return (
    <DatePickerContext.Provider value={contextValue}>
      <div className={cn(datePickerVariants({ variant, size }), wrapperClassName)}>
        {showInput && (
          <>
            <TextInput
              ref={inputRef}
              id={id}
              name={name}
              value={displayValue}
              placeholder={placeholder}
              label={label}
              helperText={helperText}
              errorText={errorText}
              disabled={disabled}
              required={required}
              showLabel={showLabel}
              labelClassName={labelClassName}
              helperClassName={helperClassName}
              errorClassName={errorClassName}
              variant={variant}
              size={size}
              readOnly
              onClick={handleInputClick}
              onKeyDown={handleInputKeyDown}
              className={cn('cursor-pointer', disabled && 'cursor-not-allowed', className)}
              style={{ caretColor: 'transparent' }}
            />

            {/* Calendar Icon */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Calendar className={cn('h-4 w-4 text-slate-400', disabled && 'text-slate-300')} />
            </div>
          </>
        )}

        {/* Date Picker Modal */}
        {modalIsOpen && (
          <Modal
            onClose={handleClose}
            size={modalSize}
            closeOnOverlayClick={closeOnOverlayClick}
            closeOnEscape={closeOnEscape}
            className="max-w-sm"
          >
            <Modal.Header>
              <Modal.Title>Select Date</Modal.Title>
              <Modal.CloseButton />
            </Modal.Header>

            <div className="bg-white">
              <DatePickerHeader />
              <DatePickerCalendar />
              <DatePickerFooter
                showTodayButton={showTodayButton}
                showClearButton={showClearButton}
                todayButtonText={todayButtonText}
                clearButtonText={clearButtonText}
              />
            </div>
          </Modal>
        )}
      </div>
    </DatePickerContext.Provider>
  );
}
