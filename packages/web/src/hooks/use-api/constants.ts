export const BASE_URL = process.env.BASE_URL;

// Helper function to create consistent query keys with parameters
const createQueryKey = (options?: {
  entity: string;
  type: 'list' | 'infinite' | 'single';
  id?: string | number;
  params?: unknown;
}) => {
  const { entity, type, id, params } = options ?? {};

  const baseKey = [entity, type];

  if (id !== undefined) {
    baseKey.push(String(id));
  }

  if (params && typeof params === 'object' && params !== null && Object.keys(params).length > 0) {
    // Sort params to ensure consistent key generation
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = (params as Record<string, unknown>)[key];
          return acc;
        },
        {} as Record<string, unknown>
      );

    baseKey.push(JSON.stringify(sortedParams));
  }

  return baseKey;
};

export const QUERY_KEYS = {
  // Users
  USERS: {
    all: () => ['users'],
    current: () => createQueryKey({ entity: 'users', type: 'single', id: 'current' }),
  },

  // Groups
  GROUPS: {
    all: () => ['groups'],
    single: (id: string | number) => createQueryKey({ entity: 'groups', type: 'single', id }),
    users: (groupId: string | number) =>
      createQueryKey({ entity: 'groups', type: 'list', id: groupId, params: { subResource: 'users' } }),
  },

  // Accounts
  ACCOUNTS: {
    all: () => ['accounts'],
    list: (params?: unknown) => createQueryKey({ entity: 'accounts', type: 'list', params }),
    infinite: (params?: unknown) => createQueryKey({ entity: 'accounts', type: 'infinite', params }),
    single: (id: number) => createQueryKey({ entity: 'accounts', type: 'single', id }),
  },

  // Categories
  CATEGORIES: {
    all: () => ['categories'],
    list: (params?: unknown) => createQueryKey({ entity: 'categories', type: 'list', params }),
    infinite: (params?: unknown) => createQueryKey({ entity: 'categories', type: 'infinite', params }),
    single: (id: number) => createQueryKey({ entity: 'categories', type: 'single', id }),
    transactions: (categoryId: number, params?: unknown) => {
      const combinedParams =
        params && typeof params === 'object'
          ? { subResource: 'transactions', ...params }
          : { subResource: 'transactions' };

      return createQueryKey({
        entity: 'categories',
        type: 'list',
        id: categoryId,
        params: combinedParams,
      });
    },
  },

  // Transactions
  TRANSACTIONS: {
    all: () => ['transactions'],
    list: (params?: unknown) => createQueryKey({ entity: 'transactions', type: 'list', params }),
    infinite: (params?: unknown) => createQueryKey({ entity: 'transactions', type: 'infinite', params }),
    single: (id: number) => createQueryKey({ entity: 'transactions', type: 'single', id }),
  },

  // Account Limits
  ACCOUNT_LIMITS: {
    all: () => ['account-limits'],
    list: (accountId: number, params?: unknown) =>
      createQueryKey({
        entity: 'account-limits',
        type: 'list',
        id: accountId,
        params: { ...(params ?? {}), accountId },
      }),
    infinite: (accountId: number, params?: unknown) =>
      createQueryKey({
        entity: 'account-limits',
        type: 'infinite',
        id: accountId,
        params: { ...(params ?? {}), accountId },
      }),
    single: (accountId: number, limitId: number) =>
      createQueryKey({
        entity: 'account-limits',
        type: 'single',
        id: `${accountId}/${limitId}`,
      }),
  },

  // Recurrences
  RECURRENCES: {
    all: () => ['recurrences'],
    list: (params?: unknown) =>
      createQueryKey({
        entity: 'recurrences',
        type: 'list',
        params,
      }),
    infinite: (params?: unknown) =>
      createQueryKey({
        entity: 'recurrences',
        type: 'infinite',
        params,
      }),
    single: (id: number) =>
      createQueryKey({
        entity: 'recurrences',
        type: 'single',
        id,
      }),
  },

  // Auth
  AUTH: {
    all: () => ['auth'],
  },

  // Summary
  SUMMARY: {
    all: () => ['summary'],
    get: (params?: unknown) =>
      createQueryKey({
        entity: 'summary',
        type: 'single',
        params,
      }),
  },

  // Health
  HEALTH: {
    all: () => ['health'],
    status: () =>
      createQueryKey({
        entity: 'health',
        type: 'single',
        id: 'status',
      }),
    info: () =>
      createQueryKey({
        entity: 'health',
        type: 'single',
        id: 'info',
      }),
  },
} as const;
