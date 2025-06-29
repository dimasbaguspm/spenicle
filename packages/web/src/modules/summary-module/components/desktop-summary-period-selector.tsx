import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button, IconButton, Tile } from '../../../components';
import { useDesktopSummaryFilters } from '../hooks';

interface DesktopSummaryPeriodSelectorProps {
  // display props for period information
  currentPeriodDisplay: string;
  isCurrentPeriod: boolean;
}

export const DesktopSummaryPeriodSelector = ({
  currentPeriodDisplay,
  isCurrentPeriod,
}: DesktopSummaryPeriodSelectorProps) => {
  // consume hook for internal state management
  const { _internal } = useDesktopSummaryFilters();
  const { currentPeriodType, setPeriodType, navigatePeriod, goToCurrentPeriod } = _internal;

  // get contextual labels for quick select based on period type
  const getQuickSelectLabels = (type: typeof currentPeriodType) => {
    switch (type) {
      case 'weekly':
        return {
          previous: 'Last Week',
          current: 'This Week',
          next: 'Next Week',
        };
      case 'monthly':
        return {
          previous: 'Last Month',
          current: 'This Month',
          next: 'Next Month',
        };
      case 'yearly':
        return {
          previous: 'Last Year',
          current: 'This Year',
          next: 'Next Year',
        };
      default:
        return {
          previous: 'Previous',
          current: 'Current',
          next: 'Next',
        };
    }
  };

  const handlePreviousPeriod = () => {
    navigatePeriod('prev');
  };

  const handleCurrentPeriod = () => {
    goToCurrentPeriod();
  };

  const handleNextPeriod = () => {
    navigatePeriod('next');
  };

  return (
    <Tile className="p-4">
      <div className="space-y-1 mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Time Period</h3>
        <p className="text-sm text-slate-500">Select analysis timeframe</p>
      </div>

      {/* period type selector */}
      <div className="space-y-4">
        <div className="flex gap-1 bg-mist-50 p-1 rounded-lg">
          {(['weekly', 'monthly', 'yearly'] as const).map((type) => (
            <Button
              key={type}
              onClick={() => setPeriodType(type)}
              variant={currentPeriodType === type ? 'coral' : 'ghost'}
              size="sm"
              className="flex-1 text-xs"
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>

        {/* dynamic period navigation */}
        <div className="bg-mist-25 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <IconButton variant="mist-outline" size="sm" onClick={() => navigatePeriod('prev')} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </IconButton>

            <div className="text-center flex-1 px-3">
              <div className="text-sm font-medium text-slate-900">{currentPeriodDisplay}</div>
              {!isCurrentPeriod && <div className="text-xs text-slate-500 mt-1">Historical period</div>}
            </div>

            <IconButton variant="mist-outline" size="sm" onClick={() => navigatePeriod('next')} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        {/* quick period shortcuts */}
        <div className="space-y-1">
          <p className="text-xs text-slate-500 mb-2">Quick select</p>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={handlePreviousPeriod}
              className="px-2 py-1 rounded text-xs transition-all duration-200 hover:bg-mist-50 text-slate-600"
            >
              {getQuickSelectLabels(currentPeriodType).previous}
            </button>
            <button
              onClick={handleCurrentPeriod}
              className={`px-2 py-1 rounded text-xs transition-all duration-200 ${
                isCurrentPeriod ? 'bg-sage-100 text-sage-900 font-medium' : 'hover:bg-mist-50 text-slate-600'
              }`}
            >
              {getQuickSelectLabels(currentPeriodType).current}
            </button>
            <button
              onClick={handleNextPeriod}
              className="px-2 py-1 rounded text-xs transition-all duration-200 hover:bg-mist-50 text-slate-600"
            >
              {getQuickSelectLabels(currentPeriodType).next}
            </button>
          </div>
        </div>
      </div>
    </Tile>
  );
};
