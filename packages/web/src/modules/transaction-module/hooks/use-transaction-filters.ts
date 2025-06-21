import { useLocation } from '@tanstack/react-router';

/**
 * Custom hook to extract transaction filter params from the URL search params.
 * Returns an object with the correct types for use in transaction queries.
 */
export const useTransactionFilters = () => {
  return useLocation({
    select: ({ search }) => ({
      accountIds: (search.accountIds
        ? Array.isArray(search.accountIds)
          ? search.accountIds
          : [search.accountIds]
        : undefined) as number[] | undefined,
      categoryIds: (search.categoryIds
        ? Array.isArray(search.categoryIds)
          ? search.categoryIds
          : [+search.categoryIds]
        : undefined) as number[] | undefined,
      types: (search.types ? (Array.isArray(search.types) ? search.types : [search.types]) : undefined) as
        | ('expense' | 'income' | 'transfer')[]
        | undefined,
    }),
  });
};
