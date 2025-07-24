import { TimePickerInput, DateSinglePickerInput, CalculatorInput, TextAreaInput } from '@dimasbaguspm/versaur/forms';
import { Drawer } from '@dimasbaguspm/versaur/overlays';
import { Button, ButtonIcon, Text } from '@dimasbaguspm/versaur/primitive';
import dayjs from 'dayjs';
import { X } from 'lucide-react';
import { type FC } from 'react';
import { Controller } from 'react-hook-form';

import { CategorySelector } from '../../../../components';
import { DRAWER_IDS } from '../../../../constants/drawer-id';
import { AccountSelector } from '../../../../modules/account-module/components/account-selector';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router';
import type { Category } from '../../../../types/api';
import { TransactionTypeSelector } from '../transaction-type-selector';

import { useAddTransactionForm } from './use-add-transaction-form.hook';

export const AddTransactionDrawer: FC = () => {
  const { closeDrawer, drawerId } = useDrawerRouterProvider();
  const { handleSubmit, control, errors, onSubmit, isPending, accountOptions, categoryOptions } =
    useAddTransactionForm();

  const handleCloseDrawer = () => {
    closeDrawer();
  };

  return (
    <Drawer isOpen={drawerId === DRAWER_IDS.CREATE_TRANSACTION} onClose={handleCloseDrawer} size="md">
      <Drawer.Header className="flex items-center justify-between">
        <Text as="h3" fontSize="lg" fontWeight="semibold">
          Add Transaction
        </Text>
        <ButtonIcon as={X} variant="ghost" onClick={handleCloseDrawer} aria-label="Close drawer" />
      </Drawer.Header>

      <Drawer.Body>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            <Controller
              name="date"
              control={control}
              rules={{ required: 'Date is required' }}
              render={({ field }) => (
                <DateSinglePickerInput
                  label="Date"
                  type="modal"
                  value={field.value ? new Date(field.value) : undefined}
                  onChange={(date) => field.onChange(date?.toISOString())}
                  error={errors.date?.message}
                />
              )}
            />

            <Controller
              name="time"
              control={control}
              rules={{ required: 'Time is required' }}
              render={({ field }) => (
                <TimePickerInput
                  label="Time"
                  value={field.value ? field.value : dayjs().format('HH:mm A')}
                  onChange={(date) => field.onChange(date)}
                  error={errors.time?.message}
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
                <CalculatorInput
                  label="Amount"
                  placeholder="Enter amount"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={errors.amount?.message}
                  disabled={isPending}
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
                  onChange={(acc) => field.onChange(Array.isArray(acc) ? acc[0].id! : (acc?.id ?? null))}
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
                <TextAreaInput
                  label="Notes"
                  placeholder="Add any notes about this transaction..."
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  helperText="Optional description for this transaction"
                  fieldSizing="content"
                  error={errors.note?.message}
                />
              )}
            />
          </div>
        </form>
      </Drawer.Body>
      <Drawer.Footer>
        <Button type="button" variant="ghost" onClick={closeDrawer}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" onClick={handleSubmit(onSubmit)} disabled={isPending}>
          {isPending ? 'Creating...' : 'Create'}
        </Button>
      </Drawer.Footer>
    </Drawer>
  );
};
