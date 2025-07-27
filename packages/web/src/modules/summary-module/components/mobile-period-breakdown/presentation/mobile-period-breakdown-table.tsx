import { Text, Tile } from '@dimasbaguspm/versaur/primitive';
import React from 'react';

import type { SummaryTransactionsPeriod } from '../../../../../types/api';
import type { PeriodType } from '../../../hooks';
import { MobilePeriodBreakdownCardList } from '../mobile-period-breakdown-card-list';

interface MobilePeriodBreakdownTableProps {
  data: Array<
    SummaryTransactionsPeriod[number] & {
      label: string;
      transactionCount: number;
    }
  >;
  periodType: PeriodType;
  onPeriodClick?: (period: SummaryTransactionsPeriod[number]) => void;
}

// mobile-optimized table/list section for period breakdown - follows desktop pattern
export const MobilePeriodBreakdownTable: React.FC<MobilePeriodBreakdownTableProps> = ({
  data,
  periodType,
  onPeriodClick,
}) => (
  <Tile className="space-y-4">
    <div>
      <Text as="h3" fontSize="lg" fontWeight="semibold">
        Period Breakdown Details
      </Text>
      <Text as="p" fontSize="sm" color="gray">
        Essential period metrics for the selected timeframe
      </Text>
    </div>
    <MobilePeriodBreakdownCardList
      periods={data}
      periodType={periodType}
      onPeriodClick={onPeriodClick ? (period) => onPeriodClick(period) : undefined}
    />
  </Tile>
);
