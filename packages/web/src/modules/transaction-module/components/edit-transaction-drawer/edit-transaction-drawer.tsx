import { Trash2 } from 'lucide-react';
import { type FC, useState } from 'react';
import { Controller } from 'react-hook-form';

import { Drawer, TextInput, Select, TextArea, Button, IconButton, Modal, Segment } from '../../../../components';

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
    currencyOptions,
    typeOptions,
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
              name="accountId"
              control={control}
              rules={{ required: 'Account is required' }}
              render={({ field }) => (
                <Select
                  label="Account"
                  placeholder="Select an account"
                  options={accountOptions}
                  value={field.value?.toString() ?? ''}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                  errorText={errors.accountId?.message}
                />
              )}
            />

            <Controller
              name="type"
              control={control}
              rules={{ required: 'Transaction type is required' }}
              render={({ field }) => (
                <Segment
                  label="Type"
                  options={typeOptions}
                  value={field.value ?? 'expense'}
                  onValueChange={field.onChange}
                  errorText={errors.type?.message}
                  className="w-full"
                />
              )}
            />

            <Controller
              name="categoryId"
              control={control}
              rules={{ required: 'Category is required' }}
              render={({ field }) => (
                <Select
                  label="Category"
                  placeholder="Select a category"
                  options={categoryOptions}
                  value={field.value?.toString() ?? ''}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                  errorText={errors.categoryId?.message}
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
                <TextInput
                  label="Amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={field.value?.toString() ?? ''}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  errorText={errors.amount?.message}
                />
              )}
            />

            <Controller
              name="currency"
              control={control}
              rules={{
                required: 'Currency is required',
                pattern: {
                  value: /^[A-Z]{3}$/,
                  message: 'Currency must be 3 uppercase letters (e.g., USD, EUR)',
                },
              }}
              render={({ field }) => (
                <Select
                  label="Currency"
                  placeholder="Select currency"
                  options={currencyOptions}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  errorText={errors.currency?.message}
                />
              )}
            />

            <Controller
              name="date"
              control={control}
              rules={{ required: 'Date is required' }}
              render={({ field }) => (
                <TextInput
                  label="Date"
                  type="date"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  errorText={errors.date?.message}
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
