import React from 'react';

interface PeriodBreakdownTitleProps {
  title: string;
}

export const PeriodBreakdownTitle: React.FC<PeriodBreakdownTitleProps> = ({ title }) => (
  <span className="font-medium text-slate-900 min-w-[120px] text-center">{title}</span>
);
