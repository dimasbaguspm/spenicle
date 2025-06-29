import { Plus, Search } from 'lucide-react';
import { type FC } from 'react';

import { Button, TextInput, Tile } from '../../../../components';
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
      <Tile className="p-4">
        <div className="space-y-1 mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Search</h3>
          <p className="text-sm text-slate-500">Find categories quickly</p>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <TextInput
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search categories name"
          />
        </div>
      </Tile>

      {/* quick actions panel */}
      <Tile className="p-4">
        <div className="space-y-1 mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
          <p className="text-sm text-slate-500">Manage your categories</p>
        </div>

        <div className="space-y-3">
          <Button
            variant="coral"
            size="sm"
            onClick={handleAddCategory}
            className="w-full justify-start"
            iconLeft={<Plus className="h-4 w-4" />}
          >
            Add Category
          </Button>
        </div>
      </Tile>
    </div>
  );
};
