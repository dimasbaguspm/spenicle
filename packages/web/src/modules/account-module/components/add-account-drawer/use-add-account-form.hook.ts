import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';

import { useApiCreateAccountMutation, useApiCreateSingleAccountLimitMutation, useSession } from '../../../../hooks';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router/context';
import { useSnack } from '../../../../providers/snack';

import {
  DEFAULT_FORM_VALUES,
  VALIDATION_RULES,
  transformToAccountData,
  transformToAccountLimitData,
  validateFormData,
} from './helpers';
import type { AddAccountFormData, AddAccountDrawerProps } from './types';

/**
 * Custom hook for managing add account drawer form state and logic
 */
export const useAddAccountForm = ({
  onSuccess,
  onError,
}: Pick<AddAccountDrawerProps, 'onSuccess' | 'onError'> = {}) => {
  const { closeDrawer, handleDispatchSubmitDrawerEvent } = useDrawerRouterProvider();
  const { user } = useSession();
  const { success, error: showError } = useSnack();

  const [createAccount, createAccountError, { isPending: isCreatingAccount }] = useApiCreateAccountMutation();
  const [createAccountLimit, , { isPending: isCreatingLimit }] = useApiCreateSingleAccountLimitMutation();

  const isPending = isCreatingAccount || isCreatingLimit;

  // Form setup with react-hook-form
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<AddAccountFormData>({
    mode: 'onChange',
    defaultValues: { ...DEFAULT_FORM_VALUES, groupId: user?.groupId },
  });

  const watchedEnableLimit = watch('enableLimit');

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
  const onSubmit: SubmitHandler<AddAccountFormData> = async (data): Promise<void> => {
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
      // Create the account first
      const accountData = transformToAccountData(data);
      const createdAccount = await createAccount(accountData);

      // If a limit is enabled and account was created successfully, create the limit
      if (data.enableLimit && createdAccount.id) {
        const limitData = transformToAccountLimitData(data, createdAccount.id);
        await createAccountLimit({ ...limitData, accountId: createdAccount.id });
      }

      success('Account created successfully!');
      closeDrawer();

      // Reset form to default values
      reset({
        ...DEFAULT_FORM_VALUES,
        groupId: user?.groupId ?? 0,
      });

      handleDispatchSubmitDrawerEvent();

      if (onSuccess) {
        onSuccess();
      }
    } catch {
      const errorMessage = 'Failed to create account. Please try again.';
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
  const getFieldValidationRules = (fieldName: keyof AddAccountFormData) => {
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
    createAccountError,

    // Form actions
    closeDrawer,

    // Watched values
    watchedEnableLimit,

    // Validation rules for direct use
    validationRules: VALIDATION_RULES,
  };
};
