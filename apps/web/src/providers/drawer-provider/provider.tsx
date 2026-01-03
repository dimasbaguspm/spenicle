import { type PropsWithChildren, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";

import { DrawerContext } from "./context";

import type {
  DrawerParams,
  DrawerProviderModel,
  DrawerState,
  OpenDrawerOptions,
} from "./types";
import { formatDrawerForUrl, parseDrawerFromUrl } from "./helpers";

interface DrawerProviderProps extends PropsWithChildren {
  /**
   * The search param key to use for the drawer state.
   * @default "drawer"
   */
  searchParamKey?: string;
}

export function DrawerProvider({
  children,
  searchParamKey = "drawer",
}: DrawerProviderProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Parse current drawer state from URL
  const drawerParam = searchParams.get(searchParamKey);
  const { drawerId, params } = parseDrawerFromUrl(drawerParam);
  const isOpen = drawerId !== null;

  // Get the current location state
  const state = location.state as DrawerState;

  const openDrawer = useCallback(
    (
      newDrawerId: string,
      newParams?: DrawerParams,
      opts?: OpenDrawerOptions
    ) => {
      const newSearchParams = new URLSearchParams(searchParams);
      const formattedValue = formatDrawerForUrl(newDrawerId, newParams);
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

  const closeDrawer = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const contextValue: DrawerProviderModel = useMemo(
    () => ({
      isOpen,
      drawerId,
      params,
      state,
      openDrawer,
      closeDrawer,
    }),
    [isOpen, drawerId, params, state, openDrawer, closeDrawer]
  );

  return (
    <DrawerContext.Provider value={contextValue}>
      {children}
    </DrawerContext.Provider>
  );
}
