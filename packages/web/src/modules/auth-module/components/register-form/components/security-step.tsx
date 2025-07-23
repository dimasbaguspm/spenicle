import { TextInput } from '@dimasbaguspm/versaur/forms';
import { FormLayout } from '@dimasbaguspm/versaur/layouts';
import { Text } from '@dimasbaguspm/versaur/primitive';
import { Controller, useFormContext, type RegisterOptions } from 'react-hook-form';

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
    <FormLayout>
      <FormLayout.Column span={12}>
        <Text as="h2" fontSize="lg" fontWeight="semibold">
          Security Setup
        </Text>
      </FormLayout.Column>
      <FormLayout.Column span={12}>
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
              required
              autoFocus
              error={errors.password?.message}
            />
          )}
        />
      </FormLayout.Column>

      <FormLayout.Column span={12}>
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
              variant={field.value && watchedPassword !== field.value ? 'danger' : 'primary'}
              required
              error={errors.confirmPassword?.message}
            />
          )}
        />
      </FormLayout.Column>
    </FormLayout>
  );
}
