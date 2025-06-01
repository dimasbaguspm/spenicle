import { CreditCard, Loader, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

import { Button, Modal } from '../../../../components';
import { useApiAccountsQuery, useApiDeleteAccountMutation } from '../../../../hooks/use-api/built-in/use-accounts';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router';
import { useSnack } from '../../../../providers/snack';
import type { Account } from '../../../../types/api';

import { AccountItem } from './account-item';

export function AccountList() {
  const [pagedAccounts, , { isLoading }] = useApiAccountsQuery();
  const [deleteAccount] = useApiDeleteAccountMutation();
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  const accounts = pagedAccounts?.items ?? [];

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
    await openDrawer('add-account');
  };

  const handleEditAccount = async (account: Account) => {
    await openDrawer('edit-account', { accountId: account.id });
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
      <div className="divide-y divide-slate-100">
        {accounts.map((account) => (
          <AccountItem
            key={account.id}
            account={account}
            isDeleting={deletingAccountId === account.id?.toString()}
            onEdit={handleEditAccount}
            onDelete={handleRemove}
          />
        ))}

        {accounts.length === 0 && (
          <div className="p-8 text-center">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">No accounts added yet</p>
            <Button variant="coral" onClick={handleAddAccount}>
              Add Your First Account
            </Button>
          </div>
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
