import React from 'react';

import { Skeleton } from '../../../../components/skeleton';

interface AccountsLoaderProps {
  count?: number;
}

export const AccountsLoader: React.FC<AccountsLoaderProps> = ({ count = 5 }) => {
  // Render animated skeletons for loading state
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading accounts summary">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
};
