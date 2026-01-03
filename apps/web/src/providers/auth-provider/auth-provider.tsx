import { useEffect, type FC, type PropsWithChildren } from "react";
import { AuthContext } from "./context";
import { useSessionProvider } from "../session-provider";
import { useApiRefreshToken } from "@/hooks/use-api/built/auth";
import { PageLoader } from "@dimasbaguspm/versaur";

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  const { browserSession } = useSessionProvider();

  const [getRefreshToken, , { isPending: isRefreshing }] = useApiRefreshToken();
  const { accessToken, refreshToken, setTokens, setAccessToken, clearSession } =
    browserSession;

  const shouldRevalidate = !!refreshToken && !accessToken;
  const isRefreshingToken = isRefreshing && shouldRevalidate;
  const isAuthenticated = !!accessToken;

  useEffect(() => {
    if (shouldRevalidate) {
      getRefreshToken({ refresh_token: refreshToken });
    }
  }, []);

  if (isRefreshingToken) {
    return <PageLoader />;
  }

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        refreshToken,
        isAuthenticated,
        handleSetTokens: setTokens,
        handleClearSession: clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
