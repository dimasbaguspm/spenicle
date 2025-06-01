import { Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

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
    <div className={isChild ? '' : 'border-b border-slate-100'}>
      <div className={`flex items-center gap-4 ${isChild ? 'py-3 pr-4' : 'p-4'}`}>
        {/* Tree connector + icon section for child categories */}
        {isChild ? (
          <div className="flex items-center gap-3 pl-6 relative">
            {/* Tree connector lines */}
            <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-200">
              <div className="absolute top-1/2 left-0 w-4 h-px bg-slate-200 -translate-y-0.5"></div>
            </div>
            {/* Category Icon */}
            <div className="flex-shrink-0 ml-4">
              <CategoryIcon
                iconValue={category.metadata?.icon ?? 'tag'}
                colorValue={category.metadata?.color ?? 'coral'}
                size="sm"
              />
            </div>
          </div>
        ) : (
          <>
            {/* Expand/Collapse Button for Parent Categories */}
            <button
              onClick={() => hasChildren && onToggleExpand?.()}
              className={`flex-shrink-0 p-1 rounded transition-colors ${
                hasChildren
                  ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  : 'text-transparent cursor-default'
              }`}
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )
              ) : (
                <div className="w-4 h-4" />
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
            <h3 className={`font-medium ${isChild ? 'text-sm text-slate-700' : 'text-slate-900'}`}>{category.name}</h3>
            {hasChildren && childCount > 0 && (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{childCount}</span>
            )}
          </div>
          <p className={`text-sm text-slate-500 ${isChild ? 'text-xs' : ''}`}>Category #{category.id}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <IconButton
            onClick={() => openDrawer(DRAWER_IDS.EDIT_CATEGORY, { categoryId: category.id })}
            variant="ghost"
            size="sm"
          >
            <Edit2 className="w-4 h-4" />
          </IconButton>
          <IconButton onClick={() => category.id && onDelete(category.id)} variant="error-ghost" size="sm">
            <Trash2 className="w-4 h-4" />
          </IconButton>
        </div>
      </div>

      {/* Children (for parent categories) */}
      {!isChild && hasChildren && isExpanded && <div>{children}</div>}
    </div>
  );
}
