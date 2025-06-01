import { Tag } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../../../../components';
import { DRAWER_IDS } from '../../../../constants/drawer-id';
import { useApiCategoriesQuery } from '../../../../hooks/use-api';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router/context';
import type { Category } from '../../../../types/api';
import { CategoryItem } from '../category-item';
import { DeleteCategoryModal } from '../delete-category-modal';

export interface CategoriesListProps {
  onAddCategory?: () => void;
}

export function CategoriesList() {
  const [categoriesData, , categoriesState] = useApiCategoriesQuery();
  const { openDrawer } = useDrawerRouterProvider();
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const categories = categoriesData?.items ?? [];

  // Separate parent and child categories
  const parentCategories = categories.filter((category) => category.parentId === null);
  const childCategories = categories.filter((category) => category.parentId !== null);

  // Group children by parent ID
  const childrenByParent = childCategories.reduce(
    (acc, child) => {
      const parentId = child.parentId!;
      acc[parentId] ??= [];
      acc[parentId].push(child);
      return acc;
    },
    {} as Record<number, Category[]>
  );

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
    const hasChildren = !isChild && childrenByParent[category.id!]?.length > 0;
    const isExpanded = expandedCategories.has(category.id!);
    const childCount = childrenByParent[category.id!]?.length ?? 0;

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
          childrenByParent[category.id!].map((childCategory: Category) => renderCategoryItem(childCategory, true))}
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
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Loading categories...</p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-slate-100">
        {/* Show only parent categories with accordion functionality */}
        {parentCategories.map((category) => renderCategoryItem(category, false))}

        {/* Empty state */}
        {categories.length === 0 && (
          <div className="p-8 text-center">
            <Tag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">No categories added yet</p>

            <Button variant="coral" onClick={handleOpenAddCategoryDrawer}>
              Add Your First Category
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && categoryToDelete && (
        <DeleteCategoryModal category={categoryToDelete} onSuccess={handleDeleteSuccess} onCancel={cancelDelete} />
      )}
    </>
  );
}
