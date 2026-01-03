import type { AuthLoginResponseModel } from "@/types/schemas";

export interface AuthProviderModel {
  accessToken: AuthLoginResponseModel["access_token"] | null;
  refreshToken: AuthLoginResponseModel["refresh_token"] | null;
  isAuthenticated: boolean;
  setTokens: (data: AuthLoginResponseModel) => void;
  clearAuth: () => void;
}
