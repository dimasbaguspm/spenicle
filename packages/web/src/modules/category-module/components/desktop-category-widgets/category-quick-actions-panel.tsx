import { Button, Icon, Text, TextInput, Tile } from '@dimasbaguspm/versaur';
import { Plus } from 'lucide-react';
import { type FC } from 'react';

import { DRAWER_IDS } from '../../../../constants/drawer-id';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router/context';

interface CategoryQuickActionsPanelProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
}

/**
 * CategoryQuickActionsPanel provides quick actions, search functionality, and category health indicators.
 * Enhanced with real-time insights and comprehensive category management options.
 */
export const CategoryQuickActionsPanel: FC<CategoryQuickActionsPanelProps> = ({ searchValue, onSearchChange }) => {
  const { openDrawer } = useDrawerRouterProvider();

  const handleAddCategory = async () => {
    await openDrawer(DRAWER_IDS.ADD_CATEGORY);
  };

  return (
    <div className="space-y-4">
      {/* search panel */}
      <Tile className="space-y-2">
        <Text as="h3" fontSize="lg" fontWeight="semibold">
          Search
        </Text>

        <TextInput
          label="Find categories"
          variant="ghost"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search categories name"
        />
      </Tile>

      {/* quick actions panel */}
      <Tile className="space-y-4">
        <div>
          <Text as="h3" fontSize="lg" fontWeight="semibold">
            Quick Actions
          </Text>
          <Text as="p" fontSize="sm">
            Manage your categories efficiently
          </Text>
        </div>
        <Button variant="primary" size="sm" onClick={handleAddCategory}>
          <Icon as={Plus} size="sm" color="neutral" />
          Add Category
        </Button>
      </Tile>
    </div>
  );
};
