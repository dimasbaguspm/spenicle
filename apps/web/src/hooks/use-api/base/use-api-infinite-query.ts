import { useInfiniteQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { mergeWith } from "lodash";
import querystring from "query-string";

import { BASE_URL } from "../constant";

import type {
  InfiniteData,
  InfiniteQueryObserverBaseResult,
} from "@tanstack/react-query";
import { useIsOnline } from "@/hooks/use-is-online";
import { useSessionProvider } from "@/providers/session-provider";

export interface UseApiInfiniteQueryOptions<Data, Query, TError> {
  queryKey: (string | number | undefined)[];
  path: string;
  queryParams?: Query;
  headers?: Record<string, string>;
  enabled?: boolean;
  retry?: boolean;
  silentError?: boolean;
  initialData?: Data[] | null;
  onSuccess?: (data: Data[]) => void;
  onError?: (error: TError) => void;
  staleTime?: number;
  gcTime?: number;
  select?: (data: Data[] | null) => Data[];
  getNextPageParam?: (
    lastPage: Data | null,
    pages: (Data | null)[]
  ) => unknown | undefined;
}

type InfiniteQueryState = Pick<
  InfiniteQueryObserverBaseResult,
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
  | "hasNextPage"
  | "isFetchingNextPage"
  | "isFetchNextPageError"
> & {
  isInitialFetching: boolean;
};

type InfiniteQueryFuncs<TData, TError> = Pick<
  InfiniteQueryObserverBaseResult<TData, TError>,
  "fetchNextPage" | "fetchPreviousPage" | "refetch"
>;

export type UseApiInfiniteQueryResult<TData, TError> = [
  data: TData[],
  error: TError | null,
  state: InfiniteQueryState,
  funcs: InfiniteQueryFuncs<InfiniteData<TData | null>, TError>
];

export const useApiInfiniteQuery = <
  TData,
  TQuery,
  TError = { message: string }
>(
  options: UseApiInfiniteQueryOptions<TData, TQuery, TError>
): UseApiInfiniteQueryResult<TData, TError> => {
  const {
    queryKey,
    path,
    queryParams,
    enabled = true,
    retry = true,
    silentError = false,
    headers = {},
    gcTime,
    initialData = null,
    onSuccess,
    onError,
    select,
  } = options ?? {};

  const { browserSession } = useSessionProvider();
  const isOnline = useIsOnline();

  const isEnable = enabled && isOnline;

  const query = useInfiniteQuery<TData | null, TError>({
    queryKey: queryKey.filter(Boolean),

    queryFn: async ({ pageParam }) => {
      try {
        const params = (queryParams as Record<string, unknown>) ?? {};
        if (pageParam !== undefined) {
          // include pageParam under `page` key by default; callers can override by including page in queryParams
          (params as Record<string, unknown>).pageNumber = pageParam as unknown;
        }

        const response = await axios.get(path, {
          params,
          baseURL: BASE_URL,
          headers: {
            ...headers,
            ...(browserSession.accessToken
              ? { Authorization: `Bearer ${browserSession.accessToken}` }
              : {}),
          },
          withCredentials: true,
          paramsSerializer: (p) => {
            return querystring.stringify(p, {
              arrayFormat: "none",
              skipEmptyString: true,
            });
          },
        });
        const data = response?.data;
        onSuccess?.(data?.items ?? []);
        return data;
      } catch (err) {
        if (err instanceof AxiosError && err.response?.status === 401) {
          browserSession.clearSession();
        }
        onError?.(err as TError);
        return err;
      }
    },
    getNextPageParam: (lastPage) => {
      const typedLastPage = lastPage as unknown as {
        pageNumber: number;
        totalPages: number;
      };

      if (!typedLastPage) return undefined;

      if (typedLastPage.pageNumber < typedLastPage.totalPages) {
        return typedLastPage.pageNumber + 1;
      }

      return undefined;
    },
    initialPageParam: undefined,
    enabled: isEnable,
    retry,
    gcTime,
    // intentionally not passing initialData into useInfiniteQuery to avoid shape mismatch; returned value below preserves compatibility
    select: undefined,
    meta: {
      silentError,
    },
  });

  const { data: infiniteData, error } = query;

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
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isFetchNextPageError: query.isFetchNextPageError,
    isInitialFetching: !query.isFetchingNextPage && query.isLoading,
  };

  const funcs: InfiniteQueryFuncs<InfiniteData<TData | null>, TError> = {
    fetchNextPage: query.fetchNextPage,
    fetchPreviousPage: query.fetchPreviousPage,
    refetch: query.refetch,
  };

  // Combine pages into a single data value:
  // - If pages are arrays, concat them
  // - If pages are objects, concatenate array-valued fields across pages and take last value for others
  // - Otherwise fall back to the last fetched page
  const pages = infiniteData?.pages ?? [];

  let combinedRaw: unknown = initialData ?? null;

  if (pages.length > 0) {
    const first = pages[0];

    if (pages.every((p) => Array.isArray(p))) {
      // concat arrays across pages
      combinedRaw = ([] as unknown[]).concat(
        ...(pages as unknown as unknown[][])
      );
    } else if (first && typeof first === "object" && !Array.isArray(first)) {
      // detect paginated response shape { items: Data[], pageNumber, pageSize, totalItems, totalPages }
      const hasItemsArray = Array.isArray(
        (first as unknown as Record<string, unknown>)?.items
      );
      if (hasItemsArray) {
        // concat items across pages and return the items array as the hook data
        const allItems: unknown[] = [];
        for (const p of pages) {
          const items = (p as unknown as Record<string, unknown>)?.items;
          if (Array.isArray(items)) {
            allItems.push(...(items as unknown[]));
          }
        }
        // we could keep metadata (last page) available later if needed; for now return the items array
        combinedRaw = allItems;
      } else {
        // merge object pages: concatenate array fields, take last scalar/object for non-array fields
        combinedRaw = mergeWith(
          {},
          ...pages.map((p) =>
            p && typeof p === "object" && !Array.isArray(p) ? p : {}
          ),
          (objValue: unknown, srcValue: unknown) => {
            if (Array.isArray(objValue))
              return (objValue as unknown[]).concat(srcValue as unknown[]);
            return undefined;
          }
        );
      }
    } else {
      // fallback to last page
      combinedRaw = pages[pages.length - 1];
    }
  }

  const combined = select
    ? (select(combinedRaw as TData[] | null) as TData[] | null)
    : (combinedRaw as TData | null);

  const dataResult = combined as unknown as UseApiInfiniteQueryResult<
    TData,
    TError
  >[0];

  return [dataResult ?? [], error, state, funcs];
};

// Backward-compatible alias: keep existing name working while exposing a clearer infinite-query name
export const useApiQuery = useApiInfiniteQuery;
