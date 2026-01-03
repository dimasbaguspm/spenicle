import React, { type FC, type PropsWithChildren } from "react";
import { useSession } from "@/hooks/use-session";
import { AuthContext } from "./context";

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  const { accessToken, refreshToken, setTokens, clearSession } = useSession();

  const isAuthenticated = !!accessToken;

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        refreshToken,
        isAuthenticated,
        setTokens,
        clearAuth: clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
