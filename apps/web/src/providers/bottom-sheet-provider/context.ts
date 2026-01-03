import { createContext } from "react";

import { type BottomSheetProviderModel } from "./types";

export const BottomSheetContext =
  createContext<BottomSheetProviderModel | null>(null);
