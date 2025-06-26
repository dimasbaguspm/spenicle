import { Filter } from 'lucide-react';
import React from 'react';

import { DRAWER_IDS } from '../../../../constants/drawer-id';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router';
import { useTransactionFilters } from '../../hooks/use-transaction-filters';

/**
 * Entry point for the transaction filter UI in the transaction list page.
 * Shows a filter button and a summary of active filters.
 */
export const TransactionFilterEntry: React.FC = () => {
  const { openDrawer } = useDrawerRouterProvider();
  const filters = useTransactionFilters();

  const activeFilterCount = Object.entries(filters).filter(([, value]) => value !== undefined && value !== null).length;

  return (
    <div className="sticky w-full bottom-20 left-0 right-0 translate-y-0 flex justify-center items-center z-3 pointer-events-none">
      <div className="pointer-events-auto flex gap-1">
        <button
          className="flex items-center gap-2 rounded-full bg-white shadow-md border border-coral-200 px-5 py-2 text-coral-700 font-semibold focus:outline-none focus:ring-2 focus:ring-coral-400"
          aria-label={`Open filter options${activeFilterCount ? `, ${activeFilterCount} filters applied` : ''}`}
          onClick={() => openDrawer(DRAWER_IDS.FILTER_TRANSACTION)}
        >
          <Filter className="h-5 w-5" />
          Filter
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-coral-100 text-coral-700 text-xs font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
