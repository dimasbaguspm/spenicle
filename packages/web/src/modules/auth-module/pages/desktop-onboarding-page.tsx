import { OnboardingDashboard } from '../components/onboarding';
import type { UseOnboardingFlowReturn } from '../hooks/use-onboarding-flow';

export interface DesktopOnboardingPageProps {
  onboardingFlow: UseOnboardingFlowReturn;
}

/**
 * Desktop onboarding page component
 * Provides a comprehensive onboarding experience optimized for desktop screens
 * Accepts shared onboarding state for consistent behavior across viewport changes
 */
export function DesktopOnboardingPage({ onboardingFlow }: DesktopOnboardingPageProps) {
  return <OnboardingDashboard onboardingFlow={onboardingFlow} />;
}
