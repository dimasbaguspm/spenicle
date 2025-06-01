import dayjs from 'dayjs';
import { createContext } from 'react';

export interface DatePickerContextType {
  selectedDate: dayjs.Dayjs | null;
  pendingDate: dayjs.Dayjs | null; // New: temporary selection before confirmation
  displayDate: dayjs.Dayjs;
  onDateSelect: (date: dayjs.Dayjs | null) => void; // Now updates pending date
  onDisplayDateChange: (date: dayjs.Dayjs) => void;
  onConfirm: () => void; // New: confirms the pending selection
  onClose: () => void;
  isOpen: boolean;
}

export const DatePickerContext = createContext<DatePickerContextType | null>(null);
