import { Controller, useFormContext, type RegisterOptions } from 'react-hook-form';

import { TextInput, FormLayout } from '../../../../../components';
import type { RegisterFormData } from '../types';

interface SecurityStepProps {
  watchedPassword: string;
  getFieldValidationRules: (field: keyof RegisterFormData) => RegisterOptions<RegisterFormData>;
}

export function SecurityStep({ watchedPassword, getFieldValidationRules }: SecurityStepProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext<RegisterFormData>();

  return (
    <FormLayout columns={1} gap="md">
      <FormLayout.Title title="Security Setup" />
      <FormLayout.Field span="full">
        <Controller
          name="password"
          control={control}
          rules={getFieldValidationRules('password')}
          render={({ field }) => (
            <TextInput
              {...field}
              id="password"
              type="password"
              label="Password"
              placeholder="Create a password (min 8 characters)"
              variant="default"
              size="lg"
              required
              errorText={errors.password?.message}
            />
          )}
        />
      </FormLayout.Field>

      <FormLayout.Field span="full">
        <Controller
          name="confirmPassword"
          control={control}
          rules={getFieldValidationRules('confirmPassword')}
          render={({ field }) => (
            <TextInput
              {...field}
              id="confirmPassword"
              type="password"
              label="Confirm Password"
              placeholder="Confirm your password"
              variant={field.value && watchedPassword !== field.value ? 'error' : 'default'}
              size="lg"
              required
              errorText={errors.confirmPassword?.message}
            />
          )}
        />
      </FormLayout.Field>
    </FormLayout>
  );
}
