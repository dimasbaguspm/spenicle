import {
  useInfiniteQuery,
  type FetchNextPageOptions,
  type FetchPreviousPageOptions,
  type InfiniteData,
  type InfiniteQueryObserverBaseResult,
  type InfiniteQueryObserverResult,
  type QueryObserverResult,
  type RefetchOptions,
} from '@tanstack/react-query';
import axios from 'axios';

import type { Error, PaginatedResponse } from '../../types/api';
import { TokenManager } from '../use-session';

import { BASE_URL } from './constants';

export interface UseApiInfiniteOptions<TData, Query, TError> {
  queryKey: unknown[];
  path: string;
  queryParams?: Query;
  enabled?: boolean;
  retry?: boolean;
  silentError?: boolean;
  headers?: Record<string, string>;
  onSuccess?: (data: TData) => void;
  onError?: (error: TError) => void;
  getNextPageParam?: (lastPage: TData, allPages: TData[], lastPageParam: unknown, allPageParams: unknown[]) => unknown;
  getPreviousPageParam?: (
    firstPage: TData,
    allPages: TData[],
    firstPageParam: unknown,
    allPageParams: unknown[]
  ) => unknown;
  initialPageParam?: unknown;
}

type InfiniteQueryState = Pick<
  InfiniteQueryObserverBaseResult,
  | 'isError'
  | 'isLoading'
  | 'isSuccess'
  | 'isFetching'
  | 'isFetched'
  | 'isFetchedAfterMount'
  | 'isRefetching'
  | 'isPlaceholderData'
  | 'isPaused'
  | 'isStale'
  | 'isInitialLoading'
  | 'isPending'
  | 'isLoadingError'
  | 'isRefetchError'
  | 'isFetchingNextPage'
  | 'isFetchingPreviousPage'
  | 'hasNextPage'
  | 'hasPreviousPage'
>;

export type UseApiInfiniteResult<TData, TError> = [
  data: InfiniteData<TData> | undefined,
  error: TError | null,
  state: InfiniteQueryState,
  fetchNextPage: (options?: FetchNextPageOptions) => Promise<InfiniteQueryObserverResult<InfiniteData<TData>, TError>>,
  fetchPreviousPage: (
    options?: FetchPreviousPageOptions
  ) => Promise<InfiniteQueryObserverResult<InfiniteData<TData>, TError>>,
  refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<InfiniteData<TData>, TError> | undefined>,
];

export const useApiInfinite = <TData extends PaginatedResponse, TQuery, TError = Error>(
  options: UseApiInfiniteOptions<TData, TQuery, TError>
): UseApiInfiniteResult<TData, TError> => {
  const {
    queryKey,
    path,
    queryParams,
    enabled = true,
    retry = true,
    silentError = false,
    headers = {},
    onSuccess,
    onError,
    getNextPageParam,
    getPreviousPageParam,
    initialPageParam,
  } = options ?? {};

  const accessToken = TokenManager.getAccessToken();

  const query = useInfiniteQuery<TData, TError>({
    queryKey: queryKey.filter(Boolean),
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const response = await axios.get<TData>(path, {
          params: {
            ...queryParams,
            pageParam,
          },
          headers: {
            Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
            ...headers,
          },
          baseURL: BASE_URL,
        });

        const data = response.data;
        onSuccess?.(data);
        return data;
      } catch (error) {
        onError?.(error as TError);
        throw error;
      }
    },
    getNextPageParam: (...args) => {
      if (getNextPageParam) {
        return getNextPageParam(...args);
      }

      const lastPage = args[0];
      const { pageNumber, totalPages } = lastPage;

      if (!lastPage || !pageNumber || !totalPages) {
        return undefined;
      }
      return pageNumber < totalPages ? pageNumber + 1 : undefined;
    },
    getPreviousPageParam,
    initialPageParam,
    enabled,
    retry,
    meta: {
      silentError,
    },
  });

  const { data, error, refetch, fetchNextPage, fetchPreviousPage } = query;

  const state: InfiniteQueryState = {
    isError: query.isError,
    isLoading: query.isLoading,
    isSuccess: query.isSuccess,
    isFetching: query.isFetching,
    isFetched: query.isFetched,
    isFetchedAfterMount: query.isFetchedAfterMount,
    isRefetching: query.isRefetching,
    isPlaceholderData: query.isPlaceholderData,
    isPaused: query.isPaused,
    isStale: query.isStale,
    isInitialLoading: query.isInitialLoading,
    isPending: query.isPending,
    isLoadingError: query.isLoadingError,
    isRefetchError: query.isRefetchError,
    isFetchingNextPage: query.isFetchingNextPage,
    isFetchingPreviousPage: query.isFetchingPreviousPage,
    hasNextPage: query.hasNextPage,
    hasPreviousPage: query.hasPreviousPage,
  };

  return [data, error, state, fetchNextPage, fetchPreviousPage, refetch];
};
