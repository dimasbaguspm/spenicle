import { cva, type VariantProps } from 'class-variance-authority';
import { Delete, Plus, Minus, Divide, X } from 'lucide-react';
import React, { forwardRef, useEffect } from 'react';

import { cn } from '../../libs/utils';

const numpadVariants = cva('grid grid-cols-4 gap-2 p-4 bg-cream-50 border border-mist-200', {
  variants: {
    size: {
      sm: 'gap-1 p-2',
      md: 'gap-2 p-4',
      lg: 'gap-3 p-6',
    },
    variant: {
      default: 'bg-cream-50 border-mist-200',
      coral: 'bg-coral-50 border-coral-200',
      sage: 'bg-sage-50 border-sage-200',
      mist: 'bg-mist-50 border-mist-200',
      slate: 'bg-slate-50 border-slate-200',
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'default',
  },
});

const numpadButtonVariants = cva(
  'inline-flex items-center justify-center rounded font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 active:scale-95',
  {
    variants: {
      variant: {
        default: 'bg-white text-slate-700 hover:bg-mist-50 focus:ring-mist-300 border border-mist-200 shadow-sm',
        coral: 'bg-white text-coral-700 hover:bg-coral-50 focus:ring-coral-300 border border-coral-200 shadow-sm',
        sage: 'bg-white text-sage-700 hover:bg-sage-50 focus:ring-sage-300 border border-sage-200 shadow-sm',
        mist: 'bg-white text-mist-700 hover:bg-mist-50 focus:ring-mist-300 border border-mist-200 shadow-sm',
        slate: 'bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-300 border border-slate-200 shadow-sm',
      },
      buttonType: {
        number: '',
        action: 'font-semibold',
        special: 'bg-coral-500 text-white hover:bg-coral-600 border-coral-500',
        clear: 'bg-danger-500 text-white hover:bg-danger-600 border-danger-500',
      },
      size: {
        sm: 'h-10 text-sm min-w-[2.5rem]',
        md: 'h-12 text-base min-w-[3rem]',
        lg: 'h-14 text-lg min-w-[3.5rem]',
      },
    },
    defaultVariants: {
      variant: 'default',
      buttonType: 'number',
      size: 'md',
    },
  }
);

export interface NumpadProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'>,
    VariantProps<typeof numpadVariants> {
  onNumberPress?: (number: string) => void;
  onDecimalPress?: () => void;
  onBackspace?: () => void;
  onClear?: () => void;
  onEnter?: () => void;
  onOperatorPress?: (operator: string) => void;
  showDecimal?: boolean;
  showClear?: boolean;
  showEnter?: boolean;
  disabled?: boolean;
  buttonVariant?: 'default' | 'coral' | 'sage' | 'mist' | 'slate';
}

interface NumpadButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'coral' | 'sage' | 'mist' | 'slate';
  buttonType?: 'number' | 'action' | 'special' | 'clear';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const NumpadButton = forwardRef<HTMLButtonElement, NumpadButtonProps>(
  ({ className, variant = 'default', buttonType = 'number', size = 'md', children, ...props }, ref) => {
    return (
      <button className={cn(numpadButtonVariants({ variant, buttonType, size, className }))} ref={ref} {...props}>
        {children}
      </button>
    );
  }
);

NumpadButton.displayName = 'NumpadButton';

export const Numpad = forwardRef<HTMLDivElement, NumpadProps>(
  (
    {
      className,
      size = 'md',
      variant = 'default',
      onNumberPress,
      onDecimalPress,
      onBackspace,
      onClear,
      onEnter,
      onOperatorPress,
      disabled = false,
      buttonVariant = 'default',
      ...props
    },
    ref
  ) => {
    const handleNumberPress = (number: string) => {
      if (!disabled && onNumberPress) {
        onNumberPress(number);
      }
    };
    const handleOperatorPress = (operator: string) => {
      if (!disabled && onOperatorPress) {
        onOperatorPress(operator);
      }
    };

    const handleDecimalPress = () => {
      if (!disabled && onDecimalPress) {
        onDecimalPress();
      }
    };

    const handleBackspace = () => {
      if (!disabled && onBackspace) {
        onBackspace();
      }
    };

    const handleClear = () => {
      if (!disabled && onClear) {
        onClear();
      }
    };

    const handleEnter = () => {
      if (!disabled && onEnter) {
        onEnter();
      }
    };

    const buttonSize = size ?? 'md';

    // Keyboard event handler
    useEffect(() => {
      function handleKeyDown(e: KeyboardEvent) {
        if (disabled) return;

        const key = e.key;
        if (key >= '0' && key <= '9') {
          handleNumberPress(key);
        } else if (key === '.') {
          handleDecimalPress();
        } else if (key === '+' || key === '-' || key === '*' || key === '/' || key === '=') {
          handleOperatorPress(key);
        } else if (key === 'Enter') {
          handleEnter();
        } else if (key === 'Backspace') {
          handleBackspace();
        } else if (key.toLowerCase() === 'c') {
          handleClear();
        }
      }
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [disabled]);

    return (
      <div
        className={cn(
          'grid grid-cols-4 gap-2 p-4 bg-cream-50 border border-mist-200',
          numpadVariants({ size, variant }),
          className
        )}
        ref={ref}
        {...props}
      >
        {/* Row 1 */}
        {['7', '8', '9'].map((number) => (
          <NumpadButton
            key={number}
            variant={buttonVariant}
            size={buttonSize}
            disabled={disabled}
            onClick={() => handleNumberPress(number)}
            aria-label={`Number ${number}`}
          >
            {number}
          </NumpadButton>
        ))}
        <NumpadButton
          variant={buttonVariant}
          buttonType="action"
          size={buttonSize}
          disabled={disabled}
          onClick={() => handleOperatorPress('-')}
          aria-label="Minus"
        >
          <Minus className="h-4 w-4" />
        </NumpadButton>
        {/* Row 2 */}
        {['4', '5', '6'].map((number) => (
          <NumpadButton
            key={number}
            variant={buttonVariant}
            size={buttonSize}
            disabled={disabled}
            onClick={() => handleNumberPress(number)}
            aria-label={`Number ${number}`}
          >
            {number}
          </NumpadButton>
        ))}
        <NumpadButton
          variant={buttonVariant}
          buttonType="action"
          size={buttonSize}
          disabled={disabled}
          onClick={() => handleOperatorPress('/')}
          aria-label="Divide"
        >
          <Divide className="h-4 w-4" />
        </NumpadButton>
        {/* Row 3 */}
        {['1', '2', '3'].map((number) => (
          <NumpadButton
            key={number}
            variant={buttonVariant}
            size={buttonSize}
            disabled={disabled}
            onClick={() => handleNumberPress(number)}
            aria-label={`Number ${number}`}
          >
            {number}
          </NumpadButton>
        ))}
        <NumpadButton
          variant={buttonVariant}
          buttonType="action"
          size={buttonSize}
          disabled={disabled}
          onClick={() => handleOperatorPress('*')}
          aria-label="Multiply"
        >
          <X className="h-4 w-4" />
        </NumpadButton>
        {/* Row 4 */}
        <NumpadButton
          variant={buttonVariant}
          buttonType="action"
          size={buttonSize}
          disabled={true} // Disable decimal button
          onClick={handleDecimalPress}
          aria-label="Decimal point"
        >
          .
        </NumpadButton>
        <NumpadButton
          variant={buttonVariant}
          size={buttonSize}
          disabled={disabled}
          onClick={() => handleNumberPress('0')}
          aria-label="Number 0"
        >
          0
        </NumpadButton>
        <NumpadButton
          variant={buttonVariant}
          buttonType="action"
          size={buttonSize}
          disabled={disabled}
          onClick={() => handleOperatorPress('+')}
          aria-label="Plus"
        >
          <Plus className="h-4 w-4" />
        </NumpadButton>
        <NumpadButton
          variant={buttonVariant}
          buttonType="special"
          size={buttonSize}
          disabled={disabled}
          onClick={() => handleOperatorPress('=')}
          aria-label="Equals"
        >
          =
        </NumpadButton>

        {/* Row 5 */}
        <NumpadButton
          buttonType="clear"
          size={buttonSize}
          disabled={disabled}
          onClick={handleClear}
          aria-label="Clear all"
        >
          <Delete className="h-4 w-4 mr-1" />C
        </NumpadButton>
        <div />
        <div />
        <NumpadButton
          variant="coral"
          buttonType="special"
          size={buttonSize}
          disabled={disabled}
          onClick={handleEnter}
          aria-label="Submit"
        >
          Submit
        </NumpadButton>
      </div>
    );
  }
);

export { numpadVariants, numpadButtonVariants };
