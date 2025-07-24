import { SegmentSingleInput } from '@dimasbaguspm/versaur/forms';
import { Icon } from '@dimasbaguspm/versaur/primitive';
import { Repeat, TrendingDown, TrendingUp } from 'lucide-react';
import React from 'react';

export type TransactionType = 'expense' | 'income' | 'transfer';

export interface TransactionTypeSelectorProps {
  value: string;
  onChange: (value: string | null) => void;
  errorText?: string;
  disabled?: boolean;
  className?: string;
  showAllOption?: boolean; // New prop to control 'All' option
}

const BASE_TRANSACTION_TYPE_OPTIONS = [
  {
    label: 'Expense',
    value: 'expense',
    icon: TrendingDown,
  },
  {
    label: 'Income',
    value: 'income',
    icon: TrendingUp,
  },
  {
    label: 'Transfer',
    value: 'transfer',
    icon: Repeat,
  },
];

export const TransactionTypeSelector: React.FC<TransactionTypeSelectorProps> = ({
  value,
  onChange,
  errorText,
  disabled,
  className,
  showAllOption = false,
}) => {
  const options = showAllOption
    ? [{ label: 'All', value: '', icon: null }, ...BASE_TRANSACTION_TYPE_OPTIONS]
    : BASE_TRANSACTION_TYPE_OPTIONS;

  return (
    <SegmentSingleInput
      name="transactionType"
      label="Transaction Type"
      value={value ?? ''}
      onChange={onChange}
      fullWidth
      error={errorText}
      className={className}
      disabled={disabled}
    >
      {options.map((option) => (
        <SegmentSingleInput.Option key={option.value} value={option.value} className="flex flex-row text-center">
          {option.icon && (
            <Icon as={option.icon} size="sm" className="mr-2" color={value === option.value ? 'neutral' : 'ghost'} />
          )}
          {option.label}
        </SegmentSingleInput.Option>
      ))}
    </SegmentSingleInput>
  );
};
