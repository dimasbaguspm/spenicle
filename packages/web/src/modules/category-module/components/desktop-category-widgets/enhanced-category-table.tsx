import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Edit } from 'lucide-react';
import { useMemo, useState, type FC } from 'react';

import { Tile, DataTable, IconButton, type ColumnDefinition, type SortConfig } from '../../../../components';
import { DRAWER_IDS } from '../../../../constants/drawer-id';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router/context';
import type { Category } from '../../../../types/api';
import { useCategoriesSearch } from '../../hooks';
import { CategoryIcon } from '../category-icon';

dayjs.extend(relativeTime);

interface EnhancedCategoryTableProps {
  categories: Category[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

type SortField = 'name';

/**
 * EnhancedCategoryTable (simplified): lists category name, balance, last usage, and actions only
 */
export const EnhancedCategoryTable: FC<EnhancedCategoryTableProps> = ({
  categories,
  searchQuery,
  onSearchChange: _onSearchChange,
}) => {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { openDrawer } = useDrawerRouterProvider();

  // filter categories by search query
  const { filteredParentCategories } = useCategoriesSearch({ categories, searchQuery });

  // sort filtered categories
  const sortedCategories = useMemo(() => {
    return [...filteredParentCategories].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';
      switch (sortField) {
        case 'name':
          aValue = a.name?.toLowerCase() ?? '';
          bValue = b.name?.toLowerCase() ?? '';
          break;
        default:
          break;
      }
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      return 0;
    });
  }, [filteredParentCategories, sortField, sortDirection]);

  const handleSort = (field: keyof Category) => {
    let sortableField: SortField;
    if (field === 'name') sortableField = 'name';
    else return;
    if (sortField === sortableField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(sortableField);
      setSortDirection('asc');
    }
  };

  const handleEditCategory = async (categoryId: number) => {
    await openDrawer(DRAWER_IDS.EDIT_CATEGORY, { categoryId });
  };

  // define table columns
  const columns: ColumnDefinition<Category>[] = [
    {
      key: 'name',
      label: 'Category Name',
      sortable: true,
      align: 'left',
      gridColumn: 'span 5',
      render: (_, category) => (
        <div className="flex items-center gap-3">
          <CategoryIcon
            iconValue={category.metadata?.icon ?? 'tag'}
            colorValue={category.metadata?.color}
            size="sm"
            className="flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">{category.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      sortable: false,
      align: 'center',
      gridColumn: 'span 2',
      render: (_, category) => (
        <div className="flex items-center justify-center gap-2">
          <IconButton
            variant="slate-ghost"
            size="sm"
            onClick={() => handleEditCategory(category.id!)}
            title="Edit category"
          >
            <Edit className="h-4 w-4" />
          </IconButton>
        </div>
      ),
    },
  ];

  const sortConfig: SortConfig<Category> = {
    field: sortField,
    direction: sortDirection,
  };

  return (
    <Tile className="p-4 md:p-6">
      <div className="space-y-4 md:space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg md:text-xl font-semibold text-slate-900">Categories</h3>
          <p className="text-sm text-slate-500">
            Showing {sortedCategories.length} of {categories.length} categories
          </p>
        </div>
        <DataTable
          data={sortedCategories}
          columns={columns}
          sortConfig={sortConfig}
          onSort={handleSort}
          emptyMessage={searchQuery ? 'No categories found matching your search' : 'No categories yet'}
          emptyDescription={searchQuery ? 'Try adjusting your search terms' : 'Add your first category to get started'}
          loading={false}
        />
      </div>
    </Tile>
  );
};
