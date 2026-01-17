export const BASE_URL =
  process.env.NODE_ENV === "production" ? "/api" : "http://localhost:8080";

export const BASE_QUERY_KEYS = {
  AUTH: ["auth"],
  ACCOUNTS: ["accounts"],
  CATEGORIES: ["categories"],
  TRANSACTIONS: ["transactions"],
  TRANSACTIONS_TEMPLATES: ["transactions-templates"],
  INSIGHTS: ["insights"],
};

export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REFRESH: "/auth/refresh",
  },
  ACCOUNT: {
    PAGINATED: "/accounts",
    REORDER: "/accounts/reorder",
    BY_ID: (id: number | string) => `/accounts/${id}`,
    BY_ID_BUDGETS: (id: number | string) => `/accounts/${id}/budgets`,
    BY_ID_BUDGETS_DETAIL: (id: number | string, budgetId: number | string) =>
      `/accounts/${id}/budgets/${budgetId}`,
  },
  CATEGORIES: {
    PAGINATED: "/categories",
    REORDER: "/categories/reorder",
    BY_ID: (id: number | string) => `/categories/${id}`,
    BY_ID_BUDGETS: (id: number | string) => `/categories/${id}/budgets`,
    BY_ID_BUDGETS_DETAIL: (id: number | string, budgetId: number | string) =>
      `/categories/${id}/budgets/${budgetId}`,
  },
  TRANSACTIONS: {
    PAGINATED: "/transactions",
    BY_ID: (id: number | string) => `/transactions/${id}`,
    BY_ID_RELATIONS: (id: number | string) => `/transactions/${id}/relations`,
    BY_ID_RELATIONS_DETAIL: (
      id: number | string,
      relationId: number | string
    ) => `/transactions/${id}/relations/${relationId}`,
    BY_ID_TAGS: (id: number | string) => `/transactions/${id}/tags`,
  },
  TRANSACTIONS_TEMPLATES: {
    PAGINATED: "/transactions/templates",
    BY_ID: (id: number | string) => `/transactions/templates/${id}`,
  },
  INSIGHTS: {
    ACCOUNTS_SUMMARY: "/summary/accounts",
    ACCOUNTS_SPENDING_TRENDS: "/summary/accounts/trends",
    CATEGORIES_SUMMARY: "/summary/categories",
    CATEGORIES_SPENDING_TRENDS: "/summary/categories/trends",
    TRANSACTIONS_SUMMARY: "/summary/transactions",
    TAGS_SUMMARY: "/summary/tags",
    TOTAL_SUMMARY: "/summary/total",
  },
};
