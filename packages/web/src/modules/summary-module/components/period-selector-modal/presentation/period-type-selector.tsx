import React, { useMemo } from 'react';

import { Segment } from '../../../../../components/segment/segment';
import type { PeriodType } from '../../../hooks/use-desktop-summary-filters';

interface PeriodTypeSelectorProps {
  value: PeriodType;
  onChange: (value: PeriodType) => void;
  options: { value: PeriodType; label: string }[];
}

/**
 * Period type selector component using consistent segment UI
 * Follows design system guidelines for selection controls
 * Properly handles type conversion between PeriodType and string for Segment component
 * Optimized with React.memo and useMemo to prevent unnecessary re-renders
 */
export const PeriodTypeSelector: React.FC<PeriodTypeSelectorProps> = React.memo(({ value, onChange, options }) => {
  // convert PeriodType options to SegmentOption format (memoized)
  const segmentOptions = useMemo(
    () =>
      options.map((option) => ({
        value: option.value as string,
        label: option.label,
      })),
    [options]
  );

  const handleValueChange = useMemo(
    () => (newValue: string) => {
      // ensure the value is a valid PeriodType before calling onChange
      if (newValue === 'weekly' || newValue === 'monthly' || newValue === 'yearly') {
        onChange(newValue);
      }
    },
    [onChange]
  );

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">Period Type</label>
      <Segment
        options={segmentOptions}
        value={value}
        onValueChange={handleValueChange}
        variant="sage"
        segmentSize="lg"
        className="w-full"
      />
    </div>
  );
});

PeriodTypeSelector.displayName = 'PeriodTypeSelector';
