import { useContext } from "react";
import { SessionContext } from "./context";

export const useSessionProvider = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSessionProvider must be used within a SessionProvider");
  }
  return ctx;
};
