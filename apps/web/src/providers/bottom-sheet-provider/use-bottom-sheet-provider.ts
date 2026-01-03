import { useContext } from "react";

import { BottomSheetContext } from "./context";
import type { BottomSheetProviderModel } from "./types";

export const useBottomSheetProvider = <Params, State>() => {
  const context = useContext(BottomSheetContext);
  if (!context) {
    throw new Error(
      "useBottomSheetProvider must be used within a BottomSheetProvider"
    );
  }
  return context as BottomSheetProviderModel<Params, State>;
};
