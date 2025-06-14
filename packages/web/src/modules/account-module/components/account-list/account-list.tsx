import { Loader, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

import { Button, Modal } from '../../../../components';
import { DRAWER_IDS } from '../../../../constants/drawer-id';
import { useApiAccountsQuery, useApiDeleteAccountMutation } from '../../../../hooks/use-api/built-in/use-accounts';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router';
import { useSnack } from '../../../../providers/snack';
import type { Account } from '../../../../types/api';
import { useAccountsSearch } from '../../hooks';
import { AccountsEmptyState } from '../accounts-empty-state';
import { AccountsSearchEmptyState } from '../accounts-search-empty-state';

import { AccountItem } from './account-item';

export interface AccountListProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function AccountList({ searchQuery = '', onSearchChange }: AccountListProps) {
  const [pagedAccounts, , { isLoading }] = useApiAccountsQuery();
  const [deleteAccount] = useApiDeleteAccountMutation();
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  const accounts = pagedAccounts?.items ?? [];

  // Use the search hook to filter accounts
  const { filteredAccounts } = useAccountsSearch({
    accounts,
    searchQuery,
  });

  const { openDrawer } = useDrawerRouterProvider();
  const { success, error } = useSnack();

  const handleRemove = (account: Account) => {
    if (!account.id) return;

    setAccountToDelete(account);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!accountToDelete?.id) return;

    setDeletingAccountId(accountToDelete.id.toString());
    setShowConfirmModal(false);

    try {
      await deleteAccount({ accountId: accountToDelete.id });
      success(`Account "${accountToDelete.name}" removed successfully`);
    } catch {
      error(`Failed to remove account "${accountToDelete.name}"`);
    } finally {
      setDeletingAccountId(null);
      setAccountToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirmModal(false);
    setAccountToDelete(null);
  };

  const handleAddAccount = async () => {
    await openDrawer(DRAWER_IDS.ADD_ACCOUNT);
  };

  const handleEditAccount = async (account: Account) => {
    await openDrawer(DRAWER_IDS.EDIT_ACCOUNT, { accountId: account.id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-coral-600" />
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-mist-100">
        {/* Show filtered accounts */}
        {filteredAccounts.map((account) => (
          <AccountItem
            key={account.id}
            account={account}
            isDeleting={deletingAccountId === account.id?.toString()}
            onEdit={handleEditAccount}
            onDelete={handleRemove}
          />
        ))}

        {/* Empty state for no accounts */}
        {accounts.length === 0 && <AccountsEmptyState onAddAccount={handleAddAccount} />}

        {/* Empty state for search with no results */}
        {accounts.length > 0 && filteredAccounts.length === 0 && searchQuery && (
          <AccountsSearchEmptyState
            searchQuery={searchQuery}
            onClearSearch={() => onSearchChange?.('')}
            onAddAccount={handleAddAccount}
          />
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && accountToDelete && (
        <Modal onClose={cancelDelete} size="md" closeOnOverlayClick closeOnEscape>
          <Modal.Header>
            <Modal.Title>Confirm Account Deletion</Modal.Title>
            <Modal.CloseButton />
          </Modal.Header>
          <Modal.Content>
            <div className="flex items-start gap-3">
              <div className="text-red-600 mt-1">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-slate-900 font-medium mb-2">
                  Are you sure you want to remove "{accountToDelete.name}"?
                </p>
                <p className="text-slate-600 text-sm">
                  This action cannot be undone. All transaction data associated with this account will be permanently
                  deleted.
                </p>
              </div>
            </div>
          </Modal.Content>
          <Modal.Footer>
            <Button variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              disabled={deletingAccountId === accountToDelete.id?.toString()}
              busy={deletingAccountId === accountToDelete.id?.toString()}
            >
              {deletingAccountId === accountToDelete.id?.toString() ? 'Deleting...' : 'Delete Account'}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
}
