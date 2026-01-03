import { useQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import querystring from "query-string";

import { BASE_URL } from "../constant";

import type {
  QueryObserverBaseResult,
  QueryObserverResult,
  RefetchOptions,
} from "@tanstack/react-query";
import { useIsOnline } from "@/hooks/use-is-online";
import { useSessionProvider } from "@/providers/session-provider";

export interface UseApiQueryOptions<Data, Query, TError> {
  queryKey: (string | number | undefined)[];
  path: string;
  queryParams?: Query;
  headers?: Record<string, string>;
  enabled?: boolean;
  retry?: boolean;
  silentError?: boolean;
  initialData?: (() => Data | undefined) | null;
  initialDataUpdatedAt?: number;
  onSuccess?: (data: Data) => void;
  onError?: (error: TError) => void;
  staleTime?: number;
  gcTime?: number;
  select?: (data: Data | null) => Data;
}

type QueryState = Pick<
  QueryObserverBaseResult,
  | "isError"
  | "isLoading"
  | "isSuccess"
  | "isFetching"
  | "isFetched"
  | "isFetchedAfterMount"
  | "isRefetching"
  | "isPlaceholderData"
  | "isPaused"
  | "isStale"
  | "isInitialLoading"
  | "isPending"
  | "isLoadingError"
  | "isRefetchError"
>;

export type UseApiQueryResult<TData, TError> = [
  data: TData | null,
  error: TError | null,
  state: QueryState,
  refetch: (
    options?: RefetchOptions
  ) => Promise<QueryObserverResult<TData | null, TError> | undefined>
];

export const useApiQuery = <TData, TQuery, TError = { message: string }>(
  options: UseApiQueryOptions<TData, TQuery, TError>
): UseApiQueryResult<TData, TError> => {
  const {
    queryKey,
    path,
    queryParams,
    enabled = true,
    retry = false,
    silentError = false,
    headers = {},
    gcTime,
    initialData = null,
    initialDataUpdatedAt,
    onSuccess,
    onError,
    select,
  } = options ?? {};

  const isOnline = useIsOnline();
  const { browserSession } = useSessionProvider();

  const isEnable = enabled && isOnline;

  const query = useQuery<TData | null, TError>({
    queryKey: queryKey.filter(Boolean),

    queryFn: async () => {
      try {
        const response = await axios.get<TData>(path, {
          params: queryParams,
          baseURL: BASE_URL,
          headers: {
            ...headers,
            ...(browserSession.accessToken
              ? { Authorization: `Bearer ${browserSession.accessToken}` }
              : {}),
          },
          withCredentials: true,
          paramsSerializer: (params) => {
            return querystring.stringify(params, {
              arrayFormat: "none",
              skipEmptyString: true,
            });
          },
        });
        const data = response?.data;
        onSuccess?.(data);
        return data;
      } catch (err) {
        if (err instanceof AxiosError) {
          if (err.response?.status === 401) {
            browserSession.clearSession();
          }
          const errorPayload = (err.response?.data ?? err) as TError | null;
          const errorToThrow = (errorPayload ??
            ({ message: "Unknown error" } as TError)) as TError;
          onError?.(errorToThrow);
          return Promise.reject(errorToThrow);
        }

        const fallbackError = err as TError;
        onError?.(fallbackError);
        return Promise.reject(fallbackError);
      }
    },
    enabled: isEnable,
    retry,
    gcTime,
    initialData,
    initialDataUpdatedAt,
    select,
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

  return [data ?? null, (error ?? null) as TError | null, state, refetch];
};
