import { createFileRoute } from '@tanstack/react-router';

import { useViewport } from '../../../../hooks';
import { DesktopOnboardingPage, MobileOnboardingPage, useOnboardingFlow } from '../../../../modules/auth-module';

export const Route = createFileRoute('/_protected/_new-user/onboarding/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { isDesktop } = useViewport();
  const onboardingFlow = useOnboardingFlow();

  if (isDesktop) {
    return <DesktopOnboardingPage onboardingFlow={onboardingFlow} />;
  }

  return <MobileOnboardingPage onboardingFlow={onboardingFlow} />;
}
