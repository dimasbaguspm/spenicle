import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';

import {
  useApiUpdateTransactionMutation,
  useApiDeleteTransactionMutation,
  useApiAccountsQuery,
  useApiCategoriesQuery,
} from '../../../../hooks';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router/context';
import { useSnack } from '../../../../providers/snack';

import {
  getDefaultFormValues,
  VALIDATION_RULES,
  CURRENCY_OPTIONS,
  TRANSACTION_TYPE_OPTIONS,
  transformToTransactionData,
  validateFormData,
} from './helpers';
import type { EditTransactionFormData, EditTransactionDrawerProps } from './types';

/**
 * Custom hook for managing edit transaction drawer form state and logic
 */
export const useEditTransactionForm = ({ transaction, onSuccess, onError }: EditTransactionDrawerProps) => {
  const { closeDrawer } = useDrawerRouterProvider();
  const { success, error: showError } = useSnack();

  // API queries and mutations
  const [accountsData] = useApiAccountsQuery();
  const [categoriesData] = useApiCategoriesQuery();
  const [updateTransaction, updateError, updateStates] = useApiUpdateTransactionMutation();
  const [deleteTransaction, deleteError, deleteStates] = useApiDeleteTransactionMutation();

  const isPending = updateStates.isPending || deleteStates.isPending;

  // Form setup with react-hook-form
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setValue,
  } = useForm<EditTransactionFormData>({
    defaultValues: getDefaultFormValues(transaction),
    mode: 'onChange',
  });

  // Initialize form with transaction data
  useEffect(() => {
    const defaultValues = getDefaultFormValues(transaction);
    reset(defaultValues);
  }, [transaction, reset]);

  // Handle form submission
  const onSubmit: SubmitHandler<EditTransactionFormData> = async (data) => {
    try {
      // Validate form data
      const validation = validateFormData(data);
      if (!validation.isValid) {
        showError(validation.error ?? 'Invalid form data');
        onError?.(validation.error ?? 'Invalid form data');
        return;
      }

      // Transform and submit data
      const transactionData = transformToTransactionData(data);
      await updateTransaction({ ...transactionData, transactionId: transaction.id! });

      // Handle success
      success('Transaction updated successfully');
      onSuccess?.();
      closeDrawer();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update transaction';
      showError(errorMessage);
      onError?.(errorMessage);
    }
  };

  // Handle delete transaction
  const onDelete = async () => {
    try {
      await deleteTransaction({ transactionId: transaction.id! });

      // Handle success
      success('Transaction deleted successfully');
      onSuccess?.();
      closeDrawer();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete transaction';
      showError(errorMessage);
      onError?.(errorMessage);
    }
  };

  // Prepare options for dropdowns
  const accountOptions =
    accountsData?.items?.map((account) => ({
      value: account.id?.toString() ?? '',
      label: `${account.name} (${account.type})`,
    })) ?? [];

  const categoryOptions =
    categoriesData?.items?.map((category) => ({
      value: category.id?.toString() ?? '',
      label: category.name ?? '',
    })) ?? [];

  const currencyOptions = CURRENCY_OPTIONS;

  // Transaction type options
  const typeOptions = TRANSACTION_TYPE_OPTIONS;

  // Validation rules
  const validationRules = VALIDATION_RULES;

  return {
    register,
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
    validationRules,
    setValue,
  };
};
