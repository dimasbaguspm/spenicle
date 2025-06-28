import { Brand, Tile } from '../../../../components';
import type { UseOnboardingFlowReturn } from '../../hooks/use-onboarding-flow';

import { OnboardingContext, QuickTips } from './onboarding-context';
import { OnboardingProgress } from './onboarding-progress';
import { AccountStep, CategoriesStep, CompleteStep, WelcomeStep } from './onboarding-steps';

export interface OnboardingDashboardProps {
  /**
   * Pre-configured onboarding flow state and actions
   * This should be created at the route level for state persistence across viewport changes
   */
  onboardingFlow: UseOnboardingFlowReturn;
}

/**
 * Main onboarding dashboard component with desktop-optimized layout
 * Provides a complete onboarding experience with progress tracking,
 * contextual information, and step-by-step guidance
 *
 * Note: This component now accepts pre-configured onboarding flow state
 * instead of creating its own, enabling state persistence across viewport changes
 */
export function OnboardingDashboard({ onboardingFlow }: OnboardingDashboardProps) {
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
  } = onboardingFlow;

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Desktop-optimized layout */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Clean Header with inline progress */}
        <div className="mb-12 flex items-center justify-between">
          <Brand className="text-left" subtitle="Let's get your expense tracking set up in just a few steps" />

          <OnboardingProgress
            currentStep={currentStep}
            progress={progress}
            currentStepIndex={currentStepIndex}
            stepMetadata={stepMetadata}
            variant="compact"
          />
        </div>

        {/* Main Content Area - Full Width Focus */}
        <div className="max-w-4xl flex flex-row justify-between gap-4 mx-auto">
          {/* Primary Step Content */}
          <Tile className="p-8 mb-8">
            {currentStep === 'welcome' && <WelcomeStep onStart={startOnboarding} />}
            {currentStep === 'account' && (
              <AccountStep onOpenDrawer={openAccountDrawer} isCompleted={progress.account} />
            )}
            {currentStep === 'categories' && (
              <CategoriesStep onOpenDrawer={openCategoryDrawer} isCompleted={progress.categories} />
            )}
            {currentStep === 'complete' && (
              <CompleteStep onFinish={completeOnboarding} isLoading={isCompletingOnboarding} />
            )}
          </Tile>

          {/* Contextual Information - Integrated Below */}
          <div className="flex flex-col gap-4">
            <OnboardingContext currentStep={currentStep} />
            <QuickTips currentStep={currentStep} />
          </div>
        </div>
      </div>
    </div>
  );
}
