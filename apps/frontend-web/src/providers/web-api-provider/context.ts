import { createContext } from "react";
import type { WebAPIProviderModel } from "./types";

export const WebAPIContext = createContext<WebAPIProviderModel | undefined>(undefined);
