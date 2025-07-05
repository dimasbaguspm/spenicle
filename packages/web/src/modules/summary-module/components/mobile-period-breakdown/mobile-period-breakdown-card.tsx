// mobile-period-breakdown-card component, renamed from period-breakdown-card.tsx
import React from 'react';

import { Badge } from '../../../../components';
import { formatNumberCompact } from '../../../../libs/utils';
import type { SummaryTransactionsPeriod } from '../../../../types/api';
import type { PeriodType } from '../../hooks';

import { formatDateRange } from './helpers';

interface MobilePeriodBreakdownCardProps {
  period: SummaryTransactionsPeriod[number];
  periodType: PeriodType;
  onClick?: () => void;
}

export const MobilePeriodBreakdownCard: React.FC<MobilePeriodBreakdownCardProps> = ({
  period,
  periodType,
  onClick,
}) => {
  const periodTitle = formatDateRange(
    period.startDate ?? '',
    period.endDate ?? '',
    periodType as 'weekly' | 'monthly' | 'yearly'
  );

  let badgeVariant: 'success' | 'warning' | 'info' | 'mist' = 'warning';
  let badgeLabel = 'Negative';
  if ((period.totalIncome ?? 0) === 0 && (period.totalExpenses ?? 0) === 0) {
    badgeVariant = 'info';
    badgeLabel = 'No activity';
  } else if ((period.netAmount ?? 0) > 0) {
    badgeVariant = 'success';
    badgeLabel = 'Surplus';
  } else if ((period.netAmount ?? 0) === 0) {
    badgeVariant = 'mist';
    badgeLabel = 'Break even';
  } else {
    badgeVariant = 'warning';
    badgeLabel = 'Deficit';
  }

  return (
    <div
      className="bg-cream-50 rounded-lg p-4 border border-mist-200 cursor-pointer hover:bg-cream-100 transition"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyPress={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick();
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-slate-900">{periodTitle}</h4>
        <Badge variant={badgeVariant}>{badgeLabel}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-slate-500">Income</p>
          <p className="font-semibold text-sage-600">{formatNumberCompact(period.totalIncome ?? 0)}</p>
        </div>
        <div>
          <p className="text-slate-500">Expenses</p>
          <p className="font-semibold text-coral-600">{formatNumberCompact(period.totalExpenses ?? 0)}</p>
        </div>
        <div>
          <p className="text-slate-500">Net</p>
          <p
            className={`font-semibold ${
              period.netAmount && period.netAmount >= 0 ? 'text-sage-600' : 'text-coral-600'
            }`}
          >
            {period.netAmount && period.netAmount >= 0 ? '+' : ''}
            {formatNumberCompact(period.netAmount ?? 0)}
          </p>
        </div>
      </div>
    </div>
  );
};
