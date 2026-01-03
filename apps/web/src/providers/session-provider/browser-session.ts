import type { AuthLoginResponseModel } from "@/types/schemas";

export class BrowserSession {
  private readonly ACCESS_TOKEN_KEY = "spenicle_access_token";
  private readonly REFRESH_TOKEN_KEY = "spenicle_refresh_token";

  public accessToken: string | null = this.getAccessToken();
  public refreshToken: string | null = this.getRefreshToken();

  getAccessToken(): string | null {
    return sessionStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  setAccessToken(token: string | null) {
    if (token) {
      sessionStorage.setItem(this.ACCESS_TOKEN_KEY, token);
      this.accessToken = token;
    } else {
      sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
      this.accessToken = null;
    }
    this.emitChange();
  }

  setRefreshToken(token: string | null) {
    if (token) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
      this.refreshToken = token;
    } else {
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      this.refreshToken = null;
    }
    this.emitChange();
  }

  setTokens(tokens: AuthLoginResponseModel) {
    if (tokens.access_token) {
      this.setAccessToken(tokens.access_token);
    }
    if (tokens.refresh_token) {
      this.setRefreshToken(tokens.refresh_token);
    }
  }

  clearSession() {
    sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
    this.accessToken = null;
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    this.refreshToken = null;
    this.emitChange();
  }

  subscribe(callback: () => void): () => void {
    window.addEventListener("storage", callback);
    window.addEventListener("session-change", callback);

    return () => {
      window.removeEventListener("storage", callback);
      window.removeEventListener("session-change", callback);
    };
  }

  private emitChange() {
    window.dispatchEvent(new Event("session-change"));
  }
}

export const browserSession = new BrowserSession();
