import { useContext } from "react";
import { WebAPIContext } from "./context";
import type { WebAPIProviderModel } from "./types";

export const useWebAPIProvider = (): WebAPIProviderModel => {
  const context = useContext(WebAPIContext);

  if (!context) {
    throw new Error("useWebAPIProvider must be used within WebAPIProvider");
  }

  return context;
};
