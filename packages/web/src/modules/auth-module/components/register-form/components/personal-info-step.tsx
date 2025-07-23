import { TextInput } from '@dimasbaguspm/versaur/forms';
import { FormLayout } from '@dimasbaguspm/versaur/layouts';
import { Text } from '@dimasbaguspm/versaur/primitive';
import { Controller, useFormContext, type RegisterOptions } from 'react-hook-form';

import type { RegisterFormData } from '../types';

interface PersonalInfoStepProps {
  getFieldValidationRules: (field: keyof RegisterFormData) => RegisterOptions<RegisterFormData>;
}

export function PersonalInfoStep({ getFieldValidationRules }: PersonalInfoStepProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext<RegisterFormData>();

  return (
    <FormLayout>
      <FormLayout.Column span={12}>
        <Text as="h2" fontSize="lg" fontWeight="semibold">
          Personal Information
        </Text>
      </FormLayout.Column>
      <FormLayout.Column span={12}>
        <Controller
          name="name"
          control={control}
          rules={getFieldValidationRules('name')}
          render={({ field }) => (
            <TextInput
              {...field}
              id="name"
              type="text"
              label="Full Name"
              placeholder="Enter your full name"
              required
              autoFocus
              error={errors.name?.message}
            />
          )}
        />
      </FormLayout.Column>

      <FormLayout.Column span={12}>
        <Controller
          name="email"
          control={control}
          rules={getFieldValidationRules('email')}
          render={({ field }) => (
            <TextInput
              {...field}
              id="email"
              type="email"
              label="Email Address"
              placeholder="Enter your email"
              required
              error={errors.email?.message}
            />
          )}
        />
      </FormLayout.Column>
    </FormLayout>
  );
}
