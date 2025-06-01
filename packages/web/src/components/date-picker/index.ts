import { DatePicker as BaseDatePicker } from './date-picker';
import { DatePickerCalendar } from './date-picker-calendar';
import { DatePickerFooter } from './date-picker-footer';
import { DatePickerHeader } from './date-picker-header';

type DatePickerCompositionModel = {
  Header: typeof DatePickerHeader;
  Calendar: typeof DatePickerCalendar;
  Footer: typeof DatePickerFooter;
};

const DatePickerComposition = {
  Header: DatePickerHeader,
  Calendar: DatePickerCalendar,
  Footer: DatePickerFooter,
} satisfies DatePickerCompositionModel;

export const DatePicker = Object.assign(BaseDatePicker, DatePickerComposition);

export type { DatePickerProps } from './date-picker';
export type { DatePickerHeaderProps } from './date-picker-header';
export type { DatePickerCalendarProps } from './date-picker-calendar';
export type { DatePickerFooterProps } from './date-picker-footer';
