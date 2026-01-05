import { useState } from "react";
import { useSearchParams } from "react-router";

export interface FilterStateAdapter {
  /**
   * Get the current URLSearchParams instance
   */
  getParams: () => URLSearchParams;

  /**
   * Update the URLSearchParams
   */
  setParams: (params: URLSearchParams) => void;
}

export interface UseFilterStateReturn<T extends object> {
  /**
   * Get a single filter value as string or undefined
   */
  getSingle: (key: keyof T) => string | undefined;

  /**
   * Get all values for a filter key as string array
   */
  getAll: (key: keyof T) => string[];

  /**
   * Replace all filters with new values
   */
  replaceAll: (
    filters: Partial<
      Record<keyof T, string | string[] | number | number[] | undefined>
    >
  ) => void;

  /**
   * Replace a single filter with new value(s)
   */
  replaceSingle: (
    key: keyof T,
    value: string | string[] | number | number[] | undefined
  ) => void;

  /**
   * Add a single value to a filter (for multi-value filters)
   */
  addSingle: (key: keyof T, value: string | number) => void;

  /**
   * Remove a specific value from a filter
   */
  removeSingle: (key: keyof T, value?: string | number) => void;

  /**
   * Remove all values for specific filter keys
   */
  removeAll: (keys: (keyof T)[]) => void;
}

export type FilterAdapterStateType = "url" | "state";

export interface UseFilterStateOptions<T> {
  /**
   * Default filter values to initialize the state with
   * @default {}
   */
  defaultValues?: Partial<T>;
  /**
   * Whether to replace the current history entry instead of pushing a new one
   * Only applies when adapter is 'url'
   * @default true
   */
  replace?: boolean;

  /**
   * The adapter to use for state management
   * - 'url': Uses URL search parameters (default)
   * - 'state': Uses React useState for in-memory storage
   * @default 'url'
   */
  adapter?: FilterAdapterStateType;

  /**
   * Custom adapter implementation
   * If provided, takes precedence over the adapter option
   */
  customAdapter?: FilterStateAdapter;
}

/**
 * A reusable hook for managing URL search parameters as filters
 * Provides CRUD operations with clear responsibilities
 */
export const useFilterState = <T extends object>(
  options: UseFilterStateOptions<T> = {}
): UseFilterStateReturn<T> => {
  const {
    defaultValues = {},
    replace = true,
    adapter = "url",
    customAdapter,
  } = options;

  // Built-in adapters
  const urlAdapter = (): FilterStateAdapter => {
    const [searchParams, setSearchParams] = useSearchParams(
      new URLSearchParams(defaultValues as Record<string, string>)
    );
    return {
      getParams: () => searchParams,
      setParams: (params) => setSearchParams(params, { replace }),
    };
  };

  const stateAdapter = (): FilterStateAdapter => {
    const [searchParams, setSearchParams] = useState(
      () => new URLSearchParams(defaultValues as Record<string, string>)
    );
    return {
      getParams: () => searchParams,
      setParams: (params) => setSearchParams(new URLSearchParams(params)),
    };
  };

  // Select the appropriate adapter
  const currentAdapter =
    customAdapter || (adapter === "state" ? stateAdapter() : urlAdapter());

  const { getParams, setParams } = currentAdapter;
  const searchParams = getParams();

  const getSingle = (key: keyof T): string | undefined => {
    return searchParams.get(String(key)) ?? undefined;
  };

  const getAll = (key: keyof T): string[] => {
    return searchParams.getAll(String(key));
  };

  const replaceAll = (
    filters: Partial<
      Record<keyof T, string | string[] | number | number[] | undefined>
    >
  ) => {
    const newParams = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return; // Skip undefined, null, or empty values
      }

      if (Array.isArray(value)) {
        value.forEach((v) => {
          if (v !== undefined && v !== null && v !== "") {
            newParams.append(key, String(v));
          }
        });
      } else {
        newParams.set(key, String(value));
      }
    });

    setParams(newParams);
  };

  const replaceSingle = (
    key: keyof T,
    value: string | string[] | number | number[] | undefined
  ) => {
    const newParams = new URLSearchParams(searchParams);
    const keyStr = String(key);

    // Remove existing values for this key
    newParams.delete(keyStr);

    if (value === undefined || value === null || value === "") {
      setParams(newParams);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v !== undefined && v !== null && v !== "") {
          newParams.append(keyStr, String(v));
        }
      });
    } else {
      newParams.set(keyStr, String(value));
    }

    setParams(newParams);
  };

  const addSingle = (key: keyof T, value: string | number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.append(String(key), String(value));
    setParams(newParams);
  };

  const removeSingle = (key: keyof T, value?: string | number) => {
    const newParams = new URLSearchParams(searchParams);
    const keyStr = String(key);

    if (value === undefined) {
      // Remove all values for this key
      newParams.delete(keyStr);
    } else {
      // Remove specific value
      const values = newParams.getAll(keyStr);
      const filteredValues = values.filter((v) => v !== String(value));

      newParams.delete(keyStr);
      filteredValues.forEach((v) => newParams.append(keyStr, v));
    }

    setParams(newParams);
  };

  const removeAll = (keys: (keyof T)[]) => {
    const newParams = new URLSearchParams(searchParams);

    keys.forEach((key) => {
      newParams.delete(String(key));
    });

    setParams(newParams);
  };

  return {
    getSingle,
    getAll,
    replaceAll,
    replaceSingle,
    addSingle,
    removeSingle,
    removeAll,
  };
};
