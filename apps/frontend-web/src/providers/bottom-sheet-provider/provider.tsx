import { type PropsWithChildren, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";

import { BottomSheetContext } from "./context";

import type {
  BottomSheetParams,
  BottomSheetProviderModel,
  BottomSheetState,
  OpenBottomSheetOptions,
} from "./types";
import { formatBottomSheetForUrl, parseBottomSheetFromUrl } from "./helpers";

interface BottomSheetProviderProps extends PropsWithChildren {
  /**
   * The search param key to use for the bottomSheet state.
   * @default "bottomSheet"
   */
  searchParamKey?: string;
}

export function BottomSheetProvider({
  children,
  searchParamKey = "bottomSheet",
}: BottomSheetProviderProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Parse current bottomSheet state from URL
  const bottomSheetParam = searchParams.get(searchParamKey);
  const { bottomSheetId, params } = parseBottomSheetFromUrl(bottomSheetParam);
  const isOpen = bottomSheetId !== null;

  // Get the current location state
  const state = location.state as BottomSheetState;

  const openBottomSheet = useCallback(
    (
      newBottomSheetId: string,
      newParams?: BottomSheetParams,
      opts?: OpenBottomSheetOptions
    ) => {
      const newSearchParams = new URLSearchParams(searchParams);
      const formattedValue = formatBottomSheetForUrl(
        newBottomSheetId,
        newParams
      );
      newSearchParams.set(searchParamKey, formattedValue);

      const newSearch = newSearchParams.toString();
      const newUrl = `${location.pathname}${newSearch ? `?${newSearch}` : ""}${
        location.hash
      }`;

      navigate(newUrl, {
        replace: opts?.replace,
        state: opts?.state,
        preventScrollReset: true,
      });
    },
    [searchParams, searchParamKey, location.pathname, location.hash, navigate]
  );

  const closeBottomSheet = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const contextValue: BottomSheetProviderModel = useMemo(
    () => ({
      isOpen,
      bottomSheetId,
      params,
      state,
      openBottomSheet,
      closeBottomSheet,
    }),
    [isOpen, bottomSheetId, params, state, openBottomSheet, closeBottomSheet]
  );

  return (
    <BottomSheetContext.Provider value={contextValue}>
      {children}
    </BottomSheetContext.Provider>
  );
}
