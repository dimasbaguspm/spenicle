import { useNavigate } from '@tanstack/react-router';
import { useForm, type SubmitHandler } from 'react-hook-form';

import { useApiLoginMutation } from '../../../../hooks/use-api/built-in';
import { useSnack } from '../../../../providers/snack';

import { DEFAULT_FORM_VALUES, VALIDATION_RULES, handleTokenStorage } from './login-form.helpers';
import type { LoginFormValues, LoginFormProps } from './types';

/**
 * Custom hook for managing login form state and logic
 */
export const useLoginForm = ({ onSuccess }: Pick<LoginFormProps, 'onSuccess'> = {}) => {
  const navigate = useNavigate();
  const { success, error: showError } = useSnack();
  const [loginMutation, , { isPending }] = useApiLoginMutation();

  // Form setup with react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginFormValues>({
    mode: 'onChange',
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (payload): Promise<void> => {
    try {
      const response = await loginMutation(payload);

      if (response.token) {
        handleTokenStorage(response.token);
      }

      success('Login successful! Welcome back.');

      if (onSuccess) {
        onSuccess();
      } else {
        await navigate({ to: '/' });
      }
    } catch {
      showError('Login failed. Please check your credentials.');
    }
  };

  return {
    register,
    handleSubmit,
    errors,
    isValid,
    isPending,
    onSubmit,
    validationRules: VALIDATION_RULES,
  };
};
