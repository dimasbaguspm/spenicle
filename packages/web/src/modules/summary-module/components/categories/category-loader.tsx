import React from 'react';

import { Skeleton } from '../../../../components/skeleton';

interface CategoriesLoaderProps {
  count?: number;
}

export const CategoriesLoader: React.FC<CategoriesLoaderProps> = ({ count = 5 }) => {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading expenses by category">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
};
