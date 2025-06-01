import { Controller, useFormContext, type RegisterOptions } from 'react-hook-form';

import { TextInput, FormLayout } from '../../../../../components';
import type { RegisterFormData } from '../types';

interface GroupSetupStepProps {
  getFieldValidationRules: (field: keyof RegisterFormData) => RegisterOptions<RegisterFormData>;
}

export function GroupSetupStep({ getFieldValidationRules }: GroupSetupStepProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext<RegisterFormData>();

  return (
    <FormLayout columns={1} gap="md">
      <FormLayout.Title title="Group Setup" />
      <FormLayout.Field span="full">
        <Controller
          name="groupName"
          control={control}
          rules={getFieldValidationRules('groupName')}
          render={({ field }) => (
            <TextInput
              {...field}
              id="groupName"
              label="Group Name"
              type="text"
              placeholder="e.g., Family Budget, Personal Expenses"
              variant="default"
              size="lg"
              required
              errorText={errors.groupName?.message}
              helperText="Create a group to organize your expenses (you can invite others later)"
            />
          )}
        />
      </FormLayout.Field>

      <FormLayout.Field span="full">
        <Controller
          name="defaultCurrency"
          control={control}
          rules={getFieldValidationRules('defaultCurrency')}
          render={({ field }) => (
            <TextInput
              {...field}
              id="defaultCurrency"
              label="Default Currency"
              type="text"
              placeholder="USD"
              variant="default"
              size="lg"
              maxLength={3}
              required
              errorText={errors.defaultCurrency?.message}
              helperText="3-letter currency code (e.g., USD, EUR, GBP)"
            />
          )}
        />
      </FormLayout.Field>
    </FormLayout>
  );
}
