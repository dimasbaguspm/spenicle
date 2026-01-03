import { createContext } from "react";
import type { AuthProviderModel } from "./types";

export const AuthContext = createContext<AuthProviderModel | null>(null);
