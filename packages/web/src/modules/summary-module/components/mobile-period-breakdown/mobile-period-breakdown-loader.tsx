// mobile-period-breakdown-loader component, renamed from period-breakdown-loader.tsx

import React from 'react';

import { Skeleton } from '../../../../components/skeleton';

interface MobilePeriodBreakdownLoaderProps {
  count?: number;
}

export const MobilePeriodBreakdownLoader: React.FC<MobilePeriodBreakdownLoaderProps> = ({ count = 4 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="min-h-[115px] w-full rounded-lg" variant="mist" />
      ))}
    </div>
  );
};
