import { type FC } from 'react';
import { Controller } from 'react-hook-form';

import { Drawer, TextInput, Select, TextArea, Button, Switch } from '../../../../components';
import { AccountAppearanceSelector } from '../account-appearance-selector';
import { AccountTypeSelector } from '../account-type-selector';

import { PERIOD_OPTIONS } from './helpers';
import type { EditAccountDrawerProps } from './types';
import { useEditAccountForm } from './use-edit-account-form.hook';

export const EditAccountDrawer: FC<EditAccountDrawerProps> = ({ account, onSuccess, onError }) => {
  const { handleSubmit, control, errors, isPending, onSubmit, closeDrawer, watchedEnableLimit, validationRules } =
    useEditAccountForm({ account, onSuccess, onError });

  return (
    <Drawer onClose={closeDrawer} size="md">
      <Drawer.Header>
        <Drawer.Title>Edit Account</Drawer.Title>
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
                label="Account Name"
                placeholder="Enter account name"
                errorText={errors.name?.message}
                maxLength={255}
              />
            )}
          />

          <AccountTypeSelector control={control} errors={errors} />

          <Controller
            name="note"
            control={control}
            rules={validationRules.note}
            render={({ field }) => (
              <TextArea
                {...field}
                value={field.value ?? ''}
                label="Notes"
                placeholder="Add any notes about this account..."
                helperText="Optional description for this account"
                rows={3}
              />
            )}
          />

          <div className="border-t border-mist-200 pt-6 space-y-6">
            <AccountAppearanceSelector control={control} errors={errors} label="Appearance" helperText="" />

            <div>
              <Controller
                name="enableLimit"
                control={control}
                render={({ field }) => (
                  <div
                    className="flex items-start justify-between mb-4 cursor-pointer"
                    onClick={() => field.onChange(!field.value)}
                  >
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">Spending Limit</h3>
                      <p className="text-sm text-gray-500">Set an optional spending limit for this account</p>
                    </div>
                    <div className="ml-4">
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  </div>
                )}
              />

              {watchedEnableLimit && (
                <div className="space-y-4 pl-4 border-l-2 border-blue-100">
                  <Controller
                    name="limitPeriod"
                    control={control}
                    rules={validationRules.limitPeriod}
                    render={({ field }) => (
                      <Select
                        {...field}
                        label="Period"
                        placeholder="Select period"
                        options={PERIOD_OPTIONS}
                        errorText={errors.limitPeriod?.message}
                      />
                    )}
                  />

                  <Controller
                    name="limitAmount"
                    control={control}
                    rules={validationRules.limitAmount}
                    render={({ field }) => (
                      <TextInput
                        {...field}
                        value={field.value?.toString() ?? ''}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        label="Limit Amount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        errorText={errors.limitAmount?.message}
                      />
                    )}
                  />
                </div>
              )}
            </div>
          </div>
        </form>
      </Drawer.Content>
      <Drawer.Footer>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={closeDrawer}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleSubmit(onSubmit)} disabled={isPending}>
            {isPending ? 'Updating...' : 'Update Account'}
          </Button>
        </div>
      </Drawer.Footer>
    </Drawer>
  );
};
