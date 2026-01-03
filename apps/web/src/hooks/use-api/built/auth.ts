import type {
  AuthLoginRequestModel,
  AuthLoginResponseModel,
  AuthRefreshTokenRequestModel,
  AuthRefreshTokenResponseModel,
} from "@/types/schemas";
import { useQueryClient } from "@tanstack/react-query";

import { ENDPOINTS } from "../constant";
import { useApiMutate } from "../base/use-api-mutate";
import { useSession } from "@/hooks/use-session";

export const useApiLogin = () => {
  const queryClient = useQueryClient();
  const { setTokens } = useSession();

  return useApiMutate<AuthLoginResponseModel, AuthLoginRequestModel>({
    path: ENDPOINTS.AUTH.LOGIN,
    method: "POST",
    onSuccess: (data) => {
      // Store access token in memory (context) and refresh token in localStorage
      setTokens(data);

      // Optionally invalidate auth-related queries
      queryClient.invalidateQueries({
        queryKey: ["auth"],
        exact: false,
      });
    },
  });
};

export const useApiRefreshToken = () => {
  const queryClient = useQueryClient();
  const { refreshToken, setTokens } = useSession();

  return useApiMutate<
    AuthRefreshTokenResponseModel,
    AuthRefreshTokenRequestModel
  >({
    path: ENDPOINTS.AUTH.REFRESH,
    method: "POST",
    onSuccess: (data) => {
      if (!refreshToken) return;
      setTokens({ refresh_token: refreshToken, ...data });

      queryClient.invalidateQueries({
        queryKey: ["auth"],
        exact: false,
      });
    },
  });
};
