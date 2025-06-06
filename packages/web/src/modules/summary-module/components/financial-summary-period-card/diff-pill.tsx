import React from 'react';

import { formatNumberCompact } from '../../../../libs/utils';

interface DiffPillProps {
  diff: number;
  className?: string;
}

/**
 * DiffPill displays the difference from the previous month as a colored pill.
 * Positive values are shown in success (green), negative in danger (red).
 * If diff is 0, renders nothing.
 */
export const DiffPill: React.FC<DiffPillProps> = ({ diff, className }) => {
  if (diff === 0) return null;
  const isPositive = diff > 0;
  const colorClass = isPositive
    ? 'bg-success-100 text-success-600 border border-success-200'
    : 'bg-danger-100 text-danger-500 border border-danger-200';
  const icon = isPositive ? '▲' : '▼';
  return (
    <span
      className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold align-middle inline-flex items-center gap-1 ${colorClass} ${className ?? ''}`}
      aria-label={isPositive ? 'Increase from last month' : 'Decrease from last month'}
    >
      {isPositive ? '+' : ''}
      {formatNumberCompact(diff)}
      <span className="text-[10px]">{icon}</span>
    </span>
  );
};
