import { Trash2, AlertTriangle } from 'lucide-react';
import type { FC } from 'react';

import { Button, Modal } from '../../../../components';
import type { Account } from '../../../../types/api';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  account: Account | null;
  isDeleting?: boolean;
}

/**
 * DeleteAccountModal handles the confirmation dialog for deleting accounts.
 * Displays account details and warns about permanent deletion.
 */
export const DeleteAccountModal: FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  account,
  isDeleting = false,
}) => {
  if (!account || !isOpen) return null;

  return (
    <Modal onClose={onClose} size="sm" closeOnOverlayClick closeOnEscape>
      <Modal.Header>
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger-100">
            <Trash2 className="h-5 w-5 text-danger-600" />
          </div>
          <div>
            <Modal.Title>Delete Account</Modal.Title>
            <Modal.Description>This action cannot be undone</Modal.Description>
          </div>
        </div>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Content>
        <div className="space-y-4">
          {/* warning message */}
          <div className="flex items-start space-x-3 p-3 bg-danger-50 border border-danger-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-danger-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-danger-800">Permanent deletion</p>
              <p className="text-danger-700 mt-1">
                This will permanently delete the account and remove all associated data. This action cannot be undone.
              </p>
            </div>
          </div>

          {/* account details */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-900">Account to delete:</p>
            <div className="p-3 bg-slate-50 rounded-lg border">
              <div className="space-y-1">
                <p className="font-medium text-slate-900">{account.name}</p>
                {account.type && (
                  <p className="text-sm text-slate-600 capitalize">{account.type.toLowerCase()} account</p>
                )}
              </div>
            </div>
          </div>

          {/* confirmation text */}
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this account? All transactions and data associated with this account will be
            permanently removed.
          </p>
        </div>
      </Modal.Content>

      <Modal.Footer>
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} busy={isDeleting} iconLeft={<Trash2 className="h-4 w-4" />}>
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};
