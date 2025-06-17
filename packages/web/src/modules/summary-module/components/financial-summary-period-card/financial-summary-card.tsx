import React, { createContext, type ReactNode } from 'react';

import { Tile } from '../../../../components';
import { cn, formatNumberCompact } from '../../../../libs/utils';

// Compound component context (future extensibility, currently unused)
const FinancialSummaryCardContext = createContext<object>({});

interface FinancialSummaryCardRootProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

const FinancialSummaryCardRoot: React.FC<FinancialSummaryCardRootProps> = ({ className = '', children, ...props }) => (
  <FinancialSummaryCardContext.Provider value={{}}>
    <Tile className={cn('p-3', className)} {...props}>
      {children}
    </Tile>
  </FinancialSummaryCardContext.Provider>
);

interface LabelProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}
const Label: React.FC<LabelProps> = ({ children, className, ...props }) => (
  <h3 className={cn('text-sm font-medium text-slate-500 mb-2', className)} {...props}>
    {children}
  </h3>
);

const VARIANT_CLASS_MAP = {
  coral: 'text-coral-600',
  sage: 'text-sage-600',
  mist: 'text-mist-600',
  slate: 'text-slate-600',
  success: 'text-success-500',
  info: 'text-info-500',
  warning: 'text-warning-500',
  danger: 'text-danger-500',
};

type FinancialSummaryCardVariant = keyof typeof VARIANT_CLASS_MAP;

interface ValueProps extends React.HTMLAttributes<HTMLParagraphElement> {
  amount: number;
  prefix?: string;
  variant: FinancialSummaryCardVariant;
}
const Value: React.FC<ValueProps> = ({ amount, prefix = '', className, variant, ...props }) => (
  <p className={cn('text-lg sm:text-xl md:text-2xl font-bold', VARIANT_CLASS_MAP[variant], className)} {...props}>
    {prefix}
    {formatNumberCompact(amount)}
  </p>
);

const SUB_LABEL_VARIANT_CLASS_MAP = {
  coral: 'text-coral-500',
  sage: 'text-sage-500',
  mist: 'text-mist-500',
  slate: 'text-slate-500',
  success: 'text-success-500',
  info: 'text-info-500',
  warning: 'text-warning-500',
  danger: 'text-danger-500',
};

type FinancialSummaryCardSubLabelVariant = keyof typeof SUB_LABEL_VARIANT_CLASS_MAP;

interface SubLabelProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
  variant?: FinancialSummaryCardSubLabelVariant;
}
const SubLabel: React.FC<SubLabelProps> = ({ children, className, variant, ...props }) => (
  <p className={cn('text-sm mt-1', variant ? SUB_LABEL_VARIANT_CLASS_MAP[variant] : '', className)} {...props}>
    {children}
  </p>
);

export const FinancialSummaryCard = Object.assign(FinancialSummaryCardRoot, {
  Label,
  Value,
  SubLabel,
});
