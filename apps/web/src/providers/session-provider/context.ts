import { createContext } from "react";
import { type SessionProviderModel } from "./types";

export const SessionContext = createContext<SessionProviderModel | null>(null);
