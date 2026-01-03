import { type PropsWithChildren, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";

import { ModalContext } from "./context";

import type {
  ModalParams,
  ModalProviderModel,
  ModalState,
  OpenModalOptions,
} from "./types";
import { formatModalForUrl, parseModalFromUrl } from "./helpers";

interface ModalProviderProps extends PropsWithChildren {
  /**
   * The search param key to use for the modal state.
   * @default "modal"
   */
  searchParamKey?: string;
}

export function ModalProvider({
  children,
  searchParamKey = "modal",
}: ModalProviderProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Parse current modal state from URL
  const modalParam = searchParams.get(searchParamKey);
  const { modalId, params } = parseModalFromUrl(modalParam);
  const isOpen = modalId !== null;

  // Get the current location state
  const state = location.state as ModalState;

  const openModal = useCallback(
    (newModalId: string, newParams?: ModalParams, opts?: OpenModalOptions) => {
      const newSearchParams = new URLSearchParams(searchParams);
      const formattedValue = formatModalForUrl(newModalId, newParams);
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

  const closeModal = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const contextValue: ModalProviderModel = useMemo(
    () => ({
      isOpen,
      modalId,
      params,
      state,
      openModal,
      closeModal,
    }),
    [isOpen, modalId, params, state, openModal, closeModal]
  );

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
    </ModalContext.Provider>
  );
}
