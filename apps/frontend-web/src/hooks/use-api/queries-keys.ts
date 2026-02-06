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
  ACCOUNT_STATISTICS: {
    BUDGET_HEALTH: (id: number, params: object = {}) => [
      ...BASE_QUERY_KEYS.ACCOUNTS,
      "statistics",
      "budget-health",
      id,
      JSON.stringify(params ?? {}),
    ],
    BURN_RATE: (id: number, params: object = {}) => [
      ...BASE_QUERY_KEYS.ACCOUNTS,
      "statistics",
      "burn-rate",
      id,
      JSON.stringify(params ?? {}),
    ],
    CASH_FLOW_PULSE: (id: number, params: object = {}) => [
      ...BASE_QUERY_KEYS.ACCOUNTS,
      "statistics",
      "cash-flow-pulse",
      id,
      JSON.stringify(params ?? {}),
    ],
    CATEGORY_HEATMAP: (id: number, params: object = {}) => [
      ...BASE_QUERY_KEYS.ACCOUNTS,
      "statistics",
      "category-heatmap",
      id,
      JSON.stringify(params ?? {}),
    ],
    MONTHLY_VELOCITY: (id: number, params: object = {}) => [
      ...BASE_QUERY_KEYS.ACCOUNTS,
      "statistics",
      "monthly-velocity",
      id,
      JSON.stringify(params ?? {}),
    ],
    TIME_FREQUENCY: (id: number, params: object = {}) => [
      ...BASE_QUERY_KEYS.ACCOUNTS,
      "statistics",
      "time-frequency",
      id,
      JSON.stringify(params ?? {}),
    ],
  },
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
  CATEGORY_STATISTICS: {
    ACCOUNT_DISTRIBUTION: (id: number, params: object = {}) => [
      ...BASE_QUERY_KEYS.CATEGORIES,
      "statistics",
      "account-distribution",
      id,
      JSON.stringify(params ?? {}),
    ],
    AVERAGE_TRANSACTION_SIZE: (id: number, params: object = {}) => [
      ...BASE_QUERY_KEYS.CATEGORIES,
      "statistics",
      "average-transaction-size",
      id,
      JSON.stringify(params ?? {}),
    ],
    BUDGET_UTILIZATION: (id: number, params: object = {}) => [
      ...BASE_QUERY_KEYS.CATEGORIES,
      "statistics",
      "budget-utilization",
      id,
      JSON.stringify(params ?? {}),
    ],
    DAY_OF_WEEK_PATTERN: (id: number, params: object = {}) => [
      ...BASE_QUERY_KEYS.CATEGORIES,
      "statistics",
      "day-of-week-pattern",
      id,
      JSON.stringify(params ?? {}),
    ],
    SPENDING_VELOCITY: (id: number, params: object = {}) => [
      ...BASE_QUERY_KEYS.CATEGORIES,
      "statistics",
      "spending-velocity",
      id,
      JSON.stringify(params ?? {}),
    ],
  },
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
  BUDGETS: {
    PAGINATED: (params: object = {}) => [
      ...BASE_QUERY_KEYS.BUDGETS,
      "paginated",
      JSON.stringify(params ?? {}),
    ],
    BY_ID: (id: number, params: object = {}) => [
      ...BASE_QUERY_KEYS.BUDGETS,
      "by-id",
      id,
      JSON.stringify(params ?? {}),
    ],
    RELATED: (templateId: number, params: object = {}) => [
      ...BASE_QUERY_KEYS.BUDGETS,
      "related",
      templateId,
      JSON.stringify(params ?? {}),
    ],
    GENERATED_BY_ID: (templateId: number, budgetId: number) => [
      ...BASE_QUERY_KEYS.BUDGETS,
      "generated",
      templateId,
      budgetId,
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
