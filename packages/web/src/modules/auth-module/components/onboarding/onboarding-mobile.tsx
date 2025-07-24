import { ProgressIndicator } from '@dimasbaguspm/versaur/feedbacks';
import { Button, ButtonIcon, Icon, Text } from '@dimasbaguspm/versaur/primitive';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

import { cn } from '../../../../libs/utils';
import type { UseOnboardingFlowReturn, OnboardingStep, StepProgress } from '../../hooks/use-onboarding-flow';

import { MobileOnboardingStep } from './mobile-onboarding-step';

export interface OnboardingMobileProps {
  onboardingFlow: UseOnboardingFlowReturn;
}

export function OnboardingMobile({ onboardingFlow }: OnboardingMobileProps) {
  const {
    currentStep,
    progress,
    stepMetadata,
    currentStepIndex,
    isCompletingOnboarding,
    startOnboarding,
    openAccountDrawer,
    openCategoryDrawer,
    completeOnboarding,
    goToStep,
  } = onboardingFlow;

  const totalSteps = stepMetadata.length;
  const canGoBack = currentStepIndex > 0 && currentStep !== 'complete';
  const isLastStep = currentStepIndex === totalSteps - 1;

  const handleBack = () => {
    if (canGoBack) {
      const previousStep = stepMetadata[currentStepIndex - 1];
      goToStep(previousStep.key);
    }
  };

  const handleNext = () => {
    if (!isLastStep) {
      const nextStep = stepMetadata[currentStepIndex + 1];
      goToStep(nextStep.key);
    }
  };

  return (
    <div className="min-h-screen  flex flex-col">
      <div className="sticky top-0 z-10 bg-white border-b border-border safe-area-top">
        <div className="flex items-center justify-between px-4 py-4">
          <ButtonIcon
            as={ArrowLeft}
            size="md"
            onClick={handleBack}
            disabled={!canGoBack}
            aria-label="Go Back"
            variant="ghost"
          />

          <div className="flex items-center gap-4">
            <Icon as={Sparkles} size="sm" />
            <Text as="span">
              Step {currentStepIndex + 1} of {totalSteps}
            </Text>
          </div>
        </div>

        <ProgressIndicator value={((currentStepIndex + 1) / totalSteps) * 100} />
      </div>

      <div className="flex-1 flex flex-col">
        <MobileOnboardingStep currentStep={currentStep} progress={progress} />
      </div>

      <div className="sticky bottom-0 bg-white border-t border-border p-4 safe-area-bottom">
        <div className={cn('flex gap-3', canGoBack ? 'justify-between' : 'justify-end')}>
          {canGoBack && (
            <Button variant="neutral-outline" size="md" onClick={handleBack}>
              Back
            </Button>
          )}

          <ContinueButton
            currentStep={currentStep}
            progress={progress}
            isLastStep={isLastStep}
            isCompletingOnboarding={isCompletingOnboarding}
            onNext={handleNext}
            onStartOnboarding={startOnboarding}
            onOpenAccountDrawer={openAccountDrawer}
            onOpenCategoryDrawer={openCategoryDrawer}
            onCompleteOnboarding={completeOnboarding}
          />
        </div>
      </div>
    </div>
  );
}

interface ContinueButtonProps {
  currentStep: OnboardingStep;
  progress: StepProgress;
  isLastStep: boolean;
  isCompletingOnboarding: boolean;
  onNext: () => void;
  onStartOnboarding: () => void;
  onOpenAccountDrawer: () => void;
  onOpenCategoryDrawer: () => void;
  onCompleteOnboarding: () => Promise<void>;
}

function ContinueButton({
  currentStep,
  progress,
  isLastStep,
  isCompletingOnboarding,
  onNext,
  onStartOnboarding,
  onOpenAccountDrawer,
  onOpenCategoryDrawer,
  onCompleteOnboarding,
}: ContinueButtonProps) {
  const handleContinue = () => {
    switch (currentStep) {
      case 'welcome':
        onStartOnboarding();
        break;
      case 'account':
        if (!progress.account) {
          onOpenAccountDrawer();
        } else {
          onNext();
        }
        break;
      case 'categories':
        if (!progress.categories) {
          onOpenCategoryDrawer();
        } else {
          onNext();
        }
        break;
      case 'complete':
        void onCompleteOnboarding();
        break;
      default:
        if (!isLastStep) {
          onNext();
        }
        break;
    }
  };

  const getButtonText = () => {
    switch (currentStep) {
      case 'welcome':
        return "Let's Get Started";
      case 'account':
        return progress.account ? 'Continue' : 'Add Payment';
      case 'categories':
        return progress.categories ? 'Continue' : 'Create Category';
      case 'complete':
        return isCompletingOnboarding ? 'Setting up...' : 'Open Dashboard';
      default:
        return 'Continue';
    }
  };

  return (
    <Button
      variant="primary"
      size="md"
      onClick={handleContinue}
      disabled={currentStep === 'complete' && isCompletingOnboarding}
    >
      {getButtonText()}
      <Icon as={ArrowRight} size="md" color="neutral" />
    </Button>
  );
}
