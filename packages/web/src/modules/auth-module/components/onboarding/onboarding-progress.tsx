import { StepProgress, type StepItem } from '../../../../components';
import type { OnboardingStep, StepProgress as OnboardingStepProgress } from '../../hooks/use-onboarding-flow';

export interface OnboardingProgressProps {
  currentStep: OnboardingStep;
  progress: OnboardingStepProgress;
  currentStepIndex: number;
  stepMetadata: ReadonlyArray<{
    readonly key: string;
    readonly label: string;
    readonly icon: React.ComponentType<{ className?: string }> | string;
  }>;
  /**
   * Layout variant for different placement contexts
   * - 'default': Full-width centered layout with labels
   * - 'compact': Minimal top-right corner layout
   */
  variant?: 'default' | 'compact';
}

/**
 * Visual progress indicator for onboarding flow
 * Shows current step, completed steps, and accessible steps
 */
export function OnboardingProgress({
  currentStep,
  progress,
  stepMetadata,
  variant = 'default',
}: OnboardingProgressProps) {
  // Convert stepMetadata to StepItem format
  const steps: StepItem[] = stepMetadata.map((step) => ({
    id: step.key,
    label: step.label,
    icon: step.icon,
  }));

  // Get completed step IDs
  const completedSteps = Object.entries(progress)
    .filter(([, isCompleted]) => isCompleted)
    .map(([stepKey]) => stepKey);

  // Compact variant for top-right placement
  if (variant === 'compact') {
    return (
      <div className="text-right">
        <div className="mb-3">
          <span className="text-sm font-medium text-slate-700">
            Step {stepMetadata.findIndex((step) => step.key === currentStep) + 1} of {stepMetadata.length}
          </span>
        </div>
        <StepProgress
          steps={steps}
          currentStep={currentStep}
          completedSteps={completedSteps}
          layout="compact"
          size="sm"
          showLabels={false}
          showConnectors={true}
          className="justify-end"
        />
      </div>
    );
  }

  // Default full-width layout
  return (
    <div className="mb-8">
      {/* Desktop layout - comfortable with labels */}
      <div className="hidden md:block">
        <StepProgress
          steps={steps}
          currentStep={currentStep}
          completedSteps={completedSteps}
          layout="comfortable"
          size="md"
          showLabels={true}
          showConnectors={true}
          className="justify-center"
        />
      </div>

      {/* Mobile layout - compact without labels */}
      <div className="block md:hidden">
        <StepProgress
          steps={steps}
          currentStep={currentStep}
          completedSteps={completedSteps}
          layout="compact"
          size="sm"
          showLabels={false}
          showConnectors={true}
          className="justify-center"
        />

        {/* Current step label for mobile */}
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-600">
            Step {stepMetadata.findIndex((step) => step.key === currentStep) + 1} of {stepMetadata.length}
          </p>
          <p className="text-base font-medium text-slate-900">
            {stepMetadata.find((step) => step.key === currentStep)?.label}
          </p>
        </div>
      </div>
    </div>
  );
}
