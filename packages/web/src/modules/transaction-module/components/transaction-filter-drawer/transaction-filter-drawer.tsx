import { useLocation, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { Repeat, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';

import { Button, Drawer } from '../../../../components';
import { CheckboxGroup } from '../../../../components/checkbox-input/checkbox-group';
import { CheckboxInput } from '../../../../components/checkbox-input/checkbox-input';
import { ChipInput } from '../../../../components/chip';
import { useApiAccountsQuery, useApiCategoriesQuery } from '../../../../hooks';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router';
import type { TransactionQueryParameters } from '../../../../types/api';
import { CategorySelectorMultiModal } from '../../../category-module/components/category-selector/category-selector-multi-modal';
import { useTransactionFilters } from '../../hooks';

import type { TransactionFiltersFormSchema } from './types';

const queryKeyParams: string[] = ['categoryIds', 'accountIds', 'types', 'isHighlighted'];

export const TransactionFilterDrawer = () => {
  const { closeDrawer } = useDrawerRouterProvider();
  const navigate = useNavigate();
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const filters = useTransactionFilters();
  const params = useLocation({
    select: ({ search }) => ({
      startDate: search?.startDate ?? dayjs().startOf('week').toISOString(),
      endDate: search?.endDate ?? dayjs().endOf('week').toISOString(),
      ...filters,
    }),
  });

  const [accounts] = useApiAccountsQuery();
  const [categories] = useApiCategoriesQuery();

  const form = useForm<Partial<TransactionFiltersFormSchema>>({
    defaultValues: filters,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const queryParams: TransactionQueryParameters = {
      ...values,
      categoryIds: values.categoryIds ?? undefined,
      accountIds: values.accountIds ?? undefined,
      types: values?.types ?? undefined,
    };

    const validQueryParams: TransactionQueryParameters = Object.fromEntries(
      Object.entries(queryParams).filter(
        ([_, value]) => typeof value === 'boolean' || value !== undefined || value !== null
      )
    );

    await navigate({
      // @ts-expect-error is a bug from tanstack/react-router
      search: {
        ...params,
        ...validQueryParams,
      },
      replace: true,
      resetScroll: false,
    });

    // close drawer after applying filters for better ux
    closeDrawer();
  });

  const handleReset = async () => {
    // Reset form to empty values
    form.reset({
      categoryIds: [],
      accountIds: [],
      types: [],
    });

    // Navigate with cleared filters
    await navigate({
      search: {
        ...Object.entries(params)
          .filter(([key]) => !queryKeyParams.includes(key as keyof TransactionQueryParameters))
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
        // @ts-expect-error drawerId is not part of the params
        drawerId: undefined,
      },
      replace: true,
      resetScroll: false,
    });

    // close drawer after clearing filters for better ux
    closeDrawer();
  };

  return (
    <Drawer onClose={closeDrawer} position="right" size="md" className="w-full sm:w-96 max-w-md">
      <Drawer.Header className="border-b border-mist-200 bg-cream-50">
        <Drawer.Title className="text-slate-900 font-semibold">Filter Transactions</Drawer.Title>
        <Drawer.CloseButton />
      </Drawer.Header>
      <Drawer.Content>
        <form onSubmit={onSubmit} id="transaction-filter-form">
          {/* Filter Summary */}
          <div className="mb-4 p-3 bg-mist-50 rounded-lg border border-mist-200">
            <div className="text-sm text-slate-600">
              {(() => {
                const selectedTypes = form.watch('types')?.length ?? 0;
                const selectedAccounts = form.watch('accountIds')?.length ?? 0;
                const selectedCategories = form.watch('categoryIds')?.length ?? 0;
                const totalFilters = selectedTypes + selectedAccounts + selectedCategories;

                if (totalFilters === 0) {
                  return 'No filters applied - showing all transactions';
                }

                const parts = [];
                if (selectedTypes > 0) parts.push(`${selectedTypes} type${selectedTypes > 1 ? 's' : ''}`);
                if (selectedAccounts > 0) parts.push(`${selectedAccounts} account${selectedAccounts > 1 ? 's' : ''}`);
                if (selectedCategories > 0)
                  parts.push(`${selectedCategories} categor${selectedCategories > 1 ? 'ies' : 'y'}`);

                return `Filtering by: ${parts.join(', ')}`;
              })()}
            </div>
          </div>

          <div className="space-y-6">
            {/* Transaction Types as Chip Group */}
            <div className="space-y-3">
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
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-slate-700">Transaction Type</div>
                      <div className="flex flex-wrap gap-2">
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
                            className="flex-shrink-0"
                          >
                            {type.icon}
                            {type.label}
                          </ChipInput>
                        ))}
                      </div>
                      {form.formState.errors.types?.message && (
                        <div className="text-sm text-coral-600">{form.formState.errors.types.message}</div>
                      )}
                    </div>
                  );
                }}
              />
            </div>

            {/* Accounts as Checkbox Group */}
            <div className="space-y-3">
              <Controller
                name="accountIds"
                control={form.control}
                render={({ field }) => (
                  <CheckboxGroup
                    label={`Accounts${
                      Array.isArray(field.value) && field.value.length > 0 ? ` (${field.value.length})` : ''
                    }`}
                    direction="vertical"
                    errorText={form.formState.errors.accountIds?.message as string}
                  >
                    <div className="space-y-2 max-h-48 overflow-y-auto">
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
                    </div>
                  </CheckboxGroup>
                )}
              />
            </div>

            {/* Categories as Checkbox Group with Load More */}
            <div className="space-y-3">
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
                        <div className="space-y-2 max-h-48 overflow-y-auto">
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
                        </div>
                        {showLoadMore && (
                          <div className="pt-2 border-t border-mist-200">
                            <button
                              type="button"
                              className="text-coral-600 text-sm underline hover:text-coral-700 focus:outline-none focus:text-coral-700 transition-colors"
                              onClick={() => setCategoryModalOpen(true)}
                            >
                              Load more categories
                            </button>
                          </div>
                        )}
                      </CheckboxGroup>

                      {/* Category Selection Modal */}
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
            </div>
          </div>
        </form>
      </Drawer.Content>
      <Drawer.Footer className="border-t border-mist-200 p-4 bg-cream-50">
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleReset}
            className="flex-1 sm:flex-none sm:min-w-[120px]"
          >
            Clear All
          </Button>
          <Button
            type="submit"
            variant="default"
            size="md"
            className="flex-1 sm:flex-none sm:min-w-[140px]"
            form="transaction-filter-form"
          >
            Apply Filters
          </Button>
        </div>
      </Drawer.Footer>
    </Drawer>
  );
};
