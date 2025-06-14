import { useMemo } from 'react';

import type { Category } from '../../../types/api';

export interface UseCategoriesSearchResult {
  filteredParentCategories: Category[];
  filteredChildrenByParent: Record<number, Category[]>;
  autoExpandedCategories: Set<number>;
}

export interface UseCategoriesSearchOptions {
  categories: Category[];
  searchQuery: string;
}

/**
 * Custom hook for handling category search functionality with smart nested category handling.
 *
 * Features:
 * - Searches both parent and child categories
 * - Includes parents when children match (even if parent doesn't match)
 * - Includes all children when parent matches
 * - Auto-expands parents that have matching children
 * - Maintains proper hierarchy structure during search
 *
 * @param options - Configuration options for the search
 * @returns Filtered categories with search-aware structure
 */
export function useCategoriesSearch({
  categories,
  searchQuery,
}: UseCategoriesSearchOptions): UseCategoriesSearchResult {
  return useMemo(() => {
    if (!searchQuery.trim()) {
      // No search - return all categories in their normal structure
      const allParents = categories.filter((category) => category.parentId === null);
      const allChildren = categories.filter((category) => category.parentId !== null);

      const allChildrenByParent = allChildren.reduce(
        (acc, child) => {
          const parentId = child.parentId!;
          acc[parentId] ??= [];
          acc[parentId].push(child);
          return acc;
        },
        {} as Record<number, Category[]>
      );

      return {
        filteredParentCategories: allParents,
        filteredChildrenByParent: allChildrenByParent,
        autoExpandedCategories: new Set<number>(),
      };
    }

    const query = searchQuery.toLowerCase().trim();

    // Find all categories that match the search (name or note)
    const matchingCategories = categories.filter(
      (category) =>
        (category.name?.toLowerCase().includes(query) ?? false) ||
        (category.note?.toLowerCase().includes(query) ?? false)
    );

    // Separate matching categories by type
    const matchingParents = matchingCategories.filter((category) => category.parentId === null);
    const matchingChildren = matchingCategories.filter((category) => category.parentId !== null);

    // Find parents that have matching children (even if the parent doesn't match)
    const parentIdsWithMatchingChildren = new Set(matchingChildren.map((child) => child.parentId!).filter(Boolean));

    // Get all parent categories that should be shown:
    // 1. Parents that match the search directly
    // 2. Parents that have matching children
    const parentsToShow = categories.filter((category) => {
      if (category.parentId !== null) return false; // Only parents
      return (
        matchingParents.some((mp) => mp.id === category.id) || // Parent matches
        parentIdsWithMatchingChildren.has(category.id!) // Has matching children
      );
    });

    // For each parent to show, get their children that should be displayed
    const childrenByParent = parentsToShow.reduce(
      (acc, parent) => {
        const parentId = parent.id!;

        // Get all children of this parent
        const allChildrenOfParent = categories.filter((cat) => cat.parentId === parentId);

        // If parent matches search, show all its children
        const parentMatches = matchingParents.some((mp) => mp.id === parentId);

        if (parentMatches) {
          // Parent matches - show all children
          acc[parentId] = allChildrenOfParent;
        } else {
          // Parent doesn't match - only show children that match
          acc[parentId] = allChildrenOfParent.filter((child) => matchingChildren.some((mc) => mc.id === child.id));
        }

        return acc;
      },
      {} as Record<number, Category[]>
    );

    // Auto-expand parents that have matching children
    const autoExpanded = new Set<number>();
    parentIdsWithMatchingChildren.forEach((parentId) => {
      autoExpanded.add(parentId);
    });

    return {
      filteredParentCategories: parentsToShow,
      filteredChildrenByParent: childrenByParent,
      autoExpandedCategories: autoExpanded,
    };
  }, [categories, searchQuery]);
}
