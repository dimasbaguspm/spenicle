// filepath: packages/web/src/modules/transaction-module/hooks/use-transaction-filters.ts
import { useLocation } from '@tanstack/react-router';

/**
 * Custom hook to extract transaction filter params from the URL search params.
 * Returns an object with the correct types for use in transaction queries.
 */
export const useTransactionFilters = () => {
  return useLocation({
    select: ({ search }) => ({
      accountId: search.accountId ? +search.accountId : undefined,
      categoryId: search.categoryId ? +search.categoryId : undefined,
      type: search.type ?? undefined,
      isHighlighted: typeof search.isHighlighted !== 'undefined' ? Boolean(search.isHighlighted) : undefined,
    }),
  });
};
