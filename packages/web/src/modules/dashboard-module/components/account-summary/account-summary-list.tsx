import { CreditCard } from 'lucide-react';

export interface AccountSummaryAccount {
  id: string;
  name: string;
  lastActivity: string;
  amount: number;
  iconColor: string;
  iconBgColor: string;
}

export interface AccountSummaryListProps {
  /**
   * Array of account data to display
   */
  accounts: AccountSummaryAccount[];
}

/**
 * AccountSummaryList displays the most active accounts in a compact list format.
 */
export function AccountSummaryList({ accounts }: AccountSummaryListProps) {
  const formatAmount = (amount: number) => {
    const sign = amount < 0 ? '-' : '+';
    const absoluteAmount = (Math.abs(amount) / 1000).toFixed(1);
    return `${sign}$${absoluteAmount}K`;
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-700">Most Active</p>

      {accounts.map((account) => (
        <div key={account.id} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={`w-8 h-8 rounded-full ${account.iconBgColor} flex items-center justify-center flex-shrink-0`}
            >
              <CreditCard className={`h-4 w-4 ${account.iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-900 truncate">{account.name}</span>
                <span className="text-xs text-slate-500 flex-shrink-0">•</span>
                <span className="text-xs text-slate-500 flex-shrink-0">{account.lastActivity}</span>
              </div>
            </div>
          </div>
          <span
            className={`text-sm font-semibold flex-shrink-0 ml-3 ${
              account.amount >= 0 ? 'text-sage-600' : 'text-coral-600'
            }`}
          >
            {formatAmount(account.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}
