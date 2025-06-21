import { type ReactNode } from 'react';

import { cn } from '../../libs/utils';

interface ChipGroupProps {
  label?: string;
  children: ReactNode;
  className?: string;
  errorText?: string;
  direction?: 'vertical' | 'horizontal';
}

export function ChipGroup({ label, children, className, errorText, direction = 'horizontal' }: ChipGroupProps) {
  const directionClass = direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap';
  return (
    <fieldset className={cn('flex', directionClass, 'gap-2 border-0 p-0 m-0', className)}>
      {label && <legend className="block text-sm font-medium mb-2 text-slate-700">{label}</legend>}
      {children}
      {errorText && <span className="block mt-2 text-xs text-danger-600">{errorText}</span>}
    </fieldset>
  );
}
