import type { AuthLoginResponseModel } from "@/types/schemas";

export interface AuthProviderModel {
  accessToken: AuthLoginResponseModel["access_token"] | null;
  refreshToken: AuthLoginResponseModel["refresh_token"] | null;
  isAuthenticated: boolean;
  handleSetTokens: (tokens: {
    access_token: string;
    refresh_token: string;
  }) => void;
  handleClearSession: () => void;
}
