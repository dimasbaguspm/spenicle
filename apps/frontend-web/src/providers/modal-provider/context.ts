import { createContext } from "react";

import { type ModalProviderModel } from "./types";

export const ModalContext = createContext<ModalProviderModel | null>(null);
