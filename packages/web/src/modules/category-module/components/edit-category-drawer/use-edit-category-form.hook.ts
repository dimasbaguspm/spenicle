import { useForm, type SubmitHandler } from 'react-hook-form';

import { useApiUpdateCategoryMutation, useApiCategoriesQuery } from '../../../../hooks/use-api/built-in/use-categories';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router/context';
import { useSnack } from '../../../../providers/snack';

import { getDefaultFormValues, VALIDATION_RULES, transformToCategoryData, validateFormData } from './helpers';
import type { EditCategoryFormData, EditCategoryDrawerProps } from './types';

/**
 * Custom hook for managing edit category drawer form state and logic
 */
export const useEditCategoryForm = ({ category, onSuccess, onError }: EditCategoryDrawerProps) => {
  const { closeDrawer } = useDrawerRouterProvider();
  const { success, error: showError } = useSnack();

  const [updateCategory, updateCategoryError, { isPending }] = useApiUpdateCategoryMutation();

  const [categoriesData] = useApiCategoriesQuery({ parentId: category.id });

  // Form setup with react-hook-form
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm<EditCategoryFormData>({
    mode: 'onChange',
    defaultValues: getDefaultFormValues(category),
  });

  // Check if the current category has children
  const categoryHasChildren = (categoriesData?.totalItems ?? 0) > 0;

  /**
   * Handles form submission
   */
  const onSubmit: SubmitHandler<EditCategoryFormData> = async (data): Promise<void> => {
    if (!category.id) {
      const errorMessage = 'Category ID is missing';
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
      // Update the category
      const categoryData = transformToCategoryData(data);
      await updateCategory({ ...categoryData, categoryId: category.id });

      success('Category updated successfully!');
      closeDrawer();

      if (onSuccess) {
        onSuccess();
      }
    } catch {
      const errorMessage = 'Failed to update category. Please try again.';
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
  const getFieldValidationRules = (fieldName: keyof EditCategoryFormData) => {
    return VALIDATION_RULES[fieldName] ?? {};
  };

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
    updateCategoryError,

    // Form actions
    closeDrawer,

    // Validation rules for direct use
    validationRules: VALIDATION_RULES,

    // Category state
    categoryHasChildren,
  };
};
