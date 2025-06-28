import { cva, type VariantProps } from 'class-variance-authority';
import { CheckCircle, Circle } from 'lucide-react';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const stepProgressVariants = cva('flex items-center gap-2', {
  variants: {
    variant: {
      default: '',
      coral: '',
      sage: '',
      mist: '',
      slate: '',
    },
    size: {
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
    },
    orientation: {
      horizontal: 'flex-row',
      vertical: 'flex-col gap-4',
    },
    layout: {
      compact: '', // Mobile-friendly compact layout
      comfortable: '', // Desktop-friendly comfortable layout
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
    orientation: 'horizontal',
    layout: 'comfortable',
  },
});

const stepVariants = cva('flex items-center transition-all duration-300', {
  variants: {
    layout: {
      compact: 'gap-2',
      comfortable: 'gap-3',
    },
    orientation: {
      horizontal: 'flex-row',
      vertical: 'flex-col text-center',
    },
  },
  defaultVariants: {
    layout: 'comfortable',
    orientation: 'horizontal',
  },
});

const stepIconVariants = cva('flex items-center justify-center rounded-full border-2 transition-all duration-300', {
  variants: {
    state: {
      completed: 'border-success-500 bg-success-500 text-white',
      active: 'border-coral-500 bg-coral-500 text-white',
      pending: 'border-mist-300 bg-white text-slate-600',
      disabled: 'border-slate-200 bg-slate-100 text-slate-400',
    },
    size: {
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-12 w-12',
    },
    layout: {
      compact: '',
      comfortable: '',
    },
  },
  defaultVariants: {
    state: 'pending',
    size: 'md',
    layout: 'comfortable',
  },
});

const stepLabelVariants = cva('font-medium transition-colors duration-300', {
  variants: {
    state: {
      completed: 'text-success-600',
      active: 'text-coral-600',
      pending: 'text-slate-600',
      disabled: 'text-slate-400',
    },
    size: {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    },
    layout: {
      compact: '',
      comfortable: '',
    },
    orientation: {
      horizontal: '',
      vertical: 'mt-2',
    },
  },
  defaultVariants: {
    state: 'pending',
    size: 'md',
    layout: 'comfortable',
    orientation: 'horizontal',
  },
});

const connectorVariants = cva('transition-colors duration-300', {
  variants: {
    state: {
      completed: 'text-success-400',
      active: 'text-coral-400',
      pending: 'text-slate-300',
      disabled: 'text-slate-200',
    },
    orientation: {
      horizontal: 'h-0.5 flex-1 bg-current mx-2',
      vertical: 'w-0.5 h-8 bg-current my-2',
    },
    layout: {
      compact: '',
      comfortable: '',
    },
  },
  defaultVariants: {
    state: 'pending',
    orientation: 'horizontal',
    layout: 'comfortable',
  },
});

export interface StepItem {
  /** Unique identifier for the step */
  id: string;
  /** Display label for the step */
  label: string;
  /** Optional icon for the step (React component, emoji, or string) */
  icon?: React.ComponentType<{ className?: string }> | string;
  /** Optional description for the step */
  description?: string;
}

export interface StepProgressProps extends VariantProps<typeof stepProgressVariants> {
  /** Array of steps to display */
  steps: StepItem[];
  /** Current active step ID */
  currentStep: string;
  /** Array of completed step IDs */
  completedSteps: string[];
  /** Whether to show step labels */
  showLabels?: boolean;
  /** Whether to show step descriptions */
  showDescriptions?: boolean;
  /** Whether to show connectors between steps */
  showConnectors?: boolean;
  /** Custom class name */
  className?: string;
  /** Callback when a step is clicked (if interactive) */
  onStepClick?: (stepId: string) => void;
  /** Whether steps are clickable */
  interactive?: boolean;
}

/**
 * StepProgress - A flexible step indicator component
 *
 * Features:
 * - Responsive design with compact and comfortable layouts
 * - Horizontal and vertical orientations
 * - Customizable icons and colors
 * - Interactive step navigation
 * - Accessibility support
 *
 * @example
 * ```tsx
 * const steps = [
 *   { id: 'welcome', label: 'Welcome', icon: '👋' },
 *   { id: 'account', label: 'Add Account', icon: '🏦' },
 *   { id: 'categories', label: 'Categories', icon: '📂' },
 * ];
 *
 * <StepProgress
 *   steps={steps}
 *   currentStep="account"
 *   completedSteps={['welcome']}
 *   layout="compact"
 *   size="sm"
 * />
 * ```
 */
export const StepProgress = forwardRef<HTMLDivElement, StepProgressProps>(
  (
    {
      steps,
      currentStep,
      completedSteps,
      showLabels = true,
      showDescriptions = false,
      showConnectors = true,
      interactive = false,
      onStepClick,
      variant,
      size,
      orientation,
      layout,
      className,
      ...props
    },
    ref
  ) => {
    const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

    const getStepState = (stepIndex: number, stepId: string) => {
      if (completedSteps.includes(stepId)) return 'completed';
      if (stepId === currentStep) return 'active';
      if (stepIndex <= currentStepIndex) return 'pending';
      return 'disabled';
    };

    const getConnectorState = (stepIndex: number) => {
      if (stepIndex < currentStepIndex || completedSteps.includes(steps[stepIndex].id)) return 'completed';
      if (stepIndex === currentStepIndex) return 'active';
      return 'pending';
    };

    return (
      <div
        ref={ref}
        className={cn(stepProgressVariants({ variant, size, orientation, layout }), className)}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={steps.length - 1}
        aria-valuenow={currentStepIndex}
        aria-valuetext={`Step ${currentStepIndex + 1} of ${steps.length}: ${steps[currentStepIndex]?.label}`}
        {...props}
      >
        {steps.map((step, index) => {
          const stepState = getStepState(index, step.id);
          const isClickable = interactive && onStepClick && stepState !== 'disabled';

          return (
            <div key={step.id} className="flex items-center">
              {/* Step indicator */}
              <div className={cn(stepVariants({ layout, orientation }))}>
                <button
                  type="button"
                  onClick={isClickable ? () => onStepClick(step.id) : undefined}
                  disabled={!isClickable}
                  className={cn(
                    stepIconVariants({ state: stepState, size, layout }),
                    isClickable && 'cursor-pointer hover:scale-105',
                    !isClickable && 'cursor-default'
                  )}
                  aria-label={`${step.label}${stepState === 'completed' ? ' (completed)' : stepState === 'active' ? ' (current)' : ''}`}
                >
                  {stepState === 'completed' ? (
                    <CheckCircle className={cn(size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5')} />
                  ) : step.icon ? (
                    typeof step.icon === 'string' ? (
                      <span className={cn(size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base')}>
                        {step.icon}
                      </span>
                    ) : (
                      <step.icon className={cn(size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5')} />
                    )
                  ) : (
                    <Circle className={cn(size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5')} />
                  )}
                </button>

                {/* Step label and description */}
                {(showLabels || showDescriptions) && orientation === 'horizontal' && (
                  <div className="flex flex-col">
                    {showLabels && (
                      <span className={cn(stepLabelVariants({ state: stepState, size, layout, orientation }))}>
                        {step.label}
                      </span>
                    )}
                    {showDescriptions && step.description && (
                      <span className={cn('text-xs text-slate-500 mt-1', layout === 'compact' && 'hidden sm:block')}>
                        {step.description}
                      </span>
                    )}
                  </div>
                )}

                {/* Vertical layout labels */}
                {showLabels && orientation === 'vertical' && (
                  <span className={cn(stepLabelVariants({ state: stepState, size, layout, orientation }))}>
                    {step.label}
                  </span>
                )}
              </div>

              {/* Connector line */}
              {showConnectors && index < steps.length - 1 && (
                <div
                  className={cn(connectorVariants({ state: getConnectorState(index), orientation, layout }))}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }
);

StepProgress.displayName = 'StepProgress';
