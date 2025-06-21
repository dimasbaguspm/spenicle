import { ChevronDown } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { cn } from '../../libs/utils';

interface CheckboxGroupProps {
  label?: string;
  children: ReactNode;
  className?: string;
  errorText?: string;
  direction?: 'vertical' | 'horizontal';
  collapsed?: boolean; // add collapsed prop
}

export function CheckboxGroup({
  label,
  children,
  className,
  errorText,
  direction = 'horizontal',
  collapsed: collapsedProp = false,
}: CheckboxGroupProps) {
  // uncontrolled collapse/expand state
  const [collapsed, setCollapsed] = useState(collapsedProp);
  // choose flex direction based on prop
  const directionClass = direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap';
  return (
    <fieldset className={cn('flex', directionClass, 'gap-2 border-0 p-0 m-0', className)}>
      {label && (
        <legend
          className="block text-sm font-medium mb-2 text-slate-700 cursor-pointer select-none flex items-center justify-between gap-2"
          onClick={() => setCollapsed((v) => !v)}
          tabIndex={0}
          role="button"
          aria-expanded={!collapsed}
        >
          <span>{label}</span>
          <ChevronDown
            className="transition-transform duration-200 ml-auto"
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
            aria-hidden="true"
            size={16}
          />
        </legend>
      )}
      {!collapsed && (
        <>
          {children}
          {errorText && <span className="block mt-2 text-xs text-danger-600">{errorText}</span>}
        </>
      )}
    </fieldset>
  );
}
