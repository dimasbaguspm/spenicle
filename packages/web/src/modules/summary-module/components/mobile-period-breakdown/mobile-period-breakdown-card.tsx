// mobile-period-breakdown-card component, renamed from period-breakdown-card.tsx
import { Badge, Text, Tile, type BadgeProps } from '@dimasbaguspm/versaur/primitive';
import React from 'react';

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

  let badgeColor: BadgeProps['color'] = 'warning';
  let badgeLabel = 'Negative';
  if ((period.totalIncome ?? 0) === 0 && (period.totalExpenses ?? 0) === 0) {
    badgeColor = 'neutral';
    badgeLabel = 'No activity';
  } else if ((period.netAmount ?? 0) > 0) {
    badgeColor = 'success';
    badgeLabel = 'Surplus';
  } else if ((period.netAmount ?? 0) === 0) {
    badgeColor = 'tertiary';
    badgeLabel = 'Break even';
  } else {
    badgeColor = 'warning';
    badgeLabel = 'Deficit';
  }

  return (
    <Tile onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="flex items-center justify-between mb-2">
        <Text as="h4" fontWeight="medium" fontSize="base">
          {periodTitle}
        </Text>
        <Badge color={badgeColor}>{badgeLabel}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <Text as="p" fontSize="sm" fontWeight="normal">
            Income
          </Text>
          <Text as="p" fontSize="base" fontWeight="semibold" color="secondary">
            {formatNumberCompact(period.totalIncome ?? 0)}
          </Text>
        </div>
        <div>
          <Text as="p" fontSize="sm" fontWeight="normal">
            Expenses
          </Text>
          <Text as="p" fontSize="base" fontWeight="semibold" color="primary">
            {formatNumberCompact(period.totalExpenses ?? 0)}
          </Text>
        </div>
        <div>
          <Text as="p" fontSize="sm" fontWeight="normal">
            Net
          </Text>
          <Text
            as="p"
            fontSize="base"
            fontWeight="semibold"
            color={period.netAmount && period.netAmount >= 0 ? 'secondary' : 'primary'}
          >
            {period.netAmount && period.netAmount >= 0 ? '+' : ''}
            {formatNumberCompact(period.netAmount ?? 0)}
          </Text>
        </div>
      </div>
    </Tile>
  );
};
