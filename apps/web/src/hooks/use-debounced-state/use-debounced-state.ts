import { debounce } from "lodash";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";

export type DebouncedStateAdapterType = "state" | "url";

export interface UseDebouncedStateOptions<T> {
  debounceTime?: number;
  defaultValue?: T;
  /**
   * The adapter to use for state management
   * - 'state': Uses React useState for in-memory storage (default)
   * - 'url': Uses URL search parameters
   * @default 'state'
   */
  adapter?: DebouncedStateAdapterType;
  /**
   * The URL parameter key to use when adapter is 'url'
   * Required when adapter is 'url'
   */
  urlKey?: string;
  /**
   * Whether to replace the current history entry instead of pushing a new one
   * Only applies when adapter is 'url'
   * @default true
   */
  replace?: boolean;
}

export const useDebouncedState = <T>(
  options: UseDebouncedStateOptions<T> = {}
) => {
  const {
    debounceTime = 1000,
    defaultValue = "" as T,
    adapter = "state",
    urlKey,
    replace = true,
  } = options;

  // Validate required options for URL adapter
  if (adapter === "url" && !urlKey) {
    throw new Error("urlKey is required when using url adapter");
  }

  // URL adapter implementation
  const [searchParams, setSearchParams] = useSearchParams();

  // State adapter implementation
  const [stateValue, setStateValue] = useState<T>(defaultValue);

  // Get current value based on adapter
  const getCurrentValue = (): T => {
    if (adapter === "url") {
      const urlValue = searchParams.get(urlKey!);
      if (urlValue === null) {
        return defaultValue;
      }
      // Try to parse as the expected type
      if (typeof defaultValue === "number") {
        const parsed = Number(urlValue);
        return isNaN(parsed) ? defaultValue : (parsed as T);
      }
      if (typeof defaultValue === "boolean") {
        return (urlValue === "true") as T;
      }
      return urlValue as T;
    }
    return stateValue;
  };

  const currentValue = getCurrentValue();

  // Set value based on adapter
  const setValue = (value: T) => {
    if (adapter === "url") {
      const newParams = new URLSearchParams(searchParams);
      if (value === undefined || value === null || value === "") {
        newParams.delete(urlKey!);
      } else {
        newParams.set(urlKey!, String(value));
      }
      setSearchParams(newParams, { replace });
    } else {
      setStateValue(value);
    }
  };

  const debouncedSetValue = useMemo(
    () => debounce((value: T) => setValue(value), debounceTime),
    [debounceTime, adapter, urlKey, replace, searchParams, setSearchParams]
  );

  return [currentValue, debouncedSetValue] as const;
};
