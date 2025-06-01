import { Controller, useFormContext, type RegisterOptions } from 'react-hook-form';

import { TextInput, FormLayout } from '../../../../../components';
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
      <FormLayout.Title title="Personal Information" />
      <FormLayout.Field span="full">
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
              variant="default"
              size="lg"
              required
              errorText={errors.name?.message}
            />
          )}
        />
      </FormLayout.Field>

      <FormLayout.Field span="full">
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
              variant="default"
              size="lg"
              required
              errorText={errors.email?.message}
            />
          )}
        />
      </FormLayout.Field>
    </FormLayout>
  );
}
