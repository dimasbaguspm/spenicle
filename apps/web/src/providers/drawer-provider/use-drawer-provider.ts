import { useContext } from "react";

import { DrawerContext } from "./context";
import type { DrawerProviderModel } from "./types";

export const useDrawerProvider = <Params, State>() => {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error("useDrawerProvider must be used within a DrawerProvider");
  }
  return context as DrawerProviderModel<Params, State>;
};
