import React from 'react';

import type { Category } from '../../../../types/api';
import { CategoryIcon } from '../../../category-module/components/category-icon/category-icon';

export interface ExpenseCardProps {
  category?: Category;
  totalExpenses: number;
  percentage: number;
  totalTransactions: number;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({ category, totalExpenses, percentage, totalTransactions }) => {
  const name = category?.name ?? 'Unknown Category';
  const color = (category?.metadata?.color as string | undefined) ?? 'bg-slate-500';
  const iconValue = (category?.metadata?.icon as string | undefined) ?? undefined;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <CategoryIcon iconValue={iconValue} colorValue={color} size="sm" />
        <span className="font-medium text-slate-900">{name}</span>
      </div>
      <div className="text-right">
        <p className="font-bold text-slate-900">${totalExpenses.toLocaleString()}</p>
        <p className="text-sm text-slate-500">
          {percentage.toFixed(1)}% • {totalTransactions} txns
        </p>
      </div>
    </div>
  );
};
