import { useForm, type SubmitHandler } from 'react-hook-form';

import {
  useApiCreateTransactionMutation,
  useApiAccountsQuery,
  useApiCategoriesQuery,
  useSession,
} from '../../../../hooks';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router/context';
import { useSnack } from '../../../../providers/snack';

import {
  DEFAULT_FORM_VALUES,
  VALIDATION_RULES,
  CURRENCY_OPTIONS,
  TRANSACTION_TYPE_OPTIONS,
  transformToTransactionData,
  validateFormData,
} from './helpers';
import type { AddTransactionFormData, AddTransactionDrawerProps } from './types';

/**
 * Custom hook for managing add transaction drawer form state and logic
 */
export const useAddTransactionForm = ({
  onSuccess,
  onError,
}: Pick<AddTransactionDrawerProps, 'onSuccess' | 'onError'> = {}) => {
  const { closeDrawer } = useDrawerRouterProvider();
  const { success } = useSnack();

  // API queries and mutations
  const { user } = useSession();
  const [accountsData] = useApiAccountsQuery();
  const [categoriesData] = useApiCategoriesQuery();
  const [createTransaction, createError, createStates] = useApiCreateTransactionMutation();

  const isPending = createStates.isPending;

  // Form setup with react-hook-form
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isValid },
  } = useForm<AddTransactionFormData>({
    mode: 'onChange',
    defaultValues: { ...DEFAULT_FORM_VALUES, groupId: user?.groupId, createdByUserId: user?.id },
  });

  /**
   * Handles form submission
   */
  const onSubmit: SubmitHandler<AddTransactionFormData> = async (data): Promise<void> => {
    // Validate form data
    const validation = validateFormData(data);
    if (!validation.isValid) {
      if (onError) {
        onError(validation.error!);
      }
      return;
    }

    try {
      // Create the transaction
      const transactionData = transformToTransactionData(data);
      await createTransaction(transactionData);

      success('Transaction created successfully!');
      closeDrawer();

      // Reset form to default values
      reset({
        ...DEFAULT_FORM_VALUES,
        groupId: user?.groupId ?? 0,
        createdByUserId: user?.id ?? 0,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch {
      const errorMessage = 'Failed to create transaction. Please try again.';
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  /**
   * Gets validation rules for a specific field
   */
  const getFieldValidationRules = (fieldName: keyof AddTransactionFormData) => {
    return VALIDATION_RULES[fieldName] ?? {};
  };

  // Prepare options for selects
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

  return {
    // Form methods
    register,
    handleSubmit,
    control,

    // Form state
    errors,
    isValid,

    // Field validation
    getFieldValidationRules,

    // Submission
    onSubmit,

    // API state
    isPending,
    createError,

    // Form actions
    closeDrawer,

    // Validation rules for direct use
    validationRules: VALIDATION_RULES,

    // Data options
    accountOptions,
    categoryOptions,
    currencyOptions: CURRENCY_OPTIONS,
    typeOptions: TRANSACTION_TYPE_OPTIONS,
  };
};
