import React from 'react';

import { formatNumberCompact } from '../../../../libs/utils';
import type { Category, SummaryCategoriesPeriod } from '../../../../types/api';
import { CategoryIcon } from '../../../category-module/components/category-icon/category-icon';

export interface MobileCategoryCardProps {
  category?: Category;
  categoryPeriod: SummaryCategoriesPeriod[number];
}

export const MobileCategoryCard: React.FC<MobileCategoryCardProps> = ({ category, categoryPeriod }) => {
  const name = category?.name ?? 'Unknown Category';
  const color = (category?.metadata?.color as string | undefined) ?? 'bg-slate-500';
  const iconValue = (category?.metadata?.icon as string | undefined) ?? undefined;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <CategoryIcon iconValue={iconValue} colorValue={color} size="sm" />
          <span className="font-medium text-slate-900">{name}</span>
        </div>
        <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          {categoryPeriod.totalTransactions} txn{categoryPeriod.totalTransactions !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-slate-500">Income</p>
          <p className="font-semibold text-sage-600">{formatNumberCompact(categoryPeriod.totalIncome ?? 0)}</p>
        </div>
        <div>
          <p className="text-slate-500">Expenses</p>
          <p className="font-semibold text-coral-600">{formatNumberCompact(categoryPeriod.totalExpenses ?? 0)}</p>
        </div>
        <div>
          <p className="text-slate-500">Net</p>
          <p className={`font-semibold ${(categoryPeriod.totalNet ?? 0) >= 0 ? 'text-sage-600' : 'text-coral-600'}`}>
            {(categoryPeriod.totalNet ?? 0) >= 0 ? '+' : ''}
            {formatNumberCompact(categoryPeriod.totalNet ?? 0)}
          </p>
        </div>
      </div>
    </div>
  );
};
