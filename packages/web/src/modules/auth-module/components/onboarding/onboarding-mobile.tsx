import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

import { Button } from '../../../../components';
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
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-white border-b border-mist-200 px-4 py-3 safe-area-top">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handleBack}
            disabled={!canGoBack}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              canGoBack
                ? 'bg-mist-100 text-slate-700 hover:bg-mist-200 active:bg-mist-300'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-coral-600" />
            <span className="font-medium text-slate-700">
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-mist-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-coral-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <MobileOnboardingStep currentStep={currentStep} progress={progress} />
      </div>

      <div className="sticky bottom-0 bg-white border-t border-mist-200 p-4 safe-area-bottom">
        <div className="flex gap-3">
          {canGoBack && (
            <Button variant="mist-outline" size="lg" onClick={handleBack} className="flex-1 min-h-12">
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
      iconRight={<ArrowRight className="h-4 w-4" />}
      variant="coral"
      size="lg"
      onClick={handleContinue}
      busy={currentStep === 'complete' && isCompletingOnboarding}
      className="flex-1 min-h-12 gap-2"
    >
      {getButtonText()}
    </Button>
  );
}
