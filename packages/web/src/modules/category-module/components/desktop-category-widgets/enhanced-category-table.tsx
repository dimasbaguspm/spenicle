import dayjs from 'dayjs';
import { Edit } from 'lucide-react';
import { useMemo, useState, type FC } from 'react';

import { Tile, DataTable, IconButton, type ColumnDefinition, type SortConfig } from '../../../../components';
import { DRAWER_IDS } from '../../../../constants/drawer-id';
import { useApiSummaryCategoriesQuery } from '../../../../hooks';
import { formatAmount } from '../../../../libs/format-amount';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router/context';
import type { Category } from '../../../../types/api';
import { useCategoriesSearch } from '../../hooks';
import { CategoryIcon } from '../category-icon';

interface EnhancedCategoryTableProps {
  categories: Category[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

type SortField = 'name' | 'expenses' | 'income' | 'transactions';

interface CategoryWithMetrics extends Category {
  totalExpenses: number;
  totalIncome: number;
  totalTransactions: number;
}

/**
 * EnhancedCategoryTable displays categories with enhanced analytics and sorting.
 * Includes spending metrics, percentages, and action buttons.
 */
export const EnhancedCategoryTable: FC<EnhancedCategoryTableProps> = ({
  categories,
  searchQuery,
  onSearchChange: _onSearchChange,
}) => {
  const [sortField, setSortField] = useState<SortField>('expenses');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const { openDrawer } = useDrawerRouterProvider();

  // fetch current month summary for metrics
  const [summaryData] = useApiSummaryCategoriesQuery({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59).toISOString(),
  });

  // use the custom hook for search functionality
  const { filteredParentCategories } = useCategoriesSearch({
    categories,
    searchQuery,
  });

  // enhance categories with metrics
  const enhancedCategories = useMemo((): CategoryWithMetrics[] => {
    if (!summaryData) return [];

    const summaryMap = new Map(summaryData.map((s) => [s.categoryId, s]));

    return filteredParentCategories.map((category) => {
      const summary = summaryMap.get(category.id);
      const expenses = summary?.totalExpenses ?? 0;
      const income = summary?.totalIncome ?? 0;
      const transactions = summary?.totalTransactions ?? 0;

      return {
        ...category,
        totalExpenses: expenses,
        totalIncome: income,
        totalTransactions: transactions,
      };
    });
  }, [filteredParentCategories, summaryData]);

  // sort categories
  const sortedCategories = useMemo(() => {
    return [...enhancedCategories].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = a.name?.toLowerCase() ?? '';
          bValue = b.name?.toLowerCase() ?? '';
          break;
        case 'expenses':
          aValue = a.totalExpenses;
          bValue = b.totalExpenses;
          break;
        case 'income':
          aValue = a.totalIncome;
          bValue = b.totalIncome;
          break;
        case 'transactions':
          aValue = a.totalTransactions;
          bValue = b.totalTransactions;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [enhancedCategories, sortField, sortDirection]);

  const handleSort = (field: keyof CategoryWithMetrics) => {
    // Map field names to actual CategoryWithMetrics fields
    let sortableField: SortField;
    if (field === 'totalExpenses') {
      sortableField = 'expenses';
    } else if (field === 'totalIncome') {
      sortableField = 'income';
    } else if (field === 'totalTransactions') {
      sortableField = 'transactions';
    } else if (field === 'name') {
      sortableField = 'name';
    } else {
      return; // Don't sort on non-sortable fields
    }

    if (sortField === sortableField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(sortableField);
      setSortDirection('desc');
    }
  };

  const handleEditCategory = async (categoryId: number) => {
    await openDrawer(DRAWER_IDS.EDIT_CATEGORY, { categoryId });
  };

  // define table columns with grid layout configuration
  const columns: ColumnDefinition<CategoryWithMetrics>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      align: 'left',
      gridColumn: 'span 4', // Larger span for category name
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
      key: 'totalTransactions',
      label: 'Transactions',
      sortable: true,
      align: 'center',
      gridColumn: 'span 2', // Medium span for transactions
      render: (value) => <p className="text-sm font-medium text-slate-600 tabular-nums">{value as number}</p>,
    },
    {
      key: 'totalIncome',
      label: 'Income',
      sortable: true,
      align: 'right',
      gridColumn: 'span 2', // Medium span for income
      render: (value) => (
        <p className="text-sm font-semibold text-sage-600 tabular-nums">
          {formatAmount(value as number, { compact: true, hidePrefix: true })}
        </p>
      ),
    },
    {
      key: 'totalExpenses',
      label: 'Expenses',
      sortable: true,
      align: 'right',
      gridColumn: 'span 2', // Medium span for expenses
      render: (value) => (
        <p className="text-sm font-semibold text-coral-600 tabular-nums">
          {formatAmount(value as number, { compact: true, hidePrefix: true })}
        </p>
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      sortable: false,
      align: 'center',
      gridColumn: 'span 2', // Medium span for actions
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

  // Generate dynamic title with current month
  const currentMonth = dayjs().format('MMMM YYYY');

  const sortConfig: SortConfig<CategoryWithMetrics> = {
    field:
      sortField === 'expenses'
        ? 'totalExpenses'
        : sortField === 'income'
          ? 'totalIncome'
          : sortField === 'transactions'
            ? 'totalTransactions'
            : sortField,
    direction: sortDirection,
  };

  return (
    <Tile className="p-4 md:p-6">
      <div className="space-y-1 mb-4 md:mb-6">
        <h3 className="text-lg md:text-xl font-semibold text-slate-900">Activities in {currentMonth}</h3>
        <p className="text-sm text-slate-500">
          Detailed view of all categories with spending metrics ({sortedCategories.length} shown)
        </p>
      </div>

      <DataTable
        data={sortedCategories}
        columns={columns}
        sortConfig={sortConfig}
        onSort={handleSort}
        emptyMessage="No categories found"
        emptyDescription={searchQuery ? 'Try adjusting your search criteria' : 'Start by creating your first category'}
      />
    </Tile>
  );
};
