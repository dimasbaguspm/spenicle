import React from 'react';

import { Skeleton } from '../../../../components/skeleton';

interface PeriodBreakdownLoaderProps {
  count?: number;
}

export const DesktopPeriodBreakdownLoader: React.FC<PeriodBreakdownLoaderProps> = ({ count = 4 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="min-h-[115px] w-full rounded-lg" variant="mist" />
      ))}
    </div>
  );
};
