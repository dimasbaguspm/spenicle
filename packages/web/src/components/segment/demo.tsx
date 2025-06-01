import { useState } from 'react';

import { Segment, type SegmentOption } from './segment';

export function SegmentDemo() {
  const [basicSegment, setBasicSegment] = useState('option1');
  const [viewMode, setViewMode] = useState('grid');
  const [timeRange, setTimeRange] = useState('week');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('active');
  const [filterType, setFilterType] = useState('all');

  // Basic options
  const basicOptions: SegmentOption[] = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  // View mode options with icons
  const viewModeOptions: SegmentOption[] = [
    {
      value: 'grid',
      label: 'Grid',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      ),
    },
    {
      value: 'list',
      label: 'List',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      value: 'card',
      label: 'Card',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
  ];

  // Time range options
  const timeRangeOptions: SegmentOption[] = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
  ];

  // Priority options
  const priorityOptions: SegmentOption[] = [
    { value: 'low', label: '🟢 Low' },
    { value: 'medium', label: '🟡 Medium' },
    { value: 'high', label: '🔴 High' },
    { value: 'urgent', label: '🚨 Urgent', disabled: true },
  ];

  // Status options
  const statusOptions: SegmentOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
  ];

  // Filter options
  const filterOptions: SegmentOption[] = [
    { value: 'all', label: 'All' },
    { value: 'income', label: '💰 Income' },
    { value: 'expense', label: '💸 Expense' },
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-mist-200 mb-8">
      <h2 className="text-lg font-semibold text-slate-600 mb-6">Segment Components</h2>

      <div className="space-y-8">
        {/* Default States */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Default States</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Segment
              id="basic"
              label="Basic Segment"
              options={basicOptions}
              value={basicSegment}
              onValueChange={setBasicSegment}
              helperText="Select one of the options"
            />
            <Segment
              id="disabled"
              label="Disabled Segment"
              options={basicOptions}
              value="option1"
              disabled
              helperText="This segment is disabled"
            />
          </div>
        </div>

        {/* Size Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Size Variants</h3>
          <div className="space-y-4">
            <Segment
              id="small"
              label="Small Size"
              size="sm"
              options={basicOptions}
              value="option2"
              helperText="Small size segment"
            />
            <Segment
              id="medium"
              label="Medium Size (Default)"
              size="md"
              options={basicOptions}
              value="option2"
              helperText="Medium size segment"
            />
            <Segment
              id="large"
              label="Large Size"
              size="lg"
              options={basicOptions}
              value="option2"
              helperText="Large size segment"
            />
            <Segment
              id="extra-large"
              label="Extra Large Size"
              size="xl"
              options={basicOptions}
              value="option2"
              helperText="Extra large size segment"
            />
          </div>
        </div>

        {/* Core Color Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Core Color Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Segment
              id="coral"
              label="Coral Variant"
              variant="coral"
              options={viewModeOptions}
              value={viewMode}
              onValueChange={setViewMode}
              helperText="Using coral color theme"
            />
            <Segment
              id="sage"
              label="Sage Variant"
              variant="sage"
              options={timeRangeOptions}
              value={timeRange}
              onValueChange={setTimeRange}
              helperText="Using sage color theme"
            />
            <Segment
              id="mist"
              label="Mist Variant"
              variant="mist"
              options={basicOptions}
              value="option1"
              helperText="Using mist color theme"
            />
            <Segment
              id="slate"
              label="Slate Variant"
              variant="slate"
              options={basicOptions}
              value="option2"
              helperText="Using slate color theme"
            />
          </div>
        </div>

        {/* Style Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Style Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Segment
              id="secondary"
              label="Secondary Style"
              variant="secondary"
              options={basicOptions}
              value="option1"
              helperText="Secondary style segment"
            />
            <Segment
              id="tertiary"
              label="Tertiary Style"
              variant="tertiary"
              options={basicOptions}
              value="option2"
              helperText="Tertiary style segment"
            />
            <Segment
              id="outline"
              label="Outline Style"
              variant="outline"
              options={basicOptions}
              value="option1"
              helperText="Outline style segment"
            />
            <Segment
              id="ghost"
              label="Ghost Style"
              variant="ghost"
              options={basicOptions}
              value="option3"
              helperText="Ghost style segment"
            />
          </div>
        </div>

        {/* Semantic Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Semantic Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Segment
              id="success"
              label="✅ Success Segment"
              variant="success"
              options={statusOptions}
              value={status}
              onValueChange={setStatus}
              helperText="Success state segment"
            />
            <Segment
              id="info"
              label="ℹ️ Info Segment"
              variant="info"
              options={filterOptions}
              value={filterType}
              onValueChange={setFilterType}
              helperText="Info state segment"
            />
            <Segment
              id="warning"
              label="⚠️ Warning Segment"
              variant="warning"
              options={priorityOptions}
              value={priority}
              onValueChange={setPriority}
              helperText="Warning state with disabled option"
            />
            <Segment
              id="danger"
              label="🚨 Danger Segment"
              variant="danger"
              options={basicOptions}
              value="option1"
              helperText="Danger state segment"
            />
          </div>
        </div>

        {/* Practical Examples */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Practical Examples</h3>
          <div className="space-y-4">
            <Segment
              id="expense-filter"
              label="💰 Expense Filter"
              variant="sage"
              options={filterOptions}
              value={filterType}
              onValueChange={setFilterType}
              helperText="Filter your financial transactions"
            />
            <Segment
              id="time-period"
              label="📅 Time Period"
              variant="mist"
              options={timeRangeOptions}
              value={timeRange}
              onValueChange={setTimeRange}
              helperText="Select reporting time period"
            />
            <Segment
              id="view-toggle"
              label="🔍 View Mode"
              variant="coral"
              options={viewModeOptions}
              value={viewMode}
              onValueChange={setViewMode}
              helperText="Choose how to display your data"
            />
          </div>
        </div>

        {/* Error State */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Error State</h3>
          <Segment
            id="error-example"
            label="Segment with Error"
            options={basicOptions}
            value=""
            errorText="Please select an option to continue"
            helperText="This segment has an error state"
          />
        </div>
      </div>
    </div>
  );
}
