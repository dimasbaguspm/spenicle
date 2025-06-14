import { Edit2, Trash2, Loader } from 'lucide-react';

import { IconButton } from '../../../../components/button/icon-button';
import { DRAWER_IDS } from '../../../../constants/drawer-id';
import { useApiTransactionsQuery } from '../../../../hooks/use-api/built-in/use-transactions';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router/context';
import { AccountIcon } from '../account-icon';

import type { AccountItemProps } from './types';

export function AccountItem({ account, isDeleting = false, onEdit, onDelete }: AccountItemProps) {
  const { openDrawer } = useDrawerRouterProvider();

  // Fetch transaction count for this specific account
  const [pagedTransactions] = useApiTransactionsQuery({
    accountId: account.id,
    pageSize: 1, // We only need the totalItems count, not the actual data
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const transactionCount = pagedTransactions?.totalItems ?? 0;

  const formatAccountType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="border-b border-mist-100">
      <div className="flex items-center gap-4 p-4 hover:bg-mist-25 transition-colors">
        {/* Account Icon */}
        <div className="flex-shrink-0">
          <AccountIcon
            iconValue={account.metadata?.icon ?? 'credit-card'}
            colorValue={account.metadata?.color ?? 'coral'}
            size="md"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-base text-slate-900 truncate">{account.name}</h3>
            {transactionCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-mist-100 text-mist-700 flex-shrink-0">
                {transactionCount} {transactionCount === 1 ? 'transaction' : 'transactions'}
              </span>
            )}
          </div>
          {account.note ? (
            <p className="text-sm text-slate-500 truncate">{account.note}</p>
          ) : (
            <p className="text-sm text-slate-400">{account.type && formatAccountType(account.type)}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
          <IconButton
            onClick={() => (onEdit ? onEdit(account) : openDrawer(DRAWER_IDS.EDIT_ACCOUNT, { accountId: account.id }))}
            variant="ghost"
            size="sm"
            className="hover:bg-mist-100 focus:ring-2 focus:ring-coral-200"
            aria-label={`Edit ${account.name}`}
          >
            <Edit2 className="w-4 h-4" />
          </IconButton>
          <IconButton
            onClick={() => account.id && onDelete && onDelete(account)}
            variant="ghost"
            size="sm"
            className="hover:bg-danger-50 hover:text-danger-600 focus:ring-2 focus:ring-danger-200"
            aria-label={`Delete ${account.name}`}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </IconButton>
        </div>
      </div>
    </div>
  );
}
