import React from 'react';

import { Skeleton } from '../../../../components/skeleton';

interface MobileAccountsLoaderProps {
  count?: number;
}

export const MobileAccountsLoader: React.FC<MobileAccountsLoaderProps> = ({ count = 5 }) => {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading accounts summary">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="min-h-[115px]  w-full rounded-lg" variant="mist" />
      ))}
    </div>
  );
};
