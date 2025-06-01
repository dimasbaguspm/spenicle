import type { NewCategory } from '../../../../types/api';

import type { AddCategoryFormData } from './types';

export const DEFAULT_FORM_VALUES: Partial<AddCategoryFormData> = {
  name: '',
  note: null,
  parentId: null,
  metadata: {
    icon: 'tag',
    color: 'coral',
  },
};

export const VALIDATION_RULES = {
  groupId: {
    required: 'Group is required',
  },
  name: {
    required: 'Category name is required',
    maxLength: {
      value: 100,
      message: 'Category name must be less than 100 characters',
    },
  },
  parentId: {
    // Optional field, no validation needed
  },
  note: {
    maxLength: {
      value: 500,
      message: 'Notes must be less than 500 characters',
    },
  },
  metadata: {
    // No validation needed for metadata, can be empty
  },
};

/**
 * Transforms form data to API format for category creation
 */
export const transformToCategoryData = (data: AddCategoryFormData): NewCategory => ({
  groupId: data.groupId, // Will be validated before calling this function
  name: data.name,
  parentId: data.parentId,
  note: data.note,
  metadata: data.metadata,
});

/**
 * Validates if the form data is ready for submission
 */
export const validateFormData = (data: AddCategoryFormData): { isValid: boolean; error?: string } => {
  if (!data.groupId) {
    return { isValid: false, error: 'Group is required' };
  }

  if (!data.name?.trim()) {
    return { isValid: false, error: 'Category name is required' };
  }

  return { isValid: true };
};
