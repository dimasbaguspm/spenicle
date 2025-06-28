import { CreditCard, Plus } from 'lucide-react';

import { Button } from '../../../../components';

export interface AccountsEmptyStateProps {
  onAddAccount: () => void;
}

export function AccountsEmptyState({ onAddAccount }: AccountsEmptyStateProps) {
  return (
    <div className="p-12 text-center">
      <div className="w-16 h-16 bg-mist-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CreditCard className="w-8 h-8 text-mist-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">No payment methods yet</h3>
      <p className="text-slate-600 mb-6 max-w-sm mx-auto">
        Payment methods help you track your finances across different sources like wallets, cards, and bank accounts.
        Create your first payment method to get started.
      </p>
      <Button variant="coral" onClick={onAddAccount} className="inline-flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Add Your First Payment Method
      </Button>
    </div>
  );
}
