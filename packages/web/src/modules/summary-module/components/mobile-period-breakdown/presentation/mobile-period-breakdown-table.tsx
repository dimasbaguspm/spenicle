import React from 'react';

import { Tile } from '../../../../../components';
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
  <Tile className="p-6">
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Period Breakdown Details</h3>
        <p className="text-sm text-slate-600">
          Essential period metrics for the selected timeframe (showing {data.length}{' '}
          {periodType === 'weekly' ? 'days' : periodType === 'monthly' ? 'weeks' : 'months'})
        </p>
      </div>
      <MobilePeriodBreakdownCardList
        periods={data}
        periodType={periodType}
        onPeriodClick={onPeriodClick ? (period) => onPeriodClick(period) : undefined}
      />
    </div>
  </Tile>
);
