import { ButtonIcon, Text, Tile } from '@dimasbaguspm/versaur/primitive';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Edit } from 'lucide-react';
import { useMemo, useState, type FC } from 'react';

import { DataTable, type ColumnDefinition, type SortConfig } from '../../../../components';
import { DRAWER_IDS } from '../../../../constants/drawer-id';
import { formatAmount } from '../../../../libs/format-amount';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router/context';
import type { Account } from '../../../../types/api';
import { useAccountsSearch } from '../../hooks';
import { AccountIcon } from '../account-icon';

dayjs.extend(relativeTime);

interface EnhancedAccountTableProps {
  accounts: Account[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

type SortField = 'name' | 'amount' | 'updatedAt';

/**
 * EnhancedAccountTable (simplified): lists account name, balance, last usage, and actions only
 */
export const EnhancedAccountTable: FC<EnhancedAccountTableProps> = ({
  accounts,
  searchQuery,
  onSearchChange: _onSearchChange,
}) => {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { openDrawer } = useDrawerRouterProvider();

  // filter accounts by search query
  const { filteredAccounts } = useAccountsSearch({ accounts, searchQuery });

  // sort filtered accounts
  const sortedAccounts = useMemo(() => {
    return [...filteredAccounts].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';
      switch (sortField) {
        case 'name':
          aValue = a.name?.toLowerCase() ?? '';
          bValue = b.name?.toLowerCase() ?? '';
          break;
        case 'amount':
          aValue = a.amount ?? 0;
          bValue = b.amount ?? 0;
          break;
        case 'updatedAt':
          aValue = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          bValue = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          break;
        default:
          break;
      }
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [filteredAccounts, sortField, sortDirection]);

  const handleSort = (field: keyof Account) => {
    let sortableField: SortField;
    if (field === 'name') sortableField = 'name';
    else if (field === 'amount') sortableField = 'amount';
    else if (field === 'updatedAt') sortableField = 'updatedAt';
    else return;
    if (sortField === sortableField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(sortableField);
      setSortDirection('asc');
    }
  };

  const handleEditAccount = async (accountId: number) => {
    await openDrawer(DRAWER_IDS.EDIT_ACCOUNT, { accountId });
  };

  // define table columns
  const columns: ColumnDefinition<Account>[] = [
    {
      key: 'name',
      label: 'Account Name',
      sortable: true,
      align: 'left',
      gridColumn: 'span 4',
      render: (_, account) => (
        <div className="flex items-center gap-3">
          <AccountIcon
            iconValue={account.metadata?.icon as string}
            colorValue={account.metadata?.color as string}
            size="sm"
            className="flex-shrink-0"
          />
          <Text fontSize="sm" fontWeight="medium" ellipsis clamp={1}>
            {account.name}
          </Text>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Balance',
      sortable: true,
      align: 'right',
      gridColumn: 'span 3',
      render: (value) => {
        const accountAmount = value as number;
        const displayValue = Math.abs(accountAmount);
        return (
          <Text fontSize="sm" fontWeight="semibold" color={accountAmount > 0 ? 'secondary' : 'primary'}>
            {formatAmount(displayValue, { compact: false, hidePrefix: true })}
          </Text>
        );
      },
    },
    {
      key: 'updatedAt',
      label: 'Last Usage',
      sortable: true,
      align: 'center',
      gridColumn: 'span 3',
      render: (value) => <Text fontSize="sm">{value ? dayjs(value as string).fromNow() : '—'}</Text>,
    },
    {
      key: 'id',
      label: 'Actions',
      sortable: false,
      align: 'center',
      gridColumn: 'span 2',
      render: (_, account) => (
        <ButtonIcon
          as={Edit}
          variant="ghost"
          size="sm"
          onClick={() => handleEditAccount(account.id!)}
          aria-label="Edit account"
        />
      ),
    },
  ];

  const sortConfig: SortConfig<Account> = {
    field: sortField,
    direction: sortDirection,
  };

  return (
    <Tile>
      <div className="space-y-4 md:space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg md:text-xl font-semibold text-slate-900">Accounts</h3>
          <p className="text-sm text-slate-500">
            Showing {sortedAccounts.length} of {accounts.length} accounts
          </p>
        </div>
        <DataTable
          data={sortedAccounts}
          columns={columns}
          sortConfig={sortConfig}
          onSort={handleSort}
          emptyMessage={searchQuery ? 'No accounts found matching your search' : 'No payment methods yet'}
          emptyDescription={
            searchQuery ? 'Try adjusting your search terms' : 'Add your first payment method to get started'
          }
          loading={false}
        />
      </div>
    </Tile>
  );
};
