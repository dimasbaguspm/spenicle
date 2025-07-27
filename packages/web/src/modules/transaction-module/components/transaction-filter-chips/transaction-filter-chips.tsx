import { ChipInput } from '@dimasbaguspm/versaur/forms';
import { Text } from '@dimasbaguspm/versaur/primitive';
import { type FC } from 'react';

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
            <ChipInput.Option key={`account-${accountId}`} value={`${accountId}`}>
              {account.name}
            </ChipInput.Option>
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
            <ChipInput.Option key={`category-${categoryId}`} value={`${categoryId}`}>
              {category.name}
            </ChipInput.Option>
          );
        }
      });
    }

    // type filters
    if (types && types.length > 0) {
      types.forEach((type) => {
        const typeLabel = type === 'income' ? 'Income' : type === 'expense' ? 'Expense' : 'Transfer';

        chips.push(
          <ChipInput.Option key={`type-${type}`} value={type}>
            {typeLabel}
          </ChipInput.Option>
        );
      });
    }

    return chips;
  };

  const filterChips = generateFilterChips();

  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Filters:</span>
      {filterChips.length > 0 ? (
        <ChipInput
          variant="primary"
          name="filters"
          value={filterChips.map((chip) => (chip.props as { value: string }).value)}
          onChange={() => {}}
          className="flex-1 min-w-0"
        >
          {filterChips}
        </ChipInput>
      ) : (
        <Text as="span" fontSize="xs">
          No filters applied
        </Text>
      )}
    </div>
  );
};
