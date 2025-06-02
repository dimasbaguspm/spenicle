import { createContext, useContext } from 'react';

export interface TimePickerContextValue {
  selectedTime: { hour: number; minute: number } | null;
  pendingTime: { hour: number; minute: number } | null;
  step: 'hour' | 'minute';
  onTimeSelect: (time: { hour: number; minute: number } | null) => void;
  onHourSelect: (hour: number) => void;
  onMinuteSelect: (minute: number) => void;
  onNextStep: () => void;
  onPreviousStep: () => void;
  onConfirm: () => void;
  onClose: () => void;
  isOpen: boolean;
  is24Hour?: boolean;
}

export const TimePickerContext = createContext<TimePickerContextValue | null>(null);

export const useTimePickerContext = () => {
  const context = useContext(TimePickerContext);
  if (!context) {
    throw new Error('useTimePickerContext must be used within a TimePickerContext.Provider');
  }
  return context;
};
