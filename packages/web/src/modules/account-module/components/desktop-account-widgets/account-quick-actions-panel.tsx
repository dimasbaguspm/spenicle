import { Button, Icon, Text, TextInput, Tile } from '@dimasbaguspm/versaur';
import { Plus } from 'lucide-react';
import { type FC } from 'react';

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
    <div className="flex flex-col space-y-4">
      <Tile className="space-y-2">
        <Text as="h3" fontSize="lg" fontWeight="semibold">
          Search
        </Text>

        <TextInput
          label="Find accounts"
          variant="ghost"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search accounts..."
        />
      </Tile>

      {/* quick actions panel */}
      <Tile className="space-y-2">
        <Text as="h3" fontSize="lg" fontWeight="semibold">
          Quick Actions
        </Text>
        <Text as="p">Manage your accounts</Text>

        <Button variant="primary" size="sm" onClick={handleAddAccount}>
          <Icon as={Plus} size="sm" className="mr-2" color="neutral" />
          Add Account
        </Button>
      </Tile>
    </div>
  );
};
