import { type FC } from 'react';
import { Controller } from 'react-hook-form';

import { Drawer, TextInput, TextArea, Button } from '../../../../components';
import { CategoryAppearanceSelector } from '../category-appearance-selector';
import { GroupCategorySelector } from '../group-category-selector';

import type { EditCategoryDrawerProps } from './types';
import { useEditCategoryForm } from './use-edit-category-form.hook';

export const EditCategoryDrawer: FC<EditCategoryDrawerProps> = ({ category, onSuccess, onError }) => {
  const { handleSubmit, control, errors, isPending, onSubmit, closeDrawer, validationRules, categoryHasChildren } =
    useEditCategoryForm({
      category,
      onSuccess,
      onError,
    });

  return (
    <Drawer onClose={closeDrawer} size="md">
      <Drawer.Header>
        <Drawer.Title>Edit Category</Drawer.Title>
        <Drawer.CloseButton />
      </Drawer.Header>
      <Drawer.Content>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Controller
            name="name"
            control={control}
            rules={validationRules.name}
            render={({ field }) => (
              <TextInput
                {...field}
                label="Category Name"
                placeholder="Enter category name"
                errorText={errors.name?.message}
                maxLength={100}
              />
            )}
          />

          <Controller
            name="note"
            control={control}
            rules={validationRules.note}
            render={({ field }) => (
              <TextArea
                {...field}
                value={field.value ?? ''}
                label="Notes"
                placeholder="Add any notes about this category..."
                helperText="Optional description for this category"
                rows={3}
                maxLength={500}
              />
            )}
          />

          <div className="border-t border-mist-200 pt-6">
            <CategoryAppearanceSelector control={control} errors={errors} label="Appearance" helperText="" />
            {!categoryHasChildren && (
              <div className="mt-6">
                <GroupCategorySelector control={control} errors={errors} excludeCategoryId={category.id} />
              </div>
            )}
            {categoryHasChildren && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-amber-800 mb-1">Parent Category Cannot Be Changed</h4>
                    <p className="text-xs text-amber-700">
                      This category has subcategories, so it cannot be moved under another parent category. To change
                      its parent, first move all subcategories to other parents or make them main categories.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
      </Drawer.Content>
      <Drawer.Footer>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={closeDrawer}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleSubmit(onSubmit)} disabled={isPending}>
            {isPending ? 'Updating...' : 'Update Category'}
          </Button>
        </div>
      </Drawer.Footer>
    </Drawer>
  );
};
