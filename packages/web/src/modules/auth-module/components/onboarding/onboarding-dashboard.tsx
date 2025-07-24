import { Brand, Text, Tile } from '@dimasbaguspm/versaur/primitive';

import type { UseOnboardingFlowReturn } from '../../hooks/use-onboarding-flow';

import { OnboardingContext, QuickTips } from './onboarding-context';
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
    isCompletingOnboarding,
    startOnboarding,
    openAccountDrawer,
    openCategoryDrawer,
    completeOnboarding,
  } = onboardingFlow;

  return (
    <div className="mx-auto max-w-6xl mt-8">
      {/* Clean Header with inline progress */}
      <div className="mb-12 flex items-center justify-between">
        <div className="flex flex-row items-center gap-4">
          <Brand name="spenicle" size="lg" shape="rounded" />
          <div>
            <Text as="h1" fontSize="lg">
              Spenicle
            </Text>
            <Text as="p" fontSize="sm">
              Le'ts get your expense tracking set up in just a few steps
            </Text>
          </div>
        </div>

        <Text as="span" fontSize="sm" fontWeight="medium">
          Step {stepMetadata.findIndex((step) => step.key === currentStep) + 1} of {stepMetadata.length}
        </Text>
      </div>

      {/* Main Content Area - Full Width Focus */}
      <div className="max-w-4xl grid grid-cols-12 gap-4 mx-auto">
        {/* Primary Step Content */}
        <Tile className="col-span-8">
          {currentStep === 'welcome' && <WelcomeStep onStart={startOnboarding} />}
          {currentStep === 'account' && <AccountStep onOpenDrawer={openAccountDrawer} isCompleted={progress.account} />}
          {currentStep === 'categories' && (
            <CategoriesStep onOpenDrawer={openCategoryDrawer} isCompleted={progress.categories} />
          )}
          {currentStep === 'complete' && (
            <CompleteStep onFinish={completeOnboarding} isLoading={isCompletingOnboarding} />
          )}
        </Tile>

        {/* Contextual Information - Integrated Below */}
        <div className="col-span-4 flex flex-col gap-4">
          <OnboardingContext currentStep={currentStep} />
          <QuickTips currentStep={currentStep} />
        </div>
      </div>
    </div>
  );
}
