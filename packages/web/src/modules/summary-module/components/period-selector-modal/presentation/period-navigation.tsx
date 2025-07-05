import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';

import { IconButton } from '../../../../../components/button/icon-button';

interface PeriodNavigationProps {
  title: string;
  canNavigateForward: boolean;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
}

/**
 * Period navigation header with intuitive controls
 * Follows design system color palette and accessibility guidelines
 * Optimized with React.memo to prevent unnecessary re-renders
 */
export const PeriodNavigation: React.FC<PeriodNavigationProps> = React.memo(
  ({ title, canNavigateForward, onNavigateBack, onNavigateForward }) => {
    return (
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">Available Periods</h3>
        <div className="flex items-center gap-3">
          <IconButton
            variant="sage-ghost"
            size="sm"
            type="button"
            onClick={onNavigateBack}
            aria-label="Previous period range"
            className="hover:bg-sage-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </IconButton>
          <span className="text-sm font-medium text-slate-900 min-w-[140px] text-center px-2">{title}</span>
          <IconButton
            variant="sage-ghost"
            size="sm"
            type="button"
            onClick={onNavigateForward}
            disabled={!canNavigateForward}
            aria-label="Next period range"
            className="hover:bg-sage-50 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </IconButton>
        </div>
      </div>
    );
  }
);

PeriodNavigation.displayName = 'PeriodNavigation';
