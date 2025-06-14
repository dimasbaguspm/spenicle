import { Edit2, Trash2, ChevronDown, ChevronRight, Circle, CornerDownRight } from 'lucide-react';

import { IconButton } from '../../../../components/button/icon-button';
import { DRAWER_IDS } from '../../../../constants/drawer-id';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router/context';
import type { Category } from '../../../../types/api';
import { CategoryIcon } from '../category-icon';

export interface CategoryItemProps {
  category: Category;
  isChild?: boolean;
  hasChildren?: boolean;
  isExpanded?: boolean;
  childCount?: number;
  onToggleExpand?: () => void;
  onDelete: (categoryId: number) => void;
  children?: React.ReactNode;
}

export function CategoryItem({
  category,
  isChild = false,
  hasChildren = false,
  isExpanded = false,
  childCount = 0,
  onToggleExpand,
  onDelete,
  children,
}: CategoryItemProps) {
  const { openDrawer } = useDrawerRouterProvider();

  return (
    <div className={isChild ? '' : 'border-b border-mist-100'}>
      <div
        className={`flex items-center gap-4 ${isChild ? 'py-3 pr-4 pl-6' : 'p-4'} hover:bg-mist-25 transition-colors`}
      >
        {isChild ? (
          <>
            {/* Nested indicator for child categories */}
            <div className="flex-shrink-0 p-1.5 text-slate-300">
              <CornerDownRight className="w-3 h-3" />
            </div>
            <div className="flex-shrink-0">
              <CategoryIcon
                iconValue={category.metadata?.icon ?? 'tag'}
                colorValue={category.metadata?.color ?? 'coral'}
                size="sm"
              />
            </div>
          </>
        ) : (
          <>
            {/* Expand/Collapse Button for Parent Categories */}
            <button
              onClick={() => hasChildren && onToggleExpand?.()}
              className={`flex-shrink-0 p-1.5 rounded-md transition-all ${
                hasChildren
                  ? 'text-slate-500 hover:text-slate-700 hover:bg-mist-100 focus:outline-none focus:ring-2 focus:ring-coral-200'
                  : 'text-slate-300 cursor-default'
              }`}
              aria-label={hasChildren ? (isExpanded ? 'Collapse subcategories' : 'Expand subcategories') : undefined}
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )
              ) : (
                <Circle className="w-3 h-3" />
              )}
            </button>

            {/* Category Icon */}
            <div className="flex-shrink-0">
              <CategoryIcon
                iconValue={category.metadata?.icon ?? 'tag'}
                colorValue={category.metadata?.color ?? 'coral'}
                size="md"
              />
            </div>
          </>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-medium truncate ${isChild ? 'text-sm text-slate-700' : 'text-base text-slate-900'}`}>
              {category.name}
            </h3>
            {hasChildren && childCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-mist-100 text-mist-700 flex-shrink-0">
                {childCount} {childCount === 1 ? 'subcategory' : 'subcategories'}
              </span>
            )}
          </div>
          {category.note && (
            <p className={`text-slate-500 truncate ${isChild ? 'text-xs' : 'text-sm'}`}>{category.note}</p>
          )}
          {!category.note && (
            <p className={`text-slate-400 ${isChild ? 'text-xs' : 'text-sm'}`}>
              Category #{category.id}
              {category.metadata && ' • Custom appearance'}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
          <IconButton
            onClick={() => openDrawer(DRAWER_IDS.EDIT_CATEGORY, { categoryId: category.id })}
            variant="ghost"
            size="sm"
            className="hover:bg-mist-100 focus:ring-2 focus:ring-coral-200"
            aria-label={`Edit ${category.name}`}
          >
            <Edit2 className="w-4 h-4" />
          </IconButton>
          <IconButton
            onClick={() => category.id && onDelete(category.id)}
            variant="ghost"
            size="sm"
            className="hover:bg-danger-50 hover:text-danger-600 focus:ring-2 focus:ring-danger-200"
            aria-label={`Delete ${category.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </IconButton>
        </div>
      </div>

      {/* Children (for parent categories) */}
      {!isChild && hasChildren && isExpanded && <div>{children}</div>}
    </div>
  );
}
