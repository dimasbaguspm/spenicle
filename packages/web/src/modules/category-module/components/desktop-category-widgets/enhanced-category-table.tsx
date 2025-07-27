import { ButtonIcon, Text, Tile } from '@dimasbaguspm/versaur/primitive';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Edit } from 'lucide-react';
import { useMemo, useState, type FC } from 'react';

import { DataTable, type ColumnDefinition, type SortConfig } from '../../../../components';
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
            <Text as="p" fontSize="sm" fontWeight="medium" clamp={1} ellipsis>
              {category.name}
            </Text>
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
        <ButtonIcon
          as={Edit}
          variant="ghost"
          size="sm"
          aria-label="Edit category"
          onClick={() => handleEditCategory(category.id!)}
        />
      ),
    },
  ];

  const sortConfig: SortConfig<Category> = {
    field: sortField,
    direction: sortDirection,
  };

  return (
    <Tile>
      <div className="space-y-6">
        <div className="space-y-1">
          <Text as="h3" fontSize="lg" fontWeight="semibold">
            Categories
          </Text>
          <Text as="p" fontSize="sm">
            Showing {sortedCategories.length} of {categories.length} categories
          </Text>
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
