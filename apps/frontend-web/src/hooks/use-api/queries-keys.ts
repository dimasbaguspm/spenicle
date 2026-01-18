import { BASE_QUERY_KEYS } from "./constant";

export const QUERY_KEYS = {
  ACCOUNT_INFINITE: (params: object = {}) => [
    ...BASE_QUERY_KEYS.ACCOUNTS,
    "infinite",
    JSON.stringify(params ?? {}),
  ],
  ACCOUNT_PAGINATED: (params: object = {}) => [
    ...BASE_QUERY_KEYS.ACCOUNTS,
    "paginated",
    JSON.stringify(params ?? {}),
  ],
  ACCOUNT_BY_ID: (id: number, params: object = {}) => [
    ...BASE_QUERY_KEYS.ACCOUNTS,
    "by-id",
    id,
    JSON.stringify(params ?? {}),
  ],
  CATEGORY_INFINITE: (params: object = {}) => [
    ...BASE_QUERY_KEYS.CATEGORIES,
    "infinite",
    JSON.stringify(params ?? {}),
  ],
  CATEGORY_PAGINATED: (params: object = {}) => [
    ...BASE_QUERY_KEYS.CATEGORIES,
    "paginated",
    JSON.stringify(params ?? {}),
  ],
  CATEGORY_BY_ID: (id: number, params: object = {}) => [
    ...BASE_QUERY_KEYS.CATEGORIES,
    "by-id",
    id,
    JSON.stringify(params ?? {}),
  ],
  TRANSACTIONS: {
    INFINITE: (params: object = {}) => [
      ...BASE_QUERY_KEYS.TRANSACTIONS,
      "infinite",
      JSON.stringify(params ?? {}),
    ],
    PAGINATED: (params: object = {}) => [
      ...BASE_QUERY_KEYS.TRANSACTIONS,
      "paginated",
      JSON.stringify(params ?? {}),
    ],
    BY_ID: (id: number, params: object = {}) => [
      ...BASE_QUERY_KEYS.TRANSACTIONS,
      "by-id",
      id,
      JSON.stringify(params ?? {}),
    ],
  },
  TRANSACTION_TEMPLATES: {
    INFINITE: (params: object = {}) => [
      ...BASE_QUERY_KEYS.TRANSACTION_TEMPLATES,
      "infinite",
      JSON.stringify(params ?? {}),
    ],
    PAGINATED: (params: object = {}) => [
      ...BASE_QUERY_KEYS.TRANSACTION_TEMPLATES,
      "paginated",
      JSON.stringify(params ?? {}),
    ],
    BY_ID: (id: number, params: object = {}) => [
      ...BASE_QUERY_KEYS.TRANSACTION_TEMPLATES,
      "by-id",
      id,
      JSON.stringify(params ?? {}),
    ],
  },
  INSIGHTS: {
    ACCOUNTS_SUMMARY: (params: object = {}) => [
      ...BASE_QUERY_KEYS.INSIGHTS,
      "accounts-summary",
      JSON.stringify(params ?? {}),
    ],
    CATEGORIES_SUMMARY: (params: object = {}) => [
      ...BASE_QUERY_KEYS.INSIGHTS,
      "categories-summary",
      JSON.stringify(params ?? {}),
    ],
    TRANSACTIONS_SUMMARY: (params: object = {}) => [
      ...BASE_QUERY_KEYS.INSIGHTS,
      "transactions-summary",
      JSON.stringify(params ?? {}),
    ],
    TOTAL_SUMMARY: (params: object = {}) => [
      ...BASE_QUERY_KEYS.INSIGHTS,
      "total-summary",
      JSON.stringify(params ?? {}),
    ],
  },
};
