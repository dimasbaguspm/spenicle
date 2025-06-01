import { Edit, Trash2, Loader } from 'lucide-react';

import { IconButton } from '../../../../components/button/icon-button';
import { useApiTransactionsQuery } from '../../../../hooks/use-api/built-in/use-transactions';
import { AccountIcon } from '../account-icon';

import type { AccountItemProps } from './types';

export function AccountItem({ account, isDeleting = false, onEdit, onDelete }: AccountItemProps) {
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
    <div className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <AccountIcon iconValue={account.metadata?.icon} colorValue={account.metadata?.color} size="md" />
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-900">{account.name}</p>
          </div>
          <p className="text-sm text-slate-500">
            {account.type && formatAccountType(account.type)}
            {transactionCount !== undefined && ` • ${transactionCount} transaction${transactionCount !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onEdit && (
          <IconButton variant="ghost" size="sm" onClick={() => onEdit(account)}>
            <Edit className="w-4 h-4" />
          </IconButton>
        )}
        {onDelete && (
          <IconButton variant="error-ghost" size="sm" onClick={() => onDelete(account)} disabled={isDeleting}>
            {isDeleting ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </IconButton>
        )}
      </div>
    </div>
  );
}
