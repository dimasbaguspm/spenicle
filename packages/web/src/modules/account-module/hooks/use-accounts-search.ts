import { useMemo } from 'react';

import type { Account } from '../../../types/api';

export interface UseAccountsSearchResult {
  filteredAccounts: Account[];
}

export interface UseAccountsSearchOptions {
  accounts: Account[];
  searchQuery: string;
}

/**
 * Custom hook for handling account search functionality.
 *
 * Features:
 * - Searches account names and notes
 * - Case-insensitive search
 * - Trims whitespace from search query
 *
 * @param options - Configuration options for the search
 * @returns Filtered accounts based on search query
 */
export function useAccountsSearch({ accounts, searchQuery }: UseAccountsSearchOptions): UseAccountsSearchResult {
  return useMemo(() => {
    if (!searchQuery.trim()) {
      // No search - return all accounts
      return {
        filteredAccounts: accounts,
      };
    }

    const query = searchQuery.toLowerCase().trim();

    // Find all accounts that match the search (name or note)
    const matchingAccounts = accounts.filter(
      (account) =>
        (account.name?.toLowerCase().includes(query) ?? false) ||
        (account.note?.toLowerCase().includes(query) ?? false) ||
        (account.type?.toLowerCase().includes(query) ?? false)
    );

    return {
      filteredAccounts: matchingAccounts,
    };
  }, [accounts, searchQuery]);
}
