import { useLocation, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useForm, Controller } from 'react-hook-form';

import { Button, Drawer, FormLayout, Switch } from '../../../../components';
import { useApiAccountsQuery, useApiCategoriesQuery } from '../../../../hooks';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router';
import type { TransactionQueryParameters } from '../../../../types/api';
import { AccountSelector } from '../../../account-module';
import { CategorySelector } from '../../../category-module';
import { useTransactionFilters } from '../../hooks';
import { TransactionTypeSelector } from '../transaction-type-selector';

import type { TransactionFiltersFormSchema } from './types';

const queryKeyParams: string[] = ['categoryId', 'accountId', 'type', 'isHighlighted'];

export const TransactionFilterDrawer = () => {
  const { closeDrawer } = useDrawerRouterProvider();
  const navigate = useNavigate();

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
      categoryIds: values.categoryId ? [values.categoryId] : undefined,
      accountIds: values.accountId ? [values.accountId] : undefined,
      type: (values?.type ?? '').length >= 1 ? values.type : undefined,
      isHighlighted: values.isHighlighted ?? undefined,
    };

    const validQueryParams: TransactionQueryParameters = Object.fromEntries(
      Object.entries(queryParams).filter(
        ([_, value]) => typeof value === 'boolean' || value !== undefined || value !== null
      )
    );

    if (Object.keys(validQueryParams).length === 0) {
      closeDrawer();
    } else {
      await navigate({
        // @ts-expect-error is a bug from tanstack/react-router
        search: {
          ...params,
          ...validQueryParams,
        },
        replace: true,
        resetScroll: false,
      });
    }
  });

  const handleReset = async () => {
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
  };

  return (
    <Drawer onClose={closeDrawer} position="right" size="md">
      <Drawer.Header>
        <Drawer.Title>Filter Transactions</Drawer.Title>
        <Drawer.CloseButton />
      </Drawer.Header>
      <form onSubmit={onSubmit} className="flex flex-col h-full">
        <Drawer.Content className="flex-1 overflow-y-auto">
          <FormLayout columns={1}>
            <FormLayout.Field>
              <Controller
                name="categoryId"
                control={form.control}
                render={({ field }) => (
                  <CategorySelector
                    label="Category"
                    placeholder="Select a category"
                    categories={categories?.items ?? []}
                    value={(categories?.items ?? []).find((cat) => cat.id === field.value) ?? null}
                    onChange={(cat) => field.onChange(cat?.id ?? null)}
                    errorText={form.formState.errors.categoryId?.message}
                  />
                )}
              />
            </FormLayout.Field>
            <FormLayout.Field>
              <Controller
                name="accountId"
                control={form.control}
                render={({ field }) => (
                  <AccountSelector
                    label="Account"
                    placeholder="Select an account"
                    accounts={accounts?.items ?? []}
                    value={(accounts?.items ?? []).find((acc) => acc.id === field.value) ?? null}
                    onChange={(acc) => field.onChange(acc?.id ?? null)}
                    errorText={form.formState.errors.accountId?.message}
                  />
                )}
              />
            </FormLayout.Field>
            <FormLayout.Field>
              <Controller
                name="type"
                control={form.control}
                render={({ field }) => (
                  <TransactionTypeSelector
                    value={field.value ?? ''}
                    showAllOption
                    onChange={field.onChange}
                    errorText={form.formState.errors.type?.message}
                    className="w-full"
                  />
                )}
              />
            </FormLayout.Field>
            <FormLayout.Field>
              <Controller
                name="isHighlighted"
                control={form.control}
                render={({ field }) => (
                  <Switch
                    id="is-highlighted"
                    label="Highlighted only"
                    checked={!!field.value}
                    onCheckedChange={(checked) => field.onChange(checked ? true : undefined)}
                  />
                )}
              />
            </FormLayout.Field>
          </FormLayout>
        </Drawer.Content>
        <Drawer.Footer>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="md" onClick={handleReset}>
              Reset
            </Button>
            <Button type="submit" variant="default" size="md">
              Apply filters
            </Button>
          </div>
        </Drawer.Footer>
      </form>
    </Drawer>
  );
};
