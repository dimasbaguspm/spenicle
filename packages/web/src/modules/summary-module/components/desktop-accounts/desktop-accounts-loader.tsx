import React from 'react';

import { Tile } from '../../../../components';

interface DesktopAccountsLoaderProps {
  count?: number;
}

/**
 * Loading state component for desktop accounts page
 */
export const DesktopAccountsLoader: React.FC<DesktopAccountsLoaderProps> = ({ count = 5 }) => (
  <div className="space-y-6">
    {/* pie chart skeleton */}
    <Tile className="p-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-5 bg-slate-200 rounded w-1/3 animate-pulse" />
          <div className="h-4 bg-slate-100 rounded w-2/3 animate-pulse" />
        </div>
        <div className="h-80 bg-slate-100 rounded-lg animate-pulse" />
      </div>
    </Tile>

    {/* table skeleton */}
    <Tile className="p-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-5 bg-slate-200 rounded w-1/4 animate-pulse" />
          <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse" />
        </div>
        <div className="space-y-3">
          {/* table header */}
          <div className="grid grid-cols-6 gap-4 py-3 border-b border-slate-200">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-slate-200 rounded animate-pulse" />
            ))}
          </div>
          {/* table rows */}
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 py-3">
              {Array.from({ length: 6 }).map((__, j) => (
                <div key={j} className="h-4 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Tile>
  </div>
);
