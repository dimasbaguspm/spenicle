import {
  useQuery,
  type QueryObserverBaseResult,
  type QueryObserverResult,
  type RefetchOptions,
} from '@tanstack/react-query';
import axios from 'axios';

import { TIME_15_MINUTES } from '../../constants/time';
import type { Error } from '../../types/api';
import { TokenManager } from '../use-session';

import { BASE_URL } from './constants';

export interface UseApiQueryOptions<Data, Query, TError> {
  queryKey: (string | number | undefined)[];
  path: string;
  queryParams?: Query;
  headers?: Record<string, string>;
  enabled?: boolean;
  retry?: boolean;
  silentError?: boolean;
  onSuccess?: (data: Data) => void;
  onError?: (error: TError) => void;
  staleTime?: number;
  gcTime?: number;
}

type QueryState = Pick<
  QueryObserverBaseResult,
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
>;

export type UseApiQueryResult<TData, TError> = [
  data: TData | undefined,
  error: TError | null,
  state: QueryState,
  refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<TData | undefined, TError> | undefined>,
];

export const useApiQuery = <TData, TQuery, TError = Error>(
  options: UseApiQueryOptions<TData, TQuery, TError>
): UseApiQueryResult<TData, TError> => {
  const accessToken = TokenManager.getAccessToken();

  const {
    queryKey,
    path,
    queryParams,
    enabled = true,
    retry = true,
    silentError = false,
    headers = {},
    staleTime = TIME_15_MINUTES,
    gcTime,
    onSuccess,
    onError,
  } = options ?? {};

  const query = useQuery<TData | undefined, TError>({
    queryKey: queryKey.filter(Boolean),
    queryFn: async () => {
      try {
        const response = await axios.get<TData>(path, {
          params: queryParams,
          baseURL: BASE_URL,
          headers: {
            Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
            ...headers,
          },
        });

        const data = response.data;
        onSuccess?.(data);
        return data;
      } catch (error) {
        onError?.(error as TError);
        return undefined;
      }
    },
    enabled,
    retry,
    staleTime,
    gcTime,
    meta: {
      silentError,
    },
  });

  const { data, error, refetch } = query;

  const state: QueryState = {
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
  };

  return [data, error, state, refetch];
};
