import { Repeat, TrendingDown, TrendingUp } from 'lucide-react';
import React from 'react';

import { Segment } from '../../../../components';

export type TransactionType = 'expense' | 'income' | 'transfer';

export interface TransactionTypeSelectorProps {
  value: TransactionType | '';
  onChange: (value: string) => void;
  errorText?: string;
  disabled?: boolean;
  className?: string;
  showAllOption?: boolean; // New prop to control 'All' option
}

const BASE_TRANSACTION_TYPE_OPTIONS = [
  {
    label: 'Expense',
    value: 'expense',
    icon: <TrendingDown className="h-4 w-4" />,
  },
  {
    label: 'Income',
    value: 'income',
    icon: <TrendingUp className="h-4 w-4" />,
  },
  {
    label: 'Transfer',
    value: 'transfer',
    icon: <Repeat className="h-4 w-4" />,
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
    <Segment
      label="Transaction Type"
      options={options}
      value={value ?? ''}
      onValueChange={onChange}
      errorText={errorText}
      className={className}
      disabled={disabled}
    />
  );
};
