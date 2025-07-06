import { useNavigate } from '@tanstack/react-router';
import { Filter, RotateCcw } from 'lucide-react';
import { type FC } from 'react';

import { Tile, Button } from '../../../../components';
import { useTransactionFilters } from '../../hooks/use-transaction-filters';
import { TransactionFilterInline } from '../transaction-filter-inline';

interface DesktopTransactionPeriodSidebarProps {
  className?: string;
}

export const DesktopTransactionPeriodSidebar: FC<DesktopTransactionPeriodSidebarProps> = ({ className }) => {
  const filters = useTransactionFilters();
  const navigate = useNavigate();

  const hasActiveFilters = Boolean(
    (filters.accountIds ?? []).length > 0 || (filters.categoryIds ?? []).length > 0 || (filters.types ?? []).length > 0
  );

  const handleClearAllFilters = async () => {
    await navigate({
      to: '/transactions/period',
      replace: true,
      resetScroll: false,
      // @ts-expect-error an error from the types, but it works
      search: (prev) => ({
        ...prev,
        accountIds: undefined,
        categoryIds: undefined,
        types: undefined,
      }),
    });
  };

  return (
    <div
      className={`col-span-3 space-y-4 sticky top-6 self-start max-h-[calc(100vh-10rem)] overflow-y-auto ${className ?? ''}`}
    >
      {/* filters only */}
      <Tile className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-600" />
              <h3 className="text-sm font-medium text-slate-700">Filters</h3>
            </div>
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearAllFilters}
                className="p-1 h-auto text-xs text-slate-500 hover:text-coral-600"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>

          <TransactionFilterInline />
        </div>
      </Tile>
    </div>
  );
};
