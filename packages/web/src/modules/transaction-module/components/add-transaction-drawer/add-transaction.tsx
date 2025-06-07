import { type FC } from 'react';
import { Controller } from 'react-hook-form';

import { Drawer, TextArea, Button, DateTimePicker, AmountField, CategorySelector } from '../../../../components';
import { AccountSelector } from '../../../../modules/account-module/components/account-selector';
import type { Account, Category } from '../../../../types/api';
import { TransactionTypeSelector } from '../transaction-type-selector';

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
                  value={categoryOptions.find((cat: Category) => cat.id === field.value) ?? null}
                  onChange={(cat: Category | null) => field.onChange(cat?.id ?? null)}
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
                  onChange={(acc: Account | null) => field.onChange(acc?.id ?? null)}
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
