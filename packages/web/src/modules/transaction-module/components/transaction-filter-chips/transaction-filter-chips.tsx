import { X } from 'lucide-react';
import { type FC } from 'react';

import { Button } from '../../../../components';
import { ChipInput } from '../../../../components/chip';
import type { Account, Category } from '../../../../types/api';

interface TransactionFilterChipsProps {
  accountIds?: number[];
  categoryIds?: number[];
  types?: ('income' | 'expense' | 'transfer')[];
  accounts: Account[];
  categories: Category[];
  onClearAllFilters?: () => void;
}

export const TransactionFilterChips: FC<TransactionFilterChipsProps> = ({
  accountIds,
  categoryIds,
  types,
  accounts,
  categories,
  onClearAllFilters,
}) => {
  // generate filter chips based on applied filters
  const generateFilterChips = (): React.ReactElement[] => {
    const chips: React.ReactElement[] = [];

    // account filters
    if (accountIds && accountIds.length > 0) {
      accountIds.forEach((accountId) => {
        const account = accounts.find((acc) => acc.id === accountId);
        if (account) {
          chips.push(
            <ChipInput key={`account-${accountId}`} variant="mist" size="sm">
              {account.name}
            </ChipInput>
          );
        }
      });
    }

    // category filters
    if (categoryIds && categoryIds.length > 0) {
      categoryIds.forEach((categoryId) => {
        const category = categories.find((cat) => cat.id === categoryId);
        if (category) {
          chips.push(
            <ChipInput key={`category-${categoryId}`} variant="slate" size="sm">
              {category.name}
            </ChipInput>
          );
        }
      });
    }

    // type filters
    if (types && types.length > 0) {
      types.forEach((type) => {
        const typeLabel = type === 'income' ? 'Income' : type === 'expense' ? 'Expense' : 'Transfer';
        const typeVariant: 'success' | 'danger' | 'default' =
          type === 'income' ? 'success' : type === 'expense' ? 'danger' : 'default';
        chips.push(
          <ChipInput key={`type-${type}`} variant={typeVariant} size="sm">
            {typeLabel}
          </ChipInput>
        );
      });
    }

    return chips;
  };

  const filterChips = generateFilterChips();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-500 font-medium">Filters:</span>
      {filterChips.length > 0 ? (
        <>
          {filterChips}
          {onClearAllFilters && (
            <Button variant="ghost" size="sm" onClick={onClearAllFilters} className="text-xs h-6 px-2">
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </>
      ) : (
        <span className="text-xs text-slate-400 italic">No filters applied</span>
      )}
    </div>
  );
};
