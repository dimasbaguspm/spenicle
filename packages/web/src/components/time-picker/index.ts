import { TimePicker as BaseTimePicker } from './time-picker';
import { TimePickerClock } from './time-picker-clock';
import { TimePickerFooter } from './time-picker-footer';

type TimePickerCompositionModel = {
  Clock: typeof TimePickerClock;
  Footer: typeof TimePickerFooter;
};

const TimePickerComposition = {
  Clock: TimePickerClock,
  Footer: TimePickerFooter,
} satisfies TimePickerCompositionModel;

export const TimePicker = Object.assign(BaseTimePicker, TimePickerComposition);

export type { TimePickerProps } from './time-picker';
export type { TimePickerContextValue } from './time-picker-context';
