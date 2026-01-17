import { createContext } from "react";

import { type DrawerProviderModel } from "./types";

export const DrawerContext = createContext<DrawerProviderModel | null>(null);
