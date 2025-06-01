import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useApiRegisterMutation } from '../../../../hooks/use-api/built-in';
import { useSnack } from '../../../../providers/snack';

import {
  DEFAULT_FORM_VALUES,
  VALIDATION_RULES,
  REGISTER_STEPS,
  validatePasswordMatch,
  calculateProgress,
  getCurrentStepData,
  validateFinalSubmission,
  transformFormDataForApi,
  handleTokenStorage,
} from './register-form.helpers';
import type { RegisterFormData } from './types';

/**
 * Custom hook for managing register form state and logic
 */
export const useRegisterForm = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useSnack();
  const [registerMutation, error, { isPending }] = useApiRegisterMutation();
  const [currentStep, setCurrentStep] = useState(1);

  // Form setup with react-hook-form
  const methods = useForm<RegisterFormData>({
    mode: 'onChange',
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const {
    control,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = methods;

  const watchedPassword = watch('password');

  // Computed values
  const progress = calculateProgress(currentStep);
  const currentStepData = getCurrentStepData(currentStep);

  /**
   * Checks if the current step is valid
   */
  const isCurrentStepValid = (): boolean => {
    if (!currentStepData) return false;

    return currentStepData.fields.every((field) => {
      const value = watch(field);
      const hasError = errors[field];

      // Special validation for password confirmation
      if (field === 'confirmPassword') {
        return value && !hasError && value === watchedPassword;
      }

      return value && !hasError;
    });
  };

  /**
   * Moves to the next step after validation
   */
  const nextStep = async (): Promise<void> => {
    const fieldsToValidate = currentStepData?.fields ?? [];
    const isStepValid = await trigger(fieldsToValidate);

    if (isStepValid && currentStep < REGISTER_STEPS.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  /**
   * Moves to the previous step
   */
  const prevStep = (): void => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  /**
   * Handles form submission
   */
  const onSubmit = async (data: RegisterFormData): Promise<void> => {
    // Final validation
    const validation = validateFinalSubmission(data);
    if (!validation.isValid) {
      showError(validation.error);
      return;
    }

    // Transform data and submit
    const apiData = transformFormDataForApi(data);

    try {
      const response = await registerMutation(apiData);

      // Store tokens
      handleTokenStorage(response.token);

      success('Account created successfully! Welcome to SpendLess.');
      await navigate({ to: '/' });
    } catch {
      showError('Registration failed. Please try again.');
    }
  };

  /**
   * Gets validation rules for a specific field
   */
  const getFieldValidationRules = (fieldName: keyof RegisterFormData) => {
    const baseRules = VALIDATION_RULES[fieldName];

    // Add custom validate function for confirmPassword
    if (fieldName === 'confirmPassword') {
      return {
        ...baseRules,
        validate: (value: string) => validatePasswordMatch(value, watchedPassword),
      };
    }

    return baseRules;
  };

  return {
    // Form methods for FormProvider
    methods,

    // Form state (kept for compatibility during transition)
    control,
    errors,
    handleSubmit,
    watch,
    watchedPassword,

    // Step management
    currentStep,
    currentStepData,
    progress,

    // Validation
    isCurrentStepValid,
    getFieldValidationRules,

    // Navigation
    nextStep,
    prevStep,

    // Submission
    onSubmit,

    // API state
    error,
    isPending,

    // Constants
    STEPS: REGISTER_STEPS,
  };
};
