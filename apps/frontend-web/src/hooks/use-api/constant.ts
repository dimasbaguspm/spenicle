export const BASE_URL =
  process.env.NODE_ENV === "production" ? "/api" : "http://localhost:8080";

export const BASE_QUERY_KEYS = {
  AUTH: ["auth"],
  ACCOUNTS: ["accounts"],
  CATEGORIES: ["categories"],
  TRANSACTIONS: ["transactions"],
  TRANSACTION_TEMPLATES: ["transaction-templates"],
  INSIGHTS: ["insights"],
};

export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REFRESH: "/auth/refresh",
  },
  ACCOUNT: {
    PAGINATED: "/accounts",
    BY_ID: (id: number | string) => `/accounts/${id}`,
    REORDER: "/accounts/reorder",
  },
  CATEGORIES: {
    PAGINATED: "/categories",
    BY_ID: (id: number | string) => `/categories/${id}`,
    REORDER: "/categories/reorder",
  },
  TRANSACTIONS: {
    PAGINATED: "/transactions",
    BY_ID: (id: number | string) => `/transactions/${id}`,
    BY_ID_RELATIONS: (id: number | string) => `/transactions/${id}/relations`,
    BY_ID_RELATIONS_DETAIL: (
      id: number | string,
      relationId: number | string,
    ) => `/transactions/${id}/relations/${relationId}`,
    BY_ID_TAGS: (id: number | string) => `/transactions/${id}/tags`,
  },
  TRANSACTION_TEMPLATES: {
    PAGINATED: "/transaction-templates",
    BY_ID: (id: number | string) => `/transaction-templates/${id}`,
  },
  INSIGHTS: {
    ACCOUNTS_SUMMARY: "/summary/accounts",
    CATEGORIES_SUMMARY: "/summary/categories",
    TRANSACTIONS_SUMMARY: "/summary/transactions",
  },
  TAGS: {
    PAGINATED: "/tags",
    BY_ID: (id: number | string) => `/tags/${id}`,
  },
  BUDGETS: {
    PAGINATED: "/budgets",
    BY_ID: (id: number | string) => `/budgets/${id}`,
  },
  BUDGET_TEMPLATES: {
    PAGINATED: "/budgets/templates",
    BY_ID: (id: number | string) => `/budgets/templates/${id}`,
  },
};
