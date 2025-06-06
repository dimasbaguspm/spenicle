import React from 'react';

import { formatNumberCompact } from '../../../../libs/utils';

interface DiffPillProps {
  diff: number;
  className?: string;
  /**
   * If true, treat positive diffs as danger (red) and negative as success (green).
   * Useful for expense cards where an increase is bad.
   */
  isExpense?: boolean;
}

/**
 * DiffPill displays the difference from the previous month as a colored pill.
 * Positive values are shown in success (green), negative in danger (red).
 * If diff is 0, renders nothing.
 */
export const DiffPill: React.FC<DiffPillProps> = ({ diff, className, isExpense = false }) => {
  if (diff === 0) return null;
  const isPositive = diff > 0;
  // For expenses, positive is danger, negative is success. For others, positive is success, negative is danger.
  const colorClass = isExpense
    ? isPositive
      ? 'bg-danger-100 text-danger-500 border border-danger-200'
      : 'bg-success-100 text-success-600 border border-success-200'
    : isPositive
      ? 'bg-success-100 text-success-600 border border-success-200'
      : 'bg-danger-100 text-danger-500 border border-danger-200';
  const icon = isPositive ? '▲' : '▼';
  return (
    <span
      className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold align-middle inline-flex items-center gap-1 ${colorClass} ${className ?? ''}`}
      aria-label={
        isExpense
          ? isPositive
            ? 'Increase in expenses from last month'
            : 'Decrease in expenses from last month'
          : isPositive
            ? 'Increase from last month'
            : 'Decrease from last month'
      }
    >
      {isPositive ? '+' : ''}
      {formatNumberCompact(diff)}
      <span className="text-[10px]">{icon}</span>
    </span>
  );
};
