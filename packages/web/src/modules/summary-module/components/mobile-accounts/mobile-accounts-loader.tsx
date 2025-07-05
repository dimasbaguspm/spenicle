import React from 'react';

import { Tile } from '../../../../components';

interface MobileAccountsLoaderProps {
  count?: number;
}

/**
 * Loading state component for mobile accounts
 * Follows the same pattern as mobile period breakdown loader
 */
export const MobileAccountsLoader: React.FC<MobileAccountsLoaderProps> = ({ count = 5 }) => (
  <div className="space-y-6">
    {/* pie chart skeleton */}
    <Tile className="p-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-5 bg-slate-200 rounded w-1/2 animate-pulse" />
          <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse" />
        </div>
        {/* segment toggle skeleton */}
        <div className="h-8 bg-slate-100 rounded animate-pulse" />
        {/* pie chart area */}
        <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
      </div>
    </Tile>

    {/* table skeleton */}
    <Tile className="p-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-5 bg-slate-200 rounded w-1/3 animate-pulse" />
          <div className="h-4 bg-slate-100 rounded w-2/3 animate-pulse" />
        </div>
        <div className="space-y-3">
          {/* card skeletons */}
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="p-3 border border-mist-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {/* icon skeleton */}
                  <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    {/* account name */}
                    <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse" />
                    {/* transaction count */}
                    <div className="h-3 bg-slate-100 rounded w-1/2 animate-pulse" />
                  </div>
                </div>
                {/* amount skeleton */}
                <div className="h-4 bg-slate-200 rounded w-16 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Tile>
  </div>
);
