export const BASE_URL = "http://localhost:8080";

export const BASE_QUERY_KEYS = {
  AUTH: ["auth"],
  ACCOUNTS: ["accounts"],
};

export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REFRESH: "/auth/refresh",
  },
  ACCOUNT: {
    PAGINATED: "/accounts",
    BY_ID: (id: number | string) => `/accounts/${id}`,
  },
};
