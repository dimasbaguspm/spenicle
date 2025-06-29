import dayjs from 'dayjs';
import { Plus, Activity } from 'lucide-react';
import { type FC } from 'react';

import { Tile, Button, Pagination, type SortConfig } from '../../../../components';
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
}) => {
  return (
    <Tile className="p-6">
      {/* transaction table header */}
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-3 flex-1">
          <h3 className="text-lg font-semibold text-slate-900">Transactions {date.format('D MMMM YYYY')}</h3>

          {/* filter chips */}
          <TransactionFilterChips
            accountIds={accountIds}
            categoryIds={categoryIds}
            types={types}
            accounts={accounts}
            categories={categories}
          />
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-mist-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-slate-600 mb-2">No transactions found</h4>
          <p className="text-slate-500 mb-4">{date.format('MMMM D, YYYY')} has no transactions yet.</p>
          <Button variant="coral" onClick={onAddTransaction}>
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
