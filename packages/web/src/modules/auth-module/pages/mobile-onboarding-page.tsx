import { OnboardingMobile } from '../components/onboarding';
import type { UseOnboardingFlowReturn } from '../hooks/use-onboarding-flow';

export interface MobileOnboardingPageProps {
  onboardingFlow: UseOnboardingFlowReturn;
}

/**
 * Mobile onboarding page component
 * Uses a mobile-optimized full-screen flow designed for touch interactions
 * Accepts shared onboarding state for consistent behavior across viewport changes
 */
export function MobileOnboardingPage({ onboardingFlow }: MobileOnboardingPageProps) {
  return <OnboardingMobile onboardingFlow={onboardingFlow} />;
}
