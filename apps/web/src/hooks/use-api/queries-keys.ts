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
};
