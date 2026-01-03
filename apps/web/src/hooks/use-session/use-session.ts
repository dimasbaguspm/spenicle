import type { AuthLoginResponseModel } from "@/types/schemas";
import { useSyncExternalStore } from "react";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

// Storage change subscription using native storage event
const subscribe = (callback: () => void) => {
  // Listen to storage events (fired when localStorage changes in other tabs)
  window.addEventListener("storage", callback);
  // Listen to custom event for same-tab updates
  window.addEventListener("session-change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("session-change", callback);
  };
};

const emitChange = () => {
  window.dispatchEvent(new Event("session-change"));
};

export const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setAccessToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
  emitChange();
};

export const setRefreshToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
  emitChange();
};

export const setTokens = (tokens: AuthLoginResponseModel) => {
  if (tokens.access_token) {
    setAccessToken(tokens.access_token);
  }
  if (tokens.refresh_token) {
    setRefreshToken(tokens.refresh_token);
  }
};

export const clearSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  emitChange();
};

/**
 * React hook that syncs with localStorage for session tokens
 */
export const useSession = () => {
  const accessToken = useSyncExternalStore(subscribe, getAccessToken);
  const refreshToken = useSyncExternalStore(subscribe, getRefreshToken);

  return {
    accessToken,
    refreshToken,
    setAccessToken,
    setRefreshToken,
    setTokens,
    clearSession,
  };
};
