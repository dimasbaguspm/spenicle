import { ProgressIndicator } from '@dimasbaguspm/versaur/feedbacks';
import { Text } from '@dimasbaguspm/versaur/primitive';
import { createFileRoute, Navigate, Outlet, useLocation, useRouter } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';

import { requireAuth, useSession } from '../../../hooks';
import { SessionGuard } from '../../../modules/auth-module';

export const Route = createFileRoute('/_protected/_new-user')({
  component: RouteComponent,
  beforeLoad: () => {
    requireAuth('/login');
  },
});

// Define the onboarding steps with their routes and metadata
const ONBOARDING_STEPS = [
  {
    route: '/onboarding',
    title: 'Welcome',
    step: 0,
    totalSteps: 3,
  },
  {
    route: '/onboarding/setup/account',
    title: 'Set Up Your First Account',
    step: 1,
    totalSteps: 3,
  },
  {
    route: '/onboarding/setup/category',
    title: 'Create Categories',
    step: 2,
    totalSteps: 3,
  },
  {
    route: '/onboarding/complete',
    title: "You're All Set!",
    step: 3,
    totalSteps: 3,
  },
];

function RouteComponent() {
  const location = useLocation();
  const router = useRouter();
  const { user } = useSession();

  if (user?.isOnboard === true) {
    return <Navigate to="/" replace />;
  }

  const currentStep = useMemo(() => {
    return ONBOARDING_STEPS.find((step) => step.route === location.pathname) ?? ONBOARDING_STEPS[0];
  }, [location.pathname]);

  const progressPercentage = (currentStep.step / currentStep.totalSteps) * 100;

  const handlePreloadNextStep = async () => {
    const nextStepIndex = currentStep.step + 1;
    if (nextStepIndex < ONBOARDING_STEPS.length) {
      const nextStep = ONBOARDING_STEPS[nextStepIndex];
      await router.preloadRoute({ to: nextStep.route });
    }
  };

  useEffect(() => {
    void handlePreloadNextStep();
  }, [currentStep.step, router]);

  return (
    <SessionGuard>
      {currentStep.step > 0 && currentStep.step < currentStep.totalSteps && (
        <div className="mb-8 transition-all duration-200 ease-out">
          <div className="flex justify-between items-center mb-4">
            <Text as="h1" fontSize="2xl" fontWeight="bold" color="tertiary">
              {currentStep.title}
            </Text>
            <Text as="p" fontSize="sm" color="tertiary">
              Step {currentStep.step} of {currentStep.totalSteps - 1}
            </Text>
          </div>
          <ProgressIndicator value={progressPercentage} color="primary" />
        </div>
      )}

      <div
        className="transition-all duration-200 ease-out transform"
        style={{
          opacity: 1,
          transform: 'translateY(0)',
        }}
      >
        <Outlet />
      </div>
    </SessionGuard>
  );
}
