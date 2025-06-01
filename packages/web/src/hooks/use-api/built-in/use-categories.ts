import { useQueryClient } from '@tanstack/react-query';

import type {
  Category,
  CategoryQueryParameters,
  Transaction,
  PaginatedResponse,
  Error,
  NewCategory,
  UpdateCategory,
} from '../../../types/api';
import { QUERY_KEYS } from '../constants';
import { useApiInfinite, type UseApiInfiniteResult } from '../use-api-infinite';
import { useApiMutate, type UseApiMutateResult } from '../use-api-mutate';
import { useApiQuery, type UseApiQueryResult } from '../use-api-query';

// List all categories
export const useApiCategoriesQuery = (
  params?: CategoryQueryParameters
): UseApiQueryResult<PaginatedResponse, Error> => {
  return useApiQuery<PaginatedResponse, CategoryQueryParameters, Error>({
    queryKey: QUERY_KEYS.CATEGORIES.list(params),
    path: '/categories',
    queryParams: params,
  });
};

// List all categories with infinite scroll
export const useApiCategoriesInfiniteQuery = (
  params?: Omit<CategoryQueryParameters, 'pageNumber'>
): UseApiInfiniteResult<PaginatedResponse, Error> => {
  return useApiInfinite<PaginatedResponse, CategoryQueryParameters, Error>({
    queryKey: QUERY_KEYS.CATEGORIES.infinite(params),
    path: '/categories',
    queryParams: params,
    initialPageParam: 1,
  });
};

// Get single category
export const useApiCategoryQuery = (categoryId: number): UseApiQueryResult<Category, Error> => {
  return useApiQuery<Category, never, Error>({
    queryKey: QUERY_KEYS.CATEGORIES.single(categoryId),
    path: `/categories/${categoryId}`,
    enabled: !!categoryId,
  });
};

// Get category transactions
export const useApiCategoryTransactionsQuery = (
  categoryId: number,
  params?: { limit?: number; offset?: number }
): UseApiQueryResult<Transaction[], Error> => {
  return useApiQuery<Transaction[], { limit?: number; offset?: number }, Error>({
    queryKey: QUERY_KEYS.CATEGORIES.transactions(categoryId, params),
    path: `/categories/${categoryId}/transactions`,
    queryParams: params,
    enabled: !!categoryId,
  });
};

// Create category
export const useApiCreateCategoryMutation = (): UseApiMutateResult<Category, NewCategory, Error> => {
  const queryClient = useQueryClient();

  return useApiMutate({
    path: '/categories',
    method: 'POST',
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CATEGORIES.all(), exact: false });
    },
  });
};

// Update category
export const useApiUpdateCategoryMutation = (): UseApiMutateResult<
  Category,
  UpdateCategory & { categoryId: number },
  Error
> => {
  const queryClient = useQueryClient();

  return useApiMutate({
    path: `/categories/:categoryId`,
    method: 'PATCH',
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CATEGORIES.all(), exact: false });
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CATEGORIES.single(variables.categoryId),
        exact: false,
      });
    },
  });
};

// Delete category
export const useApiDeleteCategoryMutation = (): UseApiMutateResult<Category, { categoryId: number }, Error> => {
  const queryClient = useQueryClient();

  return useApiMutate({
    path: `/categories/:categoryId`,
    method: 'DELETE',
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CATEGORIES.all(), exact: false });
      queryClient.removeQueries({ queryKey: QUERY_KEYS.CATEGORIES.single(variables.categoryId), exact: false });
    },
  });
};
