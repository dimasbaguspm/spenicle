import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';

import {
  useApiUpdateAccountMutation,
  useApiCreateSingleAccountLimitMutation,
  useApiUpdateSingleAccountLimitMutation,
  useApiDeleteSingleAccountLimitMutation,
  useApiListAccountLimitsQuery,
} from '../../../../hooks';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router/context';
import { useSnack } from '../../../../providers/snack';

import {
  getDefaultFormValues,
  VALIDATION_RULES,
  transformToAccountData,
  transformToAccountLimitData,
  transformToNewAccountLimitData,
  validateFormData,
} from './helpers';
import type { EditAccountFormData, EditAccountDrawerProps } from './types';

/**
 * Custom hook for managing edit account drawer form state and logic
 */
export const useEditAccountForm = ({ account, onSuccess, onError }: EditAccountDrawerProps) => {
  const { closeDrawer } = useDrawerRouterProvider();
  const { success, error: showError } = useSnack();

  // Fetch existing account limits
  const [accountLimitsData] = useApiListAccountLimitsQuery(account.id!, {
    pageSize: 1,
  });
  const existingAccountLimit = accountLimitsData?.items?.[0];

  const [updateAccount, updateAccountError, { isPending: isUpdatingAccount }] = useApiUpdateAccountMutation();
  const [createAccountLimit, , { isPending: isCreatingLimit }] = useApiCreateSingleAccountLimitMutation();
  const [updateAccountLimit, , { isPending: isUpdatingLimit }] = useApiUpdateSingleAccountLimitMutation();
  const [deleteAccountLimit, , { isPending: isDeletingLimit }] = useApiDeleteSingleAccountLimitMutation();

  const isPending = isUpdatingAccount || isCreatingLimit || isUpdatingLimit || isDeletingLimit;

  // Form setup with react-hook-form
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<EditAccountFormData>({
    mode: 'onChange',
    defaultValues: getDefaultFormValues(account, existingAccountLimit),
  });

  const watchedEnableLimit = watch('enableLimit');

  // Update form with default values when account limit data is loaded
  useEffect(() => {
    if (accountLimitsData) {
      const defaultValues = getDefaultFormValues(account, existingAccountLimit);
      reset(defaultValues);
    }
  }, [accountLimitsData, account, existingAccountLimit, reset]);

  // Reset limit fields when limit is disabled
  useEffect(() => {
    if (!watchedEnableLimit) {
      setValue('limitAmount', 0);
      setValue('limitPeriod', 'monthly');
    }
  }, [watchedEnableLimit, setValue]);

  /**
   * Handles form submission
   */
  const onSubmit: SubmitHandler<EditAccountFormData> = async (data): Promise<void> => {
    if (!account.id) {
      const errorMessage = 'Account ID is missing';
      if (onError) {
        onError(errorMessage);
      } else {
        showError(errorMessage);
      }
      return;
    }

    // Validate form data
    const validation = validateFormData(data);
    if (!validation.isValid) {
      if (onError) {
        onError(validation.error!);
      } else {
        showError(validation.error);
      }
      return;
    }

    try {
      // Update the account first
      const accountData = transformToAccountData(data);
      await updateAccount({ ...accountData, accountId: account.id });

      // Handle account limit logic
      if (data.enableLimit) {
        if (existingAccountLimit?.id) {
          // Update existing limit
          const limitData = transformToAccountLimitData(data, account.id);
          await updateAccountLimit({
            ...limitData,
            accountId: account.id,
            accountLimitId: existingAccountLimit.id,
          });
        } else {
          // Create new limit
          const newLimitData = transformToNewAccountLimitData(data, account.id);
          await createAccountLimit({ ...newLimitData, accountId: account.id });
        }
      } else if (existingAccountLimit?.id) {
        // Delete existing limit if limit is disabled
        await deleteAccountLimit({
          accountId: account.id,
          accountLimitId: existingAccountLimit.id,
        });
      }

      success('Account updated successfully!');
      closeDrawer();

      if (onSuccess) {
        onSuccess();
      }
    } catch {
      const errorMessage = 'Failed to update account. Please try again.';
      if (onError) {
        onError(errorMessage);
      } else {
        showError(errorMessage);
      }
    }
  };

  /**
   * Gets validation rules for a specific field
   */
  const getFieldValidationRules = (fieldName: keyof EditAccountFormData) => {
    return VALIDATION_RULES[fieldName] ?? {};
  };

  return {
    // Form methods
    register,
    handleSubmit,
    control,
    watch,
    setValue,

    // Form state
    errors,
    isValid,

    // Field validation
    getFieldValidationRules,

    // Submission
    onSubmit,

    // API state
    isPending,
    updateAccountError,

    // Form actions
    closeDrawer,

    // Watched values
    watchedEnableLimit,

    // Validation rules for direct use
    validationRules: VALIDATION_RULES,

    // Additional data
    existingAccountLimit,
  };
};
