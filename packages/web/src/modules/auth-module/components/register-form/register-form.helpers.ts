import { TokenManager } from '../../../../hooks/use-session/use-session';

import type { RegisterFormData, RegisterStep } from './types';

// Step configuration for the registration process
export const REGISTER_STEPS: readonly RegisterStep[] = [
  {
    id: 1,
    title: 'Personal Information',
    description: "Let's get to know you",
    fields: ['name', 'email'],
  },
  {
    id: 2,
    title: 'Security Setup',
    description: 'Secure your account',
    fields: ['password', 'confirmPassword'],
  },
  {
    id: 3,
    title: 'Group Setup',
    description: 'Create your expense group',
    fields: ['groupName', 'defaultCurrency'],
  },
] as const;

// Default form values
export const DEFAULT_FORM_VALUES: RegisterFormData = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  groupName: '',
  defaultCurrency: 'USD',
};

// Form validation rules
export const VALIDATION_RULES = {
  name: {
    required: 'Full name is required',
    minLength: {
      value: 2,
      message: 'Name must be at least 2 characters',
    },
  },
  email: {
    required: 'Email address is required',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Please enter a valid email address',
    },
  },
  password: {
    required: 'Password is required',
    minLength: {
      value: 8,
      message: 'Password must be at least 8 characters long',
    },
  },
  confirmPassword: {
    required: 'Please confirm your password',
  },
  groupName: {
    required: 'Group name is required',
    minLength: {
      value: 2,
      message: 'Group name must be at least 2 characters',
    },
  },
  defaultCurrency: {
    required: 'Default currency is required',
    pattern: {
      value: /^[A-Z]{3}$/,
      message: 'Currency must be a 3-letter code (e.g., USD)',
    },
  },
} as const;

/**
 * Validates if passwords match
 */
export const validatePasswordMatch = (confirmPassword: string, password: string): string | true => {
  return confirmPassword === password || 'Passwords do not match';
};

/**
 * Calculates the progress percentage based on current step
 */
export const calculateProgress = (currentStep: number): number => {
  return (currentStep / REGISTER_STEPS.length) * 100;
};

/**
 * Gets the current step data
 */
export const getCurrentStepData = (currentStep: number): RegisterStep | undefined => {
  return REGISTER_STEPS.find((step) => step.id === currentStep);
};

/**
 * Validates the final form data before submission
 */
export const validateFinalSubmission = (data: RegisterFormData): { isValid: boolean; error?: string } => {
  if (data.password !== data.confirmPassword) {
    return { isValid: false, error: 'Passwords do not match.' };
  }

  if (data.password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long.' };
  }

  return { isValid: true };
};

/**
 * Transforms form data for API submission
 */
export const transformFormDataForApi = (data: RegisterFormData) => ({
  user: {
    name: data.name,
    email: data.email,
    password: data.password,
  },
  group: {
    name: data.groupName,
    defaultCurrency: data.defaultCurrency,
  },
});

/**
 * Handles token storage after successful registration
 * @deprecated Use TokenManager.setTokens instead
 */
export const handleTokenStorage = (accessToken: string) => {
  TokenManager.setTokens({ accessToken });
};
