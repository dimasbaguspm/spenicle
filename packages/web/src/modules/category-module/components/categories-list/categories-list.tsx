import { AlertCircle } from 'lucide-react';
import { useState, useMemo } from 'react';

import { Button } from '../../../../components';
import { DRAWER_IDS } from '../../../../constants/drawer-id';
import { useApiCategoriesQuery } from '../../../../hooks/use-api';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router/context';
import type { Category } from '../../../../types/api';
import { useCategoriesSearch } from '../../hooks';
import { CategoriesEmptyState } from '../categories-empty-state';
import { CategoriesSearchEmptyState } from '../categories-search-empty-state';
import { CategoryItem } from '../category-item';
import { DeleteCategoryModal } from '../delete-category-modal';

import { CategoriesListLoader } from './categories-list-loader';

export interface CategoriesListProps {
  onAddCategory?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function CategoriesList({ searchQuery = '', onSearchChange }: CategoriesListProps) {
  const [categoriesData, , categoriesState] = useApiCategoriesQuery();
  const { openDrawer } = useDrawerRouterProvider();
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const categories = categoriesData?.items ?? [];

  // Use the custom hook for search functionality
  const { filteredParentCategories, filteredChildrenByParent, autoExpandedCategories } = useCategoriesSearch({
    categories,
    searchQuery,
  });

  // Merge auto-expanded categories with manually expanded ones
  const effectiveExpandedCategories = useMemo(() => {
    const combined = new Set(expandedCategories);
    autoExpandedCategories.forEach((id) => combined.add(id));
    return combined;
  }, [expandedCategories, autoExpandedCategories]);

  const toggleCategory = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const renderCategoryItem = (category: Category, isChild = false) => {
    const hasChildren = !isChild && filteredChildrenByParent[category.id!]?.length > 0;
    const isExpanded = effectiveExpandedCategories.has(category.id!);
    const childCount = filteredChildrenByParent[category.id!]?.length ?? 0;

    return (
      <CategoryItem
        key={category.id}
        category={category}
        isChild={isChild}
        hasChildren={hasChildren}
        isExpanded={isExpanded}
        childCount={childCount}
        onToggleExpand={() => toggleCategory(category.id!)}
        onDelete={handleDeleteCategory}
      >
        {hasChildren &&
          isExpanded &&
          filteredChildrenByParent[category.id!].map((childCategory: Category) =>
            renderCategoryItem(childCategory, true)
          )}
      </CategoryItem>
    );
  };

  const handleOpenAddCategoryDrawer = async () => {
    await openDrawer(DRAWER_IDS.ADD_CATEGORY);
  };

  const handleDeleteCategory = (categoryId: number) => {
    const category = categories.find((cat) => cat.id === categoryId);
    if (!category) return;

    setCategoryToDelete(category);
    setShowDeleteModal(true);
  };

  const handleDeleteSuccess = () => {
    // The modal handles the deletion and success message
    // Just close the modal and reset state
    setShowDeleteModal(false);
    setCategoryToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setCategoryToDelete(null);
  };

  if (categoriesState.isLoading) {
    return <CategoriesListLoader count={6} />;
  }

  if (categoriesState.isError) {
    return (
      <div className="p-8 text-center">
        <div className="w-12 h-12 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-danger-600" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">Failed to load categories</h3>
        <p className="text-slate-600 mb-4">We couldn't load your categories. Please try again.</p>
        <Button variant="coral" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-mist-100">
        {/* Show only parent categories with accordion functionality */}
        {filteredParentCategories.map((category) => renderCategoryItem(category, false))}

        {/* Empty state for no categories */}
        {categories.length === 0 && <CategoriesEmptyState onAddCategory={handleOpenAddCategoryDrawer} />}

        {/* Empty state for search with no results */}
        {categories.length > 0 && filteredParentCategories.length === 0 && searchQuery && (
          <CategoriesSearchEmptyState
            searchQuery={searchQuery}
            onClearSearch={() => onSearchChange?.('')}
            onAddCategory={handleOpenAddCategoryDrawer}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && categoryToDelete && (
        <DeleteCategoryModal category={categoryToDelete} onSuccess={handleDeleteSuccess} onCancel={cancelDelete} />
      )}
    </>
  );
}
