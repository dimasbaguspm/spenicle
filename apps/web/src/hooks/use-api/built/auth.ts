import type {
  AuthLoginRequestModel,
  AuthLoginResponseModel,
  AuthRefreshTokenRequestModel,
  AuthRefreshTokenResponseModel,
} from "@/types/schemas";
import { useQueryClient } from "@tanstack/react-query";

import { ENDPOINTS } from "../constant";
import { useApiMutate } from "../base/use-api-mutate";
import { useSessionProvider } from "@/providers/session-provider";

export const useApiLogin = () => {
  const queryClient = useQueryClient();
  const { browserSession } = useSessionProvider();

  return useApiMutate<AuthLoginResponseModel, AuthLoginRequestModel>({
    path: ENDPOINTS.AUTH.LOGIN,
    method: "POST",
    onSuccess: (data) => {
      browserSession.setTokens(data);

      queryClient.invalidateQueries({
        queryKey: ["auth"],
        exact: false,
      });
    },
  });
};

export const useApiRefreshToken = () => {
  const queryClient = useQueryClient();
  const { browserSession } = useSessionProvider();

  return useApiMutate<
    AuthRefreshTokenResponseModel,
    AuthRefreshTokenRequestModel
  >({
    path: ENDPOINTS.AUTH.REFRESH,
    method: "POST",
    onSuccess: (data) => {
      if (!browserSession.refreshToken) return;
      browserSession.setTokens({
        refresh_token: browserSession.refreshToken,
        ...data,
      });

      queryClient.invalidateQueries({
        queryKey: ["auth"],
        exact: false,
      });
    },
  });
};
