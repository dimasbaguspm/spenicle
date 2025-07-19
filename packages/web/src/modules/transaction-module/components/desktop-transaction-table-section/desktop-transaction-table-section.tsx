import { Tile, Button, Text, ButtonIcon, Icon, Badge } from '@dimasbaguspm/versaur';
import dayjs from 'dayjs';
import { Plus, Activity, FilterIcon } from 'lucide-react';
import { type FC } from 'react';

import { Pagination, type SortConfig } from '../../../../components';
import type { Account, Category } from '../../../../types/api';
import type { SeamlessTransaction } from '../../hooks/use-seamless-transactions/types';
import { TransactionFilterChips } from '../transaction-filter-chips';
import { TransactionTable } from '../transaction-table';

interface DesktopTransactionTableSectionProps {
  date: dayjs.Dayjs;
  transactions: SeamlessTransaction[];
  accountIds?: number[];
  categoryIds?: number[];
  types?: ('income' | 'expense' | 'transfer')[];
  accounts: Account[];
  categories: Category[];
  sortConfig?: SortConfig<SeamlessTransaction>;
  currentPage: number;
  totalPages: number;
  onTransactionClick: (transaction: SeamlessTransaction) => void;
  onTransactionEdit: (transaction: SeamlessTransaction) => void;
  onFilterClick?: () => void;
  onClearAllFilters?: () => void;
  onSort?: (field: keyof SeamlessTransaction) => void;
  onPageChange: (page: number) => void;
  onAddTransaction: () => void;
}

export const DesktopTransactionTableSection: FC<DesktopTransactionTableSectionProps> = ({
  date,
  transactions,
  accountIds,
  categoryIds,
  types,
  accounts,
  categories,
  sortConfig,
  currentPage,
  totalPages,
  onTransactionClick,
  onTransactionEdit,
  onSort,
  onPageChange,
  onAddTransaction,
  onFilterClick,
  onClearAllFilters,
}) => {
  // count active filters
  const activeFiltersCount = (accountIds?.length ?? 0) + (categoryIds?.length ?? 0) + (types?.length ?? 0);

  return (
    <Tile className="p-6">
      {/* transaction table header */}
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-3 flex-1">
          <div className="flex items-center justify-between">
            <Text as="h3" fontWeight="semibold" fontSize="lg">
              Transactions for {date.format('MMMM YYYY')}
            </Text>

            <div className="relative">
              <ButtonIcon
                as={FilterIcon}
                aria-label="Filter transactions"
                variant="tertiary-ghost"
                size="sm"
                onClick={onFilterClick}
              />

              {activeFiltersCount > 0 && (
                <Badge color="primary" shape="rounded" className="absolute -top-1 -right-1">
                  {activeFiltersCount}
                </Badge>
              )}
            </div>
          </div>

          {/* filter chips */}
          <TransactionFilterChips
            accountIds={accountIds}
            categoryIds={categoryIds}
            types={types}
            accounts={accounts}
            categories={categories}
            onClearAllFilters={onClearAllFilters}
          />
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <Icon as={Activity} size="xl" color="tertiary" className="mx-auto mb-4" />
          <Text as="h4" fontSize="lg" fontWeight="medium" className="mb-2" align="center">
            No Transactions Found
          </Text>
          <Text as="p" className="mb-4" align="center">
            It looks like you haven't added any transactions for {date.format('MMMM D, YYYY')}
          </Text>

          <Button variant="primary" onClick={onAddTransaction}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Transaction
          </Button>
        </div>
      ) : (
        <>
          <TransactionTable
            transactions={transactions}
            onTransactionClick={onTransactionClick}
            onTransactionEdit={onTransactionEdit}
            sortConfig={sortConfig}
            onSort={onSort}
          />

          {/* pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
            </div>
          )}
        </>
      )}
    </Tile>
  );
};
