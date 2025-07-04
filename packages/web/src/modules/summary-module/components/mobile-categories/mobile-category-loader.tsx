import React from 'react';

import { Skeleton } from '../../../../components/skeleton';

interface MobileCategoryLoaderProps {
  count?: number;
}

export const MobileCategoryLoader: React.FC<MobileCategoryLoaderProps> = ({ count = 5 }) => {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading expenses by category">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="min-h-[115px] w-full rounded-lg" variant="mist" />
      ))}
    </div>
  );
};
