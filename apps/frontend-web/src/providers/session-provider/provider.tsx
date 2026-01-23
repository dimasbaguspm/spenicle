import type { FC, PropsWithChildren } from "react";
import { SessionContext } from "./context";
import { browserSession } from "./browser-session";

export const SessionProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <SessionContext.Provider value={{ browserSession }}>
      {children}
    </SessionContext.Provider>
  );
};
