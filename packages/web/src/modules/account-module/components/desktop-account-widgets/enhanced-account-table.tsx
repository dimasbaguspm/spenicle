import dayjs from 'dayjs';
import { Edit, Trash2 } from 'lucide-react';
import { useMemo, useState, type FC } from 'react';

import { Tile, DataTable, IconButton, type ColumnDefinition, type SortConfig } from '../../../../components';
import { DRAWER_IDS } from '../../../../constants/drawer-id';
import { useApiSummaryAccountsQuery } from '../../../../hooks';
import { formatAmount } from '../../../../libs/format-amount';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router/context';
import type { Account } from '../../../../types/api';
import { useAccountsSearch } from '../../hooks';
import { AccountIcon } from '../account-icon';

import { DeleteAccountModal } from './delete-account-modal';

interface EnhancedAccountTableProps {
  accounts: Account[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

type SortField = 'name' | 'transactions' | 'netFlow';

interface AccountWithMetrics extends Account {
  totalExpenses: number;
  totalIncome: number;
  totalTransactions: number;
  netFlow: number;
}

/**
 * EnhancedAccountTable displays accounts with enhanced analytics and sorting.
 * Includes transaction metrics, cash flow, and action buttons.
 */
export const EnhancedAccountTable: FC<EnhancedAccountTableProps> = ({
  accounts,
  searchQuery,
  onSearchChange: _onSearchChange,
}) => {
  const [sortField, setSortField] = useState<SortField>('transactions');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openDrawer } = useDrawerRouterProvider();

  // fetch current month summary for metrics
  const [summaryData] = useApiSummaryAccountsQuery({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59).toISOString(),
  });

  // use the custom hook for search functionality
  const { filteredAccounts } = useAccountsSearch({
    accounts,
    searchQuery,
  });

  // enhance accounts with metrics
  const enhancedAccounts = useMemo((): AccountWithMetrics[] => {
    if (!summaryData) return [];

    const summaryMap = new Map(summaryData.map((s) => [s.accountId, s]));

    return filteredAccounts.map((account) => {
      const summary = summaryMap.get(account.id);
      const expenses = summary?.totalExpenses ?? 0;
      const income = summary?.totalIncome ?? 0;
      const transactions = summary?.totalTransactions ?? 0;

      return {
        ...account,
        totalExpenses: expenses,
        totalIncome: income,
        totalTransactions: transactions,
        netFlow: income - expenses,
      };
    });
  }, [filteredAccounts, summaryData]);

  // sort accounts
  const sortedAccounts = useMemo(() => {
    return [...enhancedAccounts].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = a.name?.toLowerCase() ?? '';
          bValue = b.name?.toLowerCase() ?? '';
          break;
        case 'transactions':
          aValue = a.totalTransactions;
          bValue = b.totalTransactions;
          break;
        case 'netFlow':
          aValue = a.netFlow;
          bValue = b.netFlow;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [enhancedAccounts, sortField, sortDirection]);

  const handleSort = (field: keyof AccountWithMetrics) => {
    // Map field names to actual AccountWithMetrics fields
    let sortableField: SortField;
    if (field === 'totalTransactions') {
      sortableField = 'transactions';
    } else if (field === 'netFlow') {
      sortableField = 'netFlow';
    } else if (field === 'name') {
      sortableField = 'name';
    } else {
      return;
    }

    if (sortField === sortableField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(sortableField);
      setSortDirection('desc');
    }
  };

  const handleEditAccount = async (accountId: number) => {
    await openDrawer(DRAWER_IDS.EDIT_ACCOUNT, { accountId });
  };

  const handleDeleteAccount = (accountId: number) => {
    const account = sortedAccounts.find((acc) => acc.id === accountId);
    if (!account) return;

    setAccountToDelete(account);
    setShowDeleteModal(true);
  };

  const handleDeleteSuccess = () => {
    // The modal handles the deletion and success message
    // Just close the modal and reset state
    setShowDeleteModal(false);
    setAccountToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setAccountToDelete(null);
  };

  // define table columns with grid layout configuration
  const columns: ColumnDefinition<AccountWithMetrics>[] = [
    {
      key: 'name',
      label: 'Account Name',
      sortable: true,
      align: 'left',
      gridColumn: 'span 4', // Larger span for account name
      render: (_, account) => (
        <div className="flex items-center gap-3">
          <AccountIcon
            iconValue={account.metadata?.icon as string}
            colorValue={account.metadata?.color as string}
            size="sm"
            className="flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">{account.name}</p>
            {account.metadata?.bankName && (
              <p className="text-xs text-slate-500 truncate">{account.metadata.bankName as string}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'totalTransactions',
      label: 'Transactions',
      sortable: true,
      align: 'center',
      gridColumn: 'span 2', // Medium span for transactions
      render: (value) => <p className="text-sm font-medium text-slate-600 tabular-nums">{value as number}</p>,
    },
    {
      key: 'netFlow',
      label: 'Net Amount',
      sortable: true,
      align: 'right',
      gridColumn: 'span 3', // Medium span for net amount
      render: (value) => {
        const netValue = value as number;
        const displayValue = Math.abs(netValue); // show positive values without minus sign
        return (
          <p className={`text-sm font-semibold tabular-nums ${netValue >= 0 ? 'text-sage-600' : 'text-coral-600'}`}>
            {formatAmount(displayValue, { compact: true, showCurrency: true, hidePrefix: true })}
          </p>
        );
      },
    },
    {
      key: 'id',
      label: 'Actions',
      sortable: false,
      align: 'center',
      gridColumn: 'span 1', // Small span for actions
      render: (_, account) => (
        <div className="flex items-center justify-center gap-2">
          <IconButton
            variant="slate-ghost"
            size="sm"
            onClick={() => handleEditAccount(account.id!)}
            title="Edit account"
          >
            <Edit className="h-4 w-4" />
          </IconButton>
          <IconButton
            variant="error-ghost"
            size="sm"
            onClick={() => handleDeleteAccount(account.id!)}
            title="Delete account"
          >
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      ),
    },
  ];

  // Generate dynamic title with current month
  const currentMonth = dayjs().format('MMMM YYYY');

  const sortConfig: SortConfig<AccountWithMetrics> = {
    field: sortField === 'transactions' ? 'totalTransactions' : (sortField as keyof AccountWithMetrics),
    direction: sortDirection,
  };

  return (
    <>
      <Tile className="p-4 md:p-6">
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg md:text-xl font-semibold text-slate-900">Activity - {currentMonth}</h3>
            <p className="text-sm text-slate-500">
              Account performance and transaction metrics for the current month (showing {sortedAccounts.length} of{' '}
              {accounts.length} accounts)
            </p>
          </div>

          <DataTable
            data={sortedAccounts}
            columns={columns}
            sortConfig={sortConfig}
            onSort={handleSort}
            emptyMessage={searchQuery ? 'No accounts found matching your search' : 'No accounts yet'}
            emptyDescription={searchQuery ? 'Try adjusting your search terms' : 'Add your first account to get started'}
            loading={!summaryData}
          />
        </div>
      </Tile>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          isOpen={showDeleteModal}
          onClose={cancelDelete}
          onConfirm={handleDeleteSuccess}
          account={accountToDelete}
          isDeleting={false} // TODO: Connect to actual loading state when API is implemented
        />
      )}
    </>
  );
};
