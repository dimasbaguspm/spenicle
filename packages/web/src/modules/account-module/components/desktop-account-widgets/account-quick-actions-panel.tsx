import { Plus, Search, CreditCard, PiggyBank, Building2, Wallet } from 'lucide-react';
import { type FC } from 'react';

import { Button, TextInput, Tile, Badge } from '../../../../components';
import { DRAWER_IDS } from '../../../../constants/drawer-id';
import { useApiAccountsQuery } from '../../../../hooks';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router/context';

interface AccountQuickActionsPanelProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
}

/**
 * AccountQuickActionsPanel provides quick actions, search functionality, and account overview.
 * Includes account creation, search, and account type statistics.
 */
export const AccountQuickActionsPanel: FC<AccountQuickActionsPanelProps> = ({ searchValue, onSearchChange }) => {
  const { openDrawer } = useDrawerRouterProvider();
  const [accountsData] = useApiAccountsQuery();

  const accounts = accountsData?.items ?? [];

  // calculate account type statistics
  const accountStats = accounts.reduce(
    (stats, account) => {
      const type = account.type?.toLowerCase() ?? 'unknown';
      stats[type] = (stats[type] ?? 0) + 1;
      stats.total += 1;
      return stats;
    },
    { total: 0 } as Record<string, number>
  );

  const handleAddAccount = async () => {
    await openDrawer(DRAWER_IDS.ADD_ACCOUNT);
  };

  // account type icons mapping
  const typeIcons: Record<string, React.ReactNode> = {
    checking: <Building2 className="h-4 w-4" />,
    savings: <PiggyBank className="h-4 w-4" />,
    credit: <CreditCard className="h-4 w-4" />,
    cash: <Wallet className="h-4 w-4" />,
  };

  // account type colors mapping
  const typeColors: Record<string, string> = {
    checking: 'mist',
    savings: 'sage',
    credit: 'warning',
    cash: 'coral',
  };

  return (
    <div className="space-y-4">
      {/* search panel */}
      <Tile className="p-4">
        <div className="space-y-1 mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Search</h3>
          <p className="text-sm text-slate-500">Find accounts quickly</p>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <TextInput
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search accounts..."
            className="pl-10"
          />
        </div>
      </Tile>

      {/* account statistics */}
      <Tile className="p-4">
        <div className="space-y-1 mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Account Types</h3>
          <p className="text-sm text-slate-500">Overview of your accounts</p>
        </div>

        <div className="space-y-3">
          {Object.entries(accountStats)
            .filter(([type]) => type !== 'total' && type !== 'unknown')
            .map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 rounded-md bg-${typeColors[type]}-100 text-${typeColors[type]}-600`}>
                    {typeIcons[type] ?? <Wallet className="h-4 w-4" />}
                  </div>
                  <span className="text-sm font-medium text-slate-700 capitalize">{type}</span>
                </div>
                <Badge variant={typeColors[type] as 'mist' | 'sage' | 'warning' | 'coral'} size="sm">
                  {count}
                </Badge>
              </div>
            ))}

          {accountStats.total === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-slate-500">No accounts yet</p>
            </div>
          )}
        </div>
      </Tile>

      {/* quick actions panel */}
      <Tile className="p-4">
        <div className="space-y-1 mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
          <p className="text-sm text-slate-500">Manage your accounts</p>
        </div>

        <div className="space-y-3">
          <Button
            variant="coral"
            size="sm"
            onClick={handleAddAccount}
            className="w-full justify-start"
            iconLeft={<Plus className="h-4 w-4" />}
          >
            Add Account
          </Button>
        </div>
      </Tile>
    </div>
  );
};
