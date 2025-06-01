import { useForm, type SubmitHandler } from 'react-hook-form';

import { useApiCreateCategoryMutation, useApiCategoriesQuery, useSession } from '../../../../hooks';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router/context';
import { useSnack } from '../../../../providers/snack';

import { DEFAULT_FORM_VALUES, VALIDATION_RULES, transformToCategoryData, validateFormData } from './helpers';
import type { AddCategoryFormData, AddCategoryDrawerProps } from './types';

/**
 * Custom hook for managing add category drawer form state and logic
 */
export const useAddCategoryForm = ({
  onSuccess,
  onError,
}: Pick<AddCategoryDrawerProps, 'onSuccess' | 'onError'> = {}) => {
  const { closeDrawer } = useDrawerRouterProvider();
  const { user } = useSession();
  const { success, error: showError } = useSnack();

  // API mutations
  const [createCategory, createCategoryError, { isPending }] = useApiCreateCategoryMutation();

  // Get categories for parent selection
  const [categoriesData] = useApiCategoriesQuery();

  // Form setup with react-hook-form
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isValid },
  } = useForm<AddCategoryFormData>({
    mode: 'onChange',
    defaultValues: { ...DEFAULT_FORM_VALUES, groupId: user?.groupId },
  });

  /**
   * Handles form submission
   */
  const onSubmit: SubmitHandler<AddCategoryFormData> = async (data): Promise<void> => {
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
      // Create the category
      const categoryData = transformToCategoryData(data);
      await createCategory(categoryData);

      success('Category created successfully!');
      closeDrawer();

      // Reset form to default values
      reset({
        ...DEFAULT_FORM_VALUES,
        groupId: user?.groupId ?? 0,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch {
      const errorMessage = 'Failed to create category. Please try again.';
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
  const getFieldValidationRules = (fieldName: keyof AddCategoryFormData) => {
    return VALIDATION_RULES[fieldName] ?? {};
  };

  // Prepare parent category options
  const parentCategoryOptions = [
    { value: '', label: 'No parent category' },
    ...(categoriesData?.items?.map((category) => ({
      value: category.id?.toString() ?? '',
      label: category.name ?? '',
    })) ?? []),
  ];

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
    createCategoryError,

    // Form actions
    closeDrawer,

    // Validation rules for direct use
    validationRules: VALIDATION_RULES,

    // Data
    parentCategoryOptions,
  };
};
