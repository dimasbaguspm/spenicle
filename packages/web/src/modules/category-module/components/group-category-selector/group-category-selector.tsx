import { useState } from 'react';
import { Controller, type Control, type FieldErrors, type FieldValues, type Path } from 'react-hook-form';

import { Button } from '../../../../components';
import { useApiCategoriesQuery } from '../../../../hooks/use-api';
import { CategoryIcon } from '../category-icon';

import { GroupCategoryPickerModal } from './group-category-info-modal';

export interface GroupCategorySelectorProps<T extends FieldValues> {
  control: Control<T>;
  errors?: FieldErrors<T>;
  fieldName?: Path<T>;
  label?: string;
  helperText?: string;
  excludeCategoryId?: number | null;
}

export const GroupCategorySelector = <T extends FieldValues>({
  control,
  errors,
  fieldName = 'parentId' as Path<T>,
  label = 'Group Category',
  helperText = 'Select a parent category to create subcategories (1 level only)',
  excludeCategoryId,
}: GroupCategorySelectorProps<T>) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [categoriesData] = useApiCategoriesQuery({ parentId: null });

  const topLevelCategories =
    categoriesData?.items
      ?.filter((category) => category.parentId === null)
      ?.filter((category) => (excludeCategoryId ? category.id !== excludeCategoryId : true)) ?? [];

  const getErrorMessage = (errorsObj: FieldErrors<T>, path: string): string | undefined => {
    return path
      .split('.')
      .reduce(
        (obj: Record<string, unknown>, key: string) => obj?.[key] as Record<string, unknown>,
        errorsObj as Record<string, unknown>
      )?.message as string | undefined;
  };

  const errorMessage = getErrorMessage(errors ?? {}, fieldName);

  return (
    <div className="space-y-3">
      <Controller
        name={fieldName}
        control={control}
        render={({ field }) => {
          const selectedCategory = topLevelCategories.find((cat) => cat.id?.toString() === field.value?.toString());

          return (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">{label}</label>

              <div className="p-4 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                {selectedCategory ? (
                  <div>
                    <div className="text-xs font-medium text-slate-600 mb-2">Selected Parent Category:</div>
                    <div className="flex items-center gap-3">
                      <CategoryIcon
                        iconValue={selectedCategory.metadata?.icon ?? 'tag'}
                        colorValue={selectedCategory.metadata?.color ?? 'coral'}
                        size="sm"
                      />
                      <div>
                        <div className="text-sm font-medium text-slate-900">{selectedCategory.name}</div>
                        <div className="text-xs text-slate-500">
                          New category will be a subcategory of "{selectedCategory.name}"
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <div className="text-sm text-slate-600 mb-1">No parent category selected</div>
                    <div className="text-xs text-slate-500">This will be a main category</div>
                  </div>
                )}
              </div>

              {/* Select button */}
              <Button
                type="button"
                variant="mist"
                onClick={() => setIsModalOpen(true)}
                className="w-full justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                {selectedCategory ? 'Change Parent Category' : 'Select Parent Category'}
              </Button>

              {/* Helper text and error */}
              {helperText && !errorMessage && <p className="text-xs text-slate-500">{helperText}</p>}
              {errorMessage && <p className="text-xs text-danger-600">{errorMessage}</p>}

              {/* Category Picker Modal */}
              <GroupCategoryPickerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                categories={topLevelCategories}
                selectedCategoryId={field.value}
                onSelectCategory={(categoryId) => field.onChange(categoryId)}
              />
            </div>
          );
        }}
      />
    </div>
  );
};
