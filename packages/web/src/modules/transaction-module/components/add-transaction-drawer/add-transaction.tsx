import { type FC } from 'react';
import { Controller } from 'react-hook-form';

import { Drawer, TextInput, Select, TextArea, Button, Segment } from '../../../../components';

import { useAddTransactionForm } from './use-add-transaction-form.hook';

export const AddTransactionDrawer: FC = () => {
  const {
    handleSubmit,
    control,
    errors,
    onSubmit,
    isPending,
    createError,
    closeDrawer,
    accountOptions,
    categoryOptions,
    currencyOptions,
    typeOptions,
  } = useAddTransactionForm();

  return (
    <Drawer onClose={closeDrawer} size="md">
      <Drawer.Header>
        <Drawer.Title>Add Transaction</Drawer.Title>
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
                  label="Transaction Type"
                  options={typeOptions}
                  value={field.value ?? ''}
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

          {createError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">
                {createError?.message ?? 'Failed to create transaction. Please try again.'}
              </p>
            </div>
          )}
        </form>
      </Drawer.Content>
      <Drawer.Footer>
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={closeDrawer}>
            Cancel
          </Button>
          <Button type="submit" variant="default" onClick={handleSubmit(onSubmit)} disabled={isPending}>
            {isPending ? 'Creating...' : 'Create Transaction'}
          </Button>
        </div>
      </Drawer.Footer>
    </Drawer>
  );
};
