import { Plus } from 'lucide-react';
import { type FC } from 'react';

import { Button, TextInput, Tile } from '../../../../components';
import { DRAWER_IDS } from '../../../../constants/drawer-id';
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

  const handleAddAccount = async () => {
    await openDrawer(DRAWER_IDS.ADD_ACCOUNT);
  };

  return (
    <div className="space-y-4">
      {/* search panel */}
      <Tile className="p-4">
        <div className="space-y-1 mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Search</h3>
          <p className="text-sm text-slate-500">Find accounts quickly</p>
        </div>

        <TextInput
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search accounts..."
        />
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
