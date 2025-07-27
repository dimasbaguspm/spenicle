import { SegmentSingleInput } from '@dimasbaguspm/versaur/forms';
import { ButtonIcon, Text, Tile } from '@dimasbaguspm/versaur/primitive';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useDesktopSummaryFilters } from '../../hooks';

interface DesktopSummaryPeriodSelectorProps {
  currentPeriodDisplay: string;
}

export const DesktopSummaryPeriodSelector = ({ currentPeriodDisplay }: DesktopSummaryPeriodSelectorProps) => {
  const { _internal, state } = useDesktopSummaryFilters();

  const { currentPeriodType, setPeriodType, navigatePeriod } = _internal;

  return (
    <Tile>
      <div className="space-y-1 mb-6">
        <Text as="h3" fontSize="lg" fontWeight="semibold">
          Time Period
        </Text>
        <Text as="p" fontSize="sm">
          Select analysis timeframe
        </Text>
      </div>

      {/* period type selector */}
      <div className="space-y-4">
        <div className="flex gap-1 bg-mist-50 p-1 rounded-lg">
          <SegmentSingleInput
            className="w-full flex items-center justify-center"
            name="period-type"
            value={currentPeriodType}
            onChange={(value) => setPeriodType(value as 'weekly' | 'monthly' | 'yearly')}
            size="sm"
            variant="primary"
          >
            <SegmentSingleInput.Option value="weekly">Weekly</SegmentSingleInput.Option>
            <SegmentSingleInput.Option value="monthly">Monthly</SegmentSingleInput.Option>
            <SegmentSingleInput.Option value="yearly">Yearly</SegmentSingleInput.Option>
          </SegmentSingleInput>
        </div>

        {/* dynamic period navigation */}
        <div className="flex items-center justify-between">
          <ButtonIcon
            as={ChevronLeft}
            variant="ghost"
            size="sm"
            onClick={() => navigatePeriod('prev')}
            aria-label="Back to previous period"
          />

          <Text as="span" fontSize="sm" fontWeight="medium" align="center">
            {currentPeriodDisplay}
          </Text>

          <ButtonIcon
            as={ChevronRight}
            variant="ghost"
            size="sm"
            onClick={() => navigatePeriod('next')}
            className="h-8 w-8"
            disabled={state.isFuturePeriod}
            aria-label="Go to next period"
          />
        </div>
      </div>
    </Tile>
  );
};
