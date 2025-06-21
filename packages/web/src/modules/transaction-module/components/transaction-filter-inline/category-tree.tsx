import React from 'react';

import { CheckboxInput, CheckboxGroup } from '../../../../components';
import type { Category } from '../../../../types/api';

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

interface CategoryTreeProps {
  cats: CategoryTreeNode[];
  checkedIds: number[];
  onCheck: (id: number, checked: boolean, isParent: boolean, allChildIds: number[]) => void;
  level?: number;
}

// helper to get all descendant ids
function getAllDescendantIds(cat: CategoryTreeNode): number[] {
  return [cat.id!, ...cat.children.flatMap((child) => getAllDescendantIds(child))];
}

// helper to check parent state
function getParentCheckState(cat: CategoryTreeNode, checkedIds: number[]): 'checked' | 'indeterminate' | 'none' {
  if (!cat.children.length) return checkedIds.includes(cat.id!) ? 'checked' : 'none';
  const childStates = cat.children.map((child) => getParentCheckState(child, checkedIds));
  if (childStates.every((s) => s === 'checked')) return 'checked';
  if (childStates.some((s) => s === 'checked' || s === 'indeterminate')) return 'indeterminate';
  return 'none';
}

export const CategoryTree: React.FC<CategoryTreeProps> = ({ cats, checkedIds, onCheck, level = 0 }) => {
  return (
    <CheckboxGroup direction="vertical" className={level > 0 ? 'ml-5 mt-2' : ''}>
      {cats.map((cat) => {
        const isParent = !!cat.children.length;
        const state = getParentCheckState(cat, checkedIds);
        const allChildIds = getAllDescendantIds(cat);
        return (
          <div key={cat.id}>
            <CheckboxInput
              variant="coral"
              id={`category-${cat.id}`}
              label={cat.name}
              checked={state === 'checked'}
              indeterminate={state === 'indeterminate'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const checked = e.target.checked;
                onCheck(cat.id!, checked, isParent, allChildIds);
              }}
            />
            {cat.children.length > 0 && (
              <CategoryTree cats={cat.children} checkedIds={checkedIds} onCheck={onCheck} level={level + 1} />
            )}
          </div>
        );
      })}
    </CheckboxGroup>
  );
};

// helper to build category tree
export function buildCategoryTree(categoryList: Category[]): CategoryTreeNode[] {
  const map = new Map<number, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];
  for (const cat of categoryList) {
    if (typeof cat.id !== 'number') continue;
    map.set(cat.id, { ...cat, children: [] });
  }
  for (const cat of map.values()) {
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)!.children.push(cat);
    } else {
      roots.push(cat);
    }
  }
  return roots;
}
