import { useContext } from "react";

import { ModalContext } from "./context";
import type { ModalProviderModel } from "./types";

export const useModalProvider = <Params, State>() => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModalProvider must be used within a ModalProvider");
  }
  return context as ModalProviderModel<Params, State>;
};
