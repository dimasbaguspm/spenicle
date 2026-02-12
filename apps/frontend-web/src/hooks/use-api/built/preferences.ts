import type { RefreshGeoCacheRequestModel } from "@/types/schemas";

import { ENDPOINTS } from "../constant";
import { useApiMutate } from "../base/use-api-mutate";

/**
 * Refresh geo cache - triggers background indexing of geotagged transactions
 * Returns immediately (204 No Content), indexing happens asynchronously
 *
 * @returns Tuple: [mutateAsync, error, states, reset]
 *
 * @example
 * ```tsx
 * const [refreshGeoCache, , { isPending }] = useApiRefreshGeoCache();
 *
 * await refreshGeoCache({
 *   latitude: -6.2088,
 *   longitude: 106.8456,
 * });
 * ```
 */
export const useApiRefreshGeoCache = () => {
  return useApiMutate<void, RefreshGeoCacheRequestModel>({
    path: ENDPOINTS.PREFERENCES.REFRESH_GEO_CACHE,
    method: "POST",
    silentError: true, // Don't show error toast for optional optimization
  });
};
