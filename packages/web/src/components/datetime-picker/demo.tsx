import { useState } from 'react';

import { DateTimePicker } from './datetime-picker';

export function DateTimePickerDemo() {
  const [value1, setValue1] = useState<Date | null>(null);
  const [value2, setValue2] = useState<Date | null>(new Date());
  const [value3, setValue3] = useState<Date | null>(null);
  const [value4, setValue4] = useState<Date | null>(null);

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">DateTime Picker Demo</h1>
        <p className="text-slate-600 mb-8">
          A reusable datetime input picker that combines date and time selection in separate modals.
        </p>
      </div>

      <div className="space-y-6">
        {/* Basic Example */}
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Basic DateTime Picker</h2>
          <DateTimePicker
            label="Event Date & Time"
            placeholder="Select when the event occurs..."
            value={value1}
            onChange={setValue1}
            helperText="Click the calendar icon to select date, clock icon to select time"
          />
          {value1 && <p className="mt-2 text-sm text-slate-600">Selected: {value1.toLocaleString()}</p>}
        </div>

        {/* Pre-filled Example */}
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Pre-filled DateTime Picker</h2>
          <DateTimePicker
            label="Meeting Schedule"
            placeholder="Select meeting time..."
            value={value2}
            onChange={setValue2}
            helperText="This picker starts with a pre-selected date and time"
            variant="sage"
          />
          {value2 && <p className="mt-2 text-sm text-slate-600">Selected: {value2.toLocaleString()}</p>}
        </div>

        {/* 24-Hour Format */}
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">24-Hour Format</h2>
          <DateTimePicker
            label="Departure Time"
            placeholder="Select departure time..."
            value={value3}
            onChange={setValue3}
            is24Hour={true}
            helperText="Uses 24-hour time format (military time)"
            variant="mist"
          />
          {value3 && <p className="mt-2 text-sm text-slate-600">Selected: {value3.toLocaleString()}</p>}
        </div>

        {/* Required with Validation */}
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Required Field</h2>
          <DateTimePicker
            label="Appointment Date & Time"
            placeholder="Required field..."
            value={value4}
            onChange={setValue4}
            required={true}
            errorText={!value4 ? 'Date and time selection is required' : undefined}
            helperText="This field is required"
            variant="coral"
          />
          {value4 && <p className="mt-2 text-sm text-slate-600">Selected: {value4.toLocaleString()}</p>}
        </div>

        {/* Different Sizes */}
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Different Sizes</h2>
          <div className="space-y-4">
            <DateTimePicker
              label="Small Size"
              placeholder="Small datetime picker..."
              size="sm"
              helperText="Small size variant"
            />
            <DateTimePicker
              label="Medium Size (Default)"
              placeholder="Medium datetime picker..."
              size="md"
              helperText="Medium size variant (default)"
            />
            <DateTimePicker
              label="Large Size"
              placeholder="Large datetime picker..."
              size="lg"
              helperText="Large size variant"
            />
          </div>
        </div>

        {/* Disabled State */}
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Disabled State</h2>
          <DateTimePicker
            label="Disabled DateTime Picker"
            placeholder="This picker is disabled..."
            disabled={true}
            value={new Date()}
            helperText="This picker is disabled and cannot be interacted with"
            variant="slate"
          />
        </div>
      </div>
    </div>
  );
}
