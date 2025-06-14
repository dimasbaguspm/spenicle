import { formatAmount } from '../../../../libs/format-amount';
import type { Account } from '../../../../types/api';
import { AccountIcon } from '../../../account-module/components/account-icon';

export interface AccountSummaryItem {
  account: Account;
  lastActivity: string;
  amount: number;
}

export interface AccountSummaryListProps {
  /**
   * Array of account data with activity information to display
   */
  accounts: AccountSummaryItem[];
}

/**
 * AccountSummaryList displays accounts with clear visual hierarchy.
 * Account names are prominently shown with descriptive activity status below.
 */
export function AccountSummaryList({ accounts }: AccountSummaryListProps) {
  return (
    <div className="space-y-3">
      {accounts.map((item) => (
        <div key={item.account.id} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <AccountIcon iconValue={item.account.metadata?.icon} colorValue={item.account.metadata?.color} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-900 truncate">{item.account.name}</span>
                <span className="text-xs text-slate-500">
                  {item.lastActivity === 'No activity'
                    ? 'No recent transactions'
                    : item.lastActivity === 'Very active'
                      ? 'Very active this month'
                      : item.lastActivity === 'Today'
                        ? 'Last transaction today'
                        : `Last transaction ${item.lastActivity}`}
                </span>
              </div>
            </div>
          </div>
          <span
            className={`text-sm font-semibold flex-shrink-0 ml-3 ${
              item.amount >= 0 ? 'text-sage-600' : 'text-coral-600'
            }`}
          >
            {formatAmount(item.amount, {
              type: item.amount === 0 ? 'transfer' : item.amount >= 0 ? 'income' : 'expense',
              compact: true,
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
