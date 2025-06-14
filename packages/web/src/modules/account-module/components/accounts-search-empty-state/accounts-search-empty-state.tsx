import { Search, Plus } from 'lucide-react';

import { Button } from '../../../../components';

export interface AccountsSearchEmptyStateProps {
  searchQuery: string;
  onClearSearch: () => void;
  onAddAccount: () => void;
}

export function AccountsSearchEmptyState({ searchQuery, onClearSearch, onAddAccount }: AccountsSearchEmptyStateProps) {
  return (
    <div className="p-12 text-center">
      <div className="w-16 h-16 bg-mist-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Search className="w-8 h-8 text-mist-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">No accounts found</h3>
      <p className="text-slate-600 mb-6 max-w-sm mx-auto">
        We couldn't find any accounts matching "{searchQuery}". Try adjusting your search or create a new account.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="mist-outline" onClick={onClearSearch}>
          Clear Search
        </Button>
        <Button variant="coral" onClick={onAddAccount} className="inline-flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Account
        </Button>
      </div>
    </div>
  );
}
