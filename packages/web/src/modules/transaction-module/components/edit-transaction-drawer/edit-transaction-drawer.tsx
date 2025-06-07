import { Trash2 } from 'lucide-react';
import { type FC, useState } from 'react';
import { Controller } from 'react-hook-form';

import {
  Drawer,
  Button,
  IconButton,
  Modal,
  DateTimePicker,
  AmountField,
  CategorySelector,
  TextArea,
} from '../../../../components';
import { AccountSelector } from '../../../../modules/account-module/components/account-selector';
import { TransactionTypeSelector } from '../transaction-type-selector/transaction-type-selector';

import type { EditTransactionDrawerProps } from './types';
import { useEditTransactionForm } from './use-edit-transaction-form.hook';

export const EditTransactionDrawer: FC<EditTransactionDrawerProps> = ({ transaction, onSuccess, onError }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const {
    handleSubmit,
    control,
    errors,
    onSubmit,
    onDelete,
    isPending,
    updateError,
    deleteError,
    closeDrawer,
    accountOptions,
    categoryOptions,
  } = useEditTransactionForm({ transaction, onSuccess, onError });

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteModal(false);
    void onDelete();
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  return (
    <Drawer onClose={closeDrawer} size="md">
      <Drawer.Header>
        <Drawer.Title>Edit Transaction</Drawer.Title>
        <Drawer.CloseButton />
      </Drawer.Header>

      <Drawer.Content>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            <Controller
              name="date"
              control={control}
              rules={{ required: 'Date is required' }}
              render={({ field }) => (
                <DateTimePicker
                  label="Date & Time"
                  value={field.value ? new Date(field.value) : undefined}
                  onChange={(date) => field.onChange(date?.toISOString())}
                  errorText={errors.date?.message}
                />
              )}
            />

            <Controller
              name="type"
              control={control}
              rules={{ required: 'Transaction type is required' }}
              render={({ field }) => (
                <TransactionTypeSelector
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  errorText={errors.type?.message}
                  disabled={isPending}
                  className="w-full"
                />
              )}
            />

            <Controller
              name="amount"
              control={control}
              rules={{
                required: 'Amount is required',
                min: {
                  value: 0.01,
                  message: 'Amount must be greater than 0',
                },
              }}
              render={({ field }) => (
                <AmountField
                  label="Amount"
                  value={field.value}
                  onChange={field.onChange}
                  errorText={errors.amount?.message}
                  disabled={isPending}
                  required
                />
              )}
            />

            <Controller
              name="categoryId"
              control={control}
              rules={{ required: 'Category is required' }}
              render={({ field }) => (
                <CategorySelector
                  label="Category"
                  placeholder="Select a category"
                  categories={categoryOptions}
                  value={categoryOptions.find((cat) => cat.id === field.value) ?? null}
                  onChange={(cat) => field.onChange(cat?.id ?? null)}
                  errorText={errors.categoryId?.message}
                  disabled={isPending}
                />
              )}
            />

            <Controller
              name="accountId"
              control={control}
              rules={{ required: 'Account is required' }}
              render={({ field }) => (
                <AccountSelector
                  label="Account"
                  placeholder="Select an account"
                  accounts={accountOptions}
                  value={accountOptions.find((acc) => acc.id === field.value) ?? null}
                  onChange={(acc) => field.onChange(acc?.id ?? null)}
                  errorText={errors.accountId?.message}
                  disabled={isPending}
                />
              )}
            />

            <Controller
              name="note"
              control={control}
              rules={{
                maxLength: {
                  value: 500,
                  message: 'Notes must be less than 500 characters',
                },
              }}
              render={({ field }) => (
                <TextArea
                  label="Notes"
                  placeholder="Add any notes about this transaction..."
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  helperText="Optional description for this transaction"
                  rows={3}
                  errorText={errors.note?.message}
                />
              )}
            />
          </div>

          {(updateError ?? deleteError) && (
            <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-md">
              <p className="text-sm text-danger-700">
                {updateError?.message ?? deleteError?.message ?? 'Failed to update transaction. Please try again.'}
              </p>
            </div>
          )}
        </form>
      </Drawer.Content>
      <Drawer.Footer>
        <div className="flex gap-3 justify-between">
          <IconButton
            variant="ghost"
            onClick={handleDeleteClick}
            disabled={isPending}
            className="text-danger-600 hover:bg-danger-50"
          >
            <Trash2 className="h-4 w-4" />
          </IconButton>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={closeDrawer}>
              Cancel
            </Button>
            <Button type="submit" variant="default" onClick={handleSubmit(onSubmit)} disabled={isPending}>
              {isPending ? 'Updating...' : 'Update Transaction'}
            </Button>
          </div>
        </div>
      </Drawer.Footer>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <Modal onClose={handleDeleteCancel} size="sm" closeOnOverlayClick closeOnEscape>
          <Modal.Header>
            <Modal.Title>Delete Transaction</Modal.Title>
            <Modal.CloseButton />
          </Modal.Header>
          <Modal.Content>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  This transaction will be permanently deleted and cannot be recovered
                </p>
              </div>
            </div>
          </Modal.Content>
          <Modal.Footer>
            <div className="flex gap-3 justify-center">
              <Button type="button" variant="secondary" onClick={handleDeleteCancel}>
                Cancel
              </Button>
              <Button type="button" variant="danger" onClick={handleDeleteConfirm} disabled={isPending}>
                {isPending ? 'Deleting...' : 'Delete Transaction'}
              </Button>
            </div>
          </Modal.Footer>
        </Modal>
      )}
    </Drawer>
  );
};
