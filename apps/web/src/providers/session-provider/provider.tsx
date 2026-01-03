import type { FC, PropsWithChildren } from "react";
import { SessionContext } from "./context";
import { BrowserSession } from "./browser-session";

const browserSession = new BrowserSession();

export const SessionProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <SessionContext.Provider value={{ browserSession }}>
      {children}
    </SessionContext.Provider>
  );
};
