import { cva, type VariantProps } from 'class-variance-authority';
import { Clock } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

import { cn } from '../../libs/utils';
import { Modal } from '../modal';
import { TextInput } from '../text-input';

import { TimePickerClock } from './time-picker-clock';
import { TimePickerContext } from './time-picker-context';
import { TimePickerFooter } from './time-picker-footer';

const timePickerVariants = cva('relative', {
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

export interface TimePickerProps extends VariantProps<typeof timePickerVariants> {
  value?: { hour: number; minute: number } | string | null;
  onChange?: (time: { hour: number; minute: number } | null) => void;
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
  is24Hour?: boolean;
  // Modal control
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Footer options
  showNowButton?: boolean;
  showClearButton?: boolean;
  nowButtonText?: string;
  clearButtonText?: string;
  // Modal options
  modalSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  // Input display
  showInput?: boolean;
}

function parseTimeValue(value: TimePickerProps['value']): { hour: number; minute: number } | null {
  if (!value) return null;

  if (typeof value === 'string') {
    const timeRegex = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i;
    const match = value.match(timeRegex);
    if (match) {
      let hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      const period = match[3]?.toUpperCase();

      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;

      return { hour, minute };
    }
    return null;
  }

  return value;
}

function formatTimeValue(time: { hour: number; minute: number } | null, is24Hour = false): string {
  if (!time) return '';

  if (is24Hour) {
    return `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`;
  }

  const hour12 = time.hour === 0 ? 12 : time.hour > 12 ? time.hour - 12 : time.hour;
  const period = time.hour >= 12 ? 'PM' : 'AM';
  return `${hour12}:${time.minute.toString().padStart(2, '0')} ${period}`;
}

export function TimePicker({
  value,
  onChange,
  placeholder = 'Select time...',
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
  is24Hour = false,
  variant,
  size,
  isOpen,
  onOpenChange,
  showNowButton = true,
  showClearButton = true,
  nowButtonText = 'Now',
  clearButtonText = 'Clear',
  modalSize = 'sm',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showInput = true,
}: TimePickerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [pendingTime, setPendingTime] = useState<{ hour: number; minute: number } | null>(null);
  const [step, setStep] = useState<'hour' | 'minute'>('hour');

  const inputRef = useRef<HTMLInputElement>(null);

  // Use external isOpen prop if provided, otherwise use internal state
  const modalIsOpen = isOpen ?? internalIsOpen;

  // Convert value to time object for internal use
  const selectedTime = parseTimeValue(value);

  // Format the display value
  const displayValue = formatTimeValue(selectedTime, is24Hour);

  const handleTimeSelect = (time: { hour: number; minute: number } | null) => {
    setPendingTime(time);
  };

  const handleHourSelect = (hour: number) => {
    setPendingTime((prev) => ({ hour, minute: prev?.minute ?? 0 }));
  };

  const handleMinuteSelect = (minute: number) => {
    setPendingTime((prev) => ({ hour: prev?.hour ?? 0, minute }));
  };

  const handleNextStep = () => {
    if (step === 'hour') {
      setStep('minute');
    }
  };

  const handlePreviousStep = () => {
    if (step === 'minute') {
      setStep('hour');
    }
  };

  const handleConfirm = () => {
    onChange?.(pendingTime);
    handleClose();
  };

  const handleClose = () => {
    // Reset to hour step when closing
    setStep('hour');
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

  // Initialize pending time when modal opens
  useEffect(() => {
    if (modalIsOpen) {
      setPendingTime(selectedTime ?? { hour: new Date().getHours(), minute: new Date().getMinutes() });
      // Reset to hour step when opening
      setStep('hour');
    }
  }, [modalIsOpen, selectedTime]);

  const contextValue = {
    selectedTime,
    pendingTime,
    step,
    onTimeSelect: handleTimeSelect,
    onHourSelect: handleHourSelect,
    onMinuteSelect: handleMinuteSelect,
    onNextStep: handleNextStep,
    onPreviousStep: handlePreviousStep,
    onConfirm: handleConfirm,
    onClose: handleClose,
    isOpen: modalIsOpen,
    is24Hour,
  };

  return (
    <TimePickerContext.Provider value={contextValue}>
      <div className={cn(timePickerVariants({ variant, size }), wrapperClassName)}>
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

            {/* Clock Icon */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Clock className={cn('h-4 w-4 text-slate-400', disabled && 'text-slate-300')} />
            </div>
          </>
        )}

        {/* Time Picker Modal */}
        {modalIsOpen && (
          <Modal
            onClose={handleClose}
            size={modalSize}
            closeOnOverlayClick={closeOnOverlayClick}
            closeOnEscape={closeOnEscape}
            className="max-w-md"
          >
            <Modal.Header>
              <Modal.Title>Select Time</Modal.Title>
              <Modal.CloseButton />
            </Modal.Header>

            <div className="bg-white">
              <TimePickerClock />
              <TimePickerFooter
                showNowButton={showNowButton}
                showClearButton={showClearButton}
                nowButtonText={nowButtonText}
                clearButtonText={clearButtonText}
              />
            </div>
          </Modal>
        )}
      </div>
    </TimePickerContext.Provider>
  );
}
