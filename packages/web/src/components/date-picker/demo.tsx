import { useState } from 'react';

import { Button } from '../button';

import { DatePicker } from './date-picker';

export function DatePickerDemo() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDate2, setSelectedDate2] = useState<Date | null>(new Date());
  const [selectedDate3, setSelectedDate3] = useState<Date | null>(null);
  const [externalModalOpen, setExternalModalOpen] = useState(false);
  const [modalOnlyDate, setModalOnlyDate] = useState<Date | null>(null);
  const [changeLog, setChangeLog] = useState<string[]>([]);

  const handleDateChange = (date: Date | null, label: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setChangeLog((prev) => [
      ...prev.slice(-4),
      `${timestamp}: ${label} changed to ${date?.toLocaleDateString() ?? 'null'}`,
    ]);
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-mist-200 mb-8">
      <h2 className="text-lg font-semibold text-slate-600 mb-6">Date Picker Components</h2>

      <div className="space-y-8">
        {/* External Modal Control */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">External Modal Control</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button variant="coral" onClick={() => setExternalModalOpen(true)}>
                Open Date Picker
              </Button>
              <span className="text-sm text-slate-600">
                Selected: {modalOnlyDate ? modalOnlyDate.toLocaleDateString() : 'None'}
              </span>
            </div>

            {/* Hidden input DatePicker controlled externally */}
            <DatePicker
              showInput={false}
              isOpen={externalModalOpen}
              onOpenChange={setExternalModalOpen}
              value={modalOnlyDate}
              onChange={(date) => {
                setModalOnlyDate(date);
                handleDateChange(date, 'External Modal');
              }}
              modalSize="md"
            />
          </div>
        </div>

        {/* Change Log */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">onChange Events Log</h3>
          <div className="bg-slate-50 rounded-lg p-3 max-h-32 overflow-y-auto">
            {changeLog.length === 0 ? (
              <p className="text-xs text-slate-400">
                No changes yet. Try selecting dates to see when onChange is triggered.
              </p>
            ) : (
              <div className="space-y-1">
                {changeLog.map((log, index) => (
                  <p key={index} className="text-xs text-slate-600">
                    {log}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Basic Usage */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Basic Usage</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePicker
              label="Select Date"
              placeholder="Choose a date..."
              value={selectedDate}
              onChange={(date) => {
                setSelectedDate(date);
                handleDateChange(date, 'Basic DatePicker');
              }}
              helperText="Pick any date from the calendar"
            />

            <DatePicker
              label="Pre-selected Date"
              placeholder="Today is selected..."
              value={selectedDate2}
              onChange={(date) => {
                setSelectedDate2(date);
                handleDateChange(date, 'Pre-selected DatePicker');
              }}
              helperText="This date picker has a default value"
            />
          </div>
        </div>

        {/* Size Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Size Variants</h3>
          <div className="space-y-3">
            <DatePicker
              label="Small"
              size="sm"
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Small date picker"
              helperText="Small size date picker"
            />
            <DatePicker
              label="Medium (Default)"
              size="md"
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Medium date picker"
              helperText="Medium size date picker"
            />
            <DatePicker
              label="Large"
              size="lg"
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Large date picker"
              helperText="Large size date picker"
            />
            <DatePicker
              label="Extra Large"
              size="xl"
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Extra large date picker"
              helperText="Extra large size date picker"
            />
          </div>
        </div>

        {/* Color Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Color Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePicker
              label="🔥 Coral Theme"
              variant="coral"
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Coral themed picker"
              helperText="Primary coral color theme"
            />
            <DatePicker
              label="🌿 Sage Theme"
              variant="sage"
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Sage themed picker"
              helperText="Secondary sage color theme"
            />
            <DatePicker
              label="🌫️ Mist Theme"
              variant="mist"
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Mist themed picker"
              helperText="Tertiary mist color theme"
            />
            <DatePicker
              label="🔘 Slate Theme"
              variant="slate"
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Slate themed picker"
              helperText="Professional slate theme"
            />
          </div>
        </div>

        {/* States */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">States</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePicker
              label="Required Field"
              value={selectedDate3}
              onChange={setSelectedDate3}
              placeholder="Select date..."
              required
              errorText={!selectedDate3 ? 'Date is required' : undefined}
              helperText="This field is required"
            />

            <DatePicker
              label="Disabled Date Picker"
              value={selectedDate2}
              onChange={setSelectedDate2}
              placeholder="Disabled picker"
              disabled
              helperText="This date picker is disabled"
            />
          </div>
        </div>

        {/* Custom Format */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Custom Format</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePicker
              label="European Format"
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="DD/MM/YYYY"
              format="DD/MM/YYYY"
              helperText="European date format"
            />

            <DatePicker
              label="Long Format"
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Month DD, YYYY"
              format="MMMM DD, YYYY"
              helperText="Long readable format"
            />
          </div>
        </div>

        {/* Financial App Examples */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Financial App Examples</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePicker
              label="📊 Transaction Date"
              variant="coral"
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="When did this occur?"
              helperText="Date of the financial transaction"
            />

            <DatePicker
              label="💰 Budget Period Start"
              variant="sage"
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Budget start date"
              helperText="When does your budget period begin?"
            />

            <DatePicker
              label="📅 Bill Due Date"
              variant="mist"
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="When is payment due?"
              helperText="Set reminders for upcoming bills"
            />

            <DatePicker
              label="🎯 Financial Goal Date"
              variant="slate"
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Target completion date"
              helperText="When do you want to achieve this goal?"
            />
          </div>
        </div>

        {/* Footer Customization */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Footer Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePicker
              label="Custom Footer Buttons"
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Custom footer text"
              todayButtonText="🏠 Home"
              clearButtonText="🗑️ Reset"
              helperText="Customized button text"
            />

            <DatePicker
              label="Minimal Footer"
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="No extra buttons"
              showTodayButton={false}
              showClearButton={false}
              helperText="Only the Done button"
            />
          </div>
        </div>

        {/* Debug Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Debug Information</h3>
          <div className="bg-slate-50 rounded-lg p-4 text-sm font-mono">
            <div>Selected Date: {selectedDate ? selectedDate.toISOString() : 'null'}</div>
            <div>Pre-selected Date: {selectedDate2 ? selectedDate2.toISOString() : 'null'}</div>
            <div>Required Date: {selectedDate3 ? selectedDate3.toISOString() : 'null'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
