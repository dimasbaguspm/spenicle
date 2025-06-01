import { Plus } from 'lucide-react';

import { Button } from '../../../../components';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router';

export function CategoriesListHeader() {
  const { openDrawer } = useDrawerRouterProvider();

  const handleAddCategory = async () => {
    await openDrawer('add-category');
  };
  return (
    <div className="p-6 border-b border-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Your Categories</h3>
          <p className="text-sm text-slate-600 mt-1">Organize your transactions by category</p>
        </div>
        <Button variant="coral" size="sm" onClick={handleAddCategory} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>
    </div>
  );
}
