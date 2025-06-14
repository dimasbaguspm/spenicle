import React from 'react';

import { Skeleton } from '../../../../components/skeleton';

interface CategoriesListLoaderProps {
  count?: number;
}

export const CategoriesListLoader: React.FC<CategoriesListLoaderProps> = ({ count = 6 }) => {
  return (
    <div className="space-y-0" aria-busy="true" aria-label="Loading categories">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-mist-100 last:border-b-0">
          <div className="w-6 h-6 flex items-center justify-center">
            <Skeleton shape="rectangle" size="xs" className="w-4 h-4" variant="mist" />
          </div>
          <Skeleton shape="circle" size="lg" variant="mist" className="flex-shrink-0" />

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton shape="rectangle" size="sm" className="w-32 h-4" variant="mist" />
              {i % 3 === 0 && <Skeleton shape="pill" size="xs" className="w-16 h-5" variant="sage" />}
            </div>
            <Skeleton shape="rectangle" size="xs" className="w-24 h-3" variant="mist" />
          </div>

          <div className="flex items-center gap-1">
            <Skeleton shape="circle" size="md" variant="mist" />
            <Skeleton shape="circle" size="md" variant="mist" />
          </div>
        </div>
      ))}
    </div>
  );
};
