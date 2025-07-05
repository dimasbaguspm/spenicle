import dayjs from 'dayjs';
import { Check } from 'lucide-react';
import React, { useCallback } from 'react';

import type { PeriodType } from '../../../hooks/use-desktop-summary-filters';
import type { PeriodOption } from '../helpers';

interface PeriodOptionsGridProps {
  periodType: PeriodType;
  options: PeriodOption[];
  selectedStartDate: Date | null;
  selectedEndDate: Date | null;
  onSelect: (option: PeriodOption) => void;
}

/**
 * Grid of selectable period options with clear visual states
 * Enhanced design following latest UI guidelines with improved visual hierarchy
 * Optimized with React.memo to prevent unnecessary re-renders
 */
export const PeriodOptionsGrid: React.FC<PeriodOptionsGridProps> = React.memo(
  ({ periodType, options, selectedStartDate, selectedEndDate, onSelect }) => {
    return (
      <div className="grid grid-cols-2 gap-3 mt-4">
        {options.map((option, index) => (
          <PeriodOptionCard
            key={index}
            periodType={periodType}
            option={option}
            selectedStartDate={selectedStartDate}
            selectedEndDate={selectedEndDate}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }
);

PeriodOptionsGrid.displayName = 'PeriodOptionsGrid';

interface PeriodOptionCardProps {
  periodType: PeriodType;
  option: PeriodOption;
  selectedStartDate: Date | null;
  selectedEndDate: Date | null;
  onSelect: (option: PeriodOption) => void;
}

const PeriodOptionCard: React.FC<PeriodOptionCardProps> = React.memo(
  ({ periodType, option, selectedStartDate, selectedEndDate, onSelect }) => {
    const handleClick = useCallback(() => {
      onSelect(option);
    }, [onSelect, option]);

    if (option.isFuture) return null;

    // determine if this option is selected based on form state
    const isSelected =
      selectedStartDate &&
      selectedEndDate &&
      option.startDate.getTime() === selectedStartDate.getTime() &&
      option.endDate.getTime() === selectedEndDate.getTime();

    // determine card state styles
    const getCardStyles = () => {
      if (isSelected) {
        return 'border-coral-300 bg-coral-50 text-coral-900 shadow-sm ring-2 ring-coral-100';
      }

      if (option.isCurrent) {
        return 'border-sage-300 bg-sage-50 text-sage-900 hover:border-sage-400 hover:bg-sage-100 transition-all duration-200';
      }

      return 'border-mist-200 bg-white text-slate-700 hover:border-mist-300 hover:bg-mist-25 hover:shadow-sm transition-all duration-200';
    };

    return (
      <button
        type="button"
        onClick={handleClick}
        className={`
        relative p-4 rounded-xl border-2 text-left focus:outline-none focus:ring-2 focus:ring-coral-200 focus:border-coral-300
        ${getCardStyles()}
      `}
      >
        {/* Main period label */}
        <div className="font-semibold text-sm mb-1">{option.label}</div>

        {/* Date range for non-weekly periods */}
        {periodType !== 'weekly' && (
          <div className="text-xs opacity-75 font-medium">
            {dayjs(option.startDate).format('MMM D')} - {dayjs(option.endDate).format('MMM D')}
          </div>
        )}

        <div className="absolute top-3 right-3 flex items-center gap-1">
          {option.isCurrent && !isSelected && (
            <div className="w-2.5 h-2.5 rounded-full bg-sage-500 shadow-sm" title="Current period" />
          )}
          {isSelected && (
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-coral-500 text-white">
              <Check className="w-3 h-3" />
            </div>
          )}
        </div>
      </button>
    );
  }
);

PeriodOptionCard.displayName = 'PeriodOptionCard';
