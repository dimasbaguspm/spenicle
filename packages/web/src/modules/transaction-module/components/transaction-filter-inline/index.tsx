import { useNavigate } from '@tanstack/react-router';
import { Repeat, TrendingDown, TrendingUp } from 'lucide-react';
import { useState, type FC } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { FormLayout } from '../../../../components';
import { CheckboxGroup } from '../../../../components/checkbox-input/checkbox-group';
import { CheckboxInput } from '../../../../components/checkbox-input/checkbox-input';
import { ChipInput, ChipGroup } from '../../../../components/chip';
import { useApiAccountsQuery, useApiCategoriesQuery } from '../../../../hooks';
import { useDebouncedDistinctEffect } from '../../../../hooks/use-debounced-distinct-effect';
import { CategorySelectorMultiModal } from '../../../category-module/components/category-selector/category-selector-multi-modal';
import { useTransactionFilters } from '../../hooks/use-transaction-filters';
import type { TransactionFiltersFormSchema } from '../transaction-filter-drawer/types';

export const TransactionFilterInline: FC = () => {
  const filters = useTransactionFilters();
  const navigate = useNavigate();
  const [accounts] = useApiAccountsQuery();
  const [categories] = useApiCategoriesQuery();
  const form = useForm<Partial<TransactionFiltersFormSchema>>({
    defaultValues: filters,
    mode: 'onChange',
  });
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // handle submit
  const onSubmit = form.handleSubmit(async (values) => {
    await navigate({
      // @ts-expect-error form values can be partial
      search: values,
      replace: true,
      resetScroll: false,
    });
  });

  // use the new hook for debounced, distinct auto-submit
  useDebouncedDistinctEffect(
    form.watch(),
    () => {
      void onSubmit();
    },
    300
  );

  return (
    <form className="flex flex-col ">
      <FormLayout columns={1} gap="md">
        <FormLayout.Field>
          {/* type as chip group with icons */}
          <Controller
            name="types"
            control={form.control}
            render={({ field }) => {
              const typeOptions = [
                {
                  value: 'expense',
                  label: 'Expense',
                  icon: <TrendingDown className="h-4 w-4 mr-1" />,
                },
                {
                  value: 'income',
                  label: 'Income',
                  icon: <TrendingUp className="h-4 w-4 mr-1" />,
                },
                {
                  value: 'transfer',
                  label: 'Transfer',
                  icon: <Repeat className="h-4 w-4 mr-1" />,
                },
              ] as const;
              return (
                <ChipGroup
                  label="Type"
                  direction="horizontal"
                  errorText={form.formState.errors.types?.message as string}
                >
                  {typeOptions.map((type) => (
                    <ChipInput
                      key={type.value}
                      variant={field.value?.includes(type.value) ? 'coral' : 'mist'}
                      selected={field.value?.includes(type.value)}
                      onClick={() => {
                        let newValue = Array.isArray(field.value) ? [...field.value] : [];
                        if (newValue.includes(type.value)) {
                          newValue = newValue.filter((t) => t !== type.value);
                        } else {
                          newValue.push(type.value);
                        }
                        field.onChange(newValue);
                      }}
                    >
                      {type.icon}
                      {type.label}
                    </ChipInput>
                  ))}
                </ChipGroup>
              );
            }}
          />
        </FormLayout.Field>
        <FormLayout.Field>
          {/* accounts as checkbox group */}
          <Controller
            name="accountIds"
            control={form.control}
            render={({ field }) => (
              <CheckboxGroup
                label="Accounts"
                direction="vertical"
                errorText={form.formState.errors.accountIds?.message as string}
              >
                {(accounts?.items ?? [])
                  .filter((acc) => typeof acc.id === 'number' && typeof acc.name === 'string')
                  .map((acc) => (
                    <CheckboxInput
                      key={acc.id}
                      value={acc.id}
                      checked={Array.isArray(field.value) ? field.value.includes(acc.id as number) : false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        let newValue = Array.isArray(field.value) ? [...field.value] : [];
                        if (checked) {
                          newValue.push(acc.id as number);
                        } else {
                          newValue = newValue.filter((id) => id !== acc.id);
                        }
                        field.onChange(newValue);
                      }}
                      label={acc.name}
                      variant="coral"
                    />
                  ))}
              </CheckboxGroup>
            )}
          />
        </FormLayout.Field>
        <FormLayout.Field>
          {/* categories as checkbox group (top 5 root, load more opens modal) */}
          <Controller
            name="categoryIds"
            control={form.control}
            render={({ field }) => {
              const allCategories = (categories?.items ?? []).filter(
                (cat) => typeof cat.id === 'number' && typeof cat.name === 'string'
              );
              const rootCategories = allCategories.filter((cat) => !cat.parentId);
              const showLoadMore = allCategories.length > 5;
              const visibleCategories = rootCategories.slice(0, 5);
              return (
                <>
                  <CheckboxGroup
                    label={`Categories${
                      Array.isArray(field.value) && field.value.length > 0 ? ` (${field.value.length})` : ''
                    }`}
                    direction="vertical"
                    errorText={form.formState.errors.categoryIds?.message as string}
                  >
                    {visibleCategories.map((cat) => (
                      <CheckboxInput
                        key={cat.id}
                        value={cat.id}
                        checked={Array.isArray(field.value) ? field.value.includes(cat.id as number) : false}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          let newValue = Array.isArray(field.value) ? [...field.value] : [];
                          if (checked) {
                            newValue.push(cat.id as number);
                          } else {
                            newValue = newValue.filter((id) => id !== cat.id);
                          }
                          field.onChange(newValue);
                        }}
                        label={cat.name}
                        variant="coral"
                      />
                    ))}
                    {showLoadMore && (
                      <div>
                        <button
                          type="button"
                          className="mt-2 text-coral-600 text-sm underline hover:text-coral-700 focus:outline-none"
                          onClick={() => {
                            setCategoryModalOpen(true);
                          }}
                        >
                          Load more
                        </button>
                      </div>
                    )}
                  </CheckboxGroup>

                  {categoryModalOpen && (
                    <CategorySelectorMultiModal
                      isOpen={categoryModalOpen}
                      categories={allCategories}
                      value={allCategories.filter((cat) => field.value?.includes(cat.id!))}
                      onSubmit={(selectedCategories) => {
                        form.setValue(
                          'categoryIds',
                          selectedCategories.map((cat) => cat.id as number),
                          {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          }
                        );
                        setCategoryModalOpen(false);
                      }}
                      onClear={() =>
                        form.setValue('categoryIds', [], {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                      }
                      onClose={() => setCategoryModalOpen(false)}
                    />
                  )}
                </>
              );
            }}
          />
        </FormLayout.Field>
      </FormLayout>
    </form>
  );
};
