import { Badge, ButtonFloat, Icon } from '@dimasbaguspm/versaur/primitive';
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
    <ButtonFloat offset="5rem" size="sm" variant="outline" onClick={() => openDrawer(DRAWER_IDS.FILTER_TRANSACTION)}>
      <div className="relative ">
        <Icon as={Filter} size="md" color="ghost" />
        {activeFilterCount > 0 && (
          <Badge className="absolute top-[-0.5rem] right-[-0.5rem]" shape="rounded" size="sm">
            {activeFilterCount}
          </Badge>
        )}
      </div>
    </ButtonFloat>
  );
};
