import type { TextInputProps } from '../text-input';

// types for amount field component and its subcomponents
export interface AmountFieldProps extends Omit<TextInputProps, 'type' | 'variant' | 'size' | 'onChange'> {
  value?: number | string;
  onChange?: (value: number) => void;
  iconAriaLabel?: string;
  variant?: AmountFieldVariant;
  size?: AmountFieldSize;
}

export interface AmountFieldCalculatorModalProps {
  isOpen: boolean;
  initialValue: string;
  onSubmit: (value: number) => void;
  onClose: () => void;
}

// variant types aligned with design system
export type AmountFieldVariant = 'default' | 'coral' | 'sage' | 'mist' | 'slate';
export type AmountFieldSize = 'sm' | 'md' | 'lg' | 'xl';

// calculator state types for better type safety
export type CalculatorInputType = 'number' | 'operator' | 'equals' | null;

// security validation types
export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  errorMessage?: string;
}
