import { useState } from 'react';
import { Controller, type Control, type FieldErrors, type FieldPath, type FieldValues } from 'react-hook-form';

import { TextInput, Tag } from '../../../../components';

interface AccountTypeSelectorProps<T extends FieldValues> {
  control: Control<T>;
  errors: FieldErrors<T>;
  value?: string;
  onChange?: (value: string) => void;
}

const COMMON_ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment' },
  { value: 'loan', label: 'Loan' },
  { value: 'business', label: 'Business' },
  { value: 'joint', label: 'Joint Account' },
];

export const AccountTypeSelector = <T extends FieldValues>({ control, errors }: AccountTypeSelectorProps<T>) => {
  const [showCustomInput, setShowCustomInput] = useState(false);

  return (
    <Controller
      name={'type' as FieldPath<T>}
      control={control}
      rules={{
        required: 'Account type is required',
        maxLength: {
          value: 50,
          message: 'Account type must be less than 50 characters',
        },
      }}
      render={({ field }) => {
        // Check if the current value is a custom type (not in predefined list)
        const isCustomType = field.value && !COMMON_ACCOUNT_TYPES.some((type) => type.value === field.value);
        const shouldShowCustomInput = showCustomInput || isCustomType;

        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Account Type</label>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {COMMON_ACCOUNT_TYPES.map((type) => (
                    <Tag
                      role="button"
                      key={type.value}
                      variant={field.value === type.value ? 'coral' : 'slate-outline'}
                      className="cursor-pointer transition-all hover:scale-105"
                      onClick={() => {
                        field.onChange(type.value);
                        setShowCustomInput(false);
                      }}
                    >
                      {type.label}
                    </Tag>
                  ))}
                  {!shouldShowCustomInput && (
                    <Tag
                      variant="mist-outline"
                      className="cursor-pointer transition-all hover:scale-105"
                      onClick={() => {
                        setShowCustomInput(true);
                        field.onChange('');
                      }}
                    >
                      + Custom Type
                    </Tag>
                  )}
                </div>
              </div>

              {shouldShowCustomInput && (
                <div className="mt-3">
                  <TextInput
                    {...field}
                    placeholder="Enter custom account type"
                    errorText={errors.type?.message as string}
                    maxLength={50}
                    autoFocus
                    helperText="Create your own account type"
                  />
                </div>
              )}
            </div>

            {/* Error Message */}
            {errors.type?.message && !shouldShowCustomInput && (
              <p className="text-xs text-danger-600 flex items-center gap-1">
                <svg
                  className="h-3 w-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {errors.type?.message as string}
              </p>
            )}
          </div>
        );
      }}
    />
  );
};
