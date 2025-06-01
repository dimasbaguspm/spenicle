import { createFileRoute, Navigate, Outlet, useLocation, useRouter } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';

import { LineProgress, PageLayout } from '../../../components';
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
      <div className="min-h-screen bg-cream-50 flex flex-col">
        <main className="flex-1">
          <PageLayout background="cream" minHeight="screen" padding="lg">
            <div className="max-w-2xl mx-auto">
              {/* Progress Section - Only show for setup steps */}
              {currentStep.step > 0 && currentStep.step < currentStep.totalSteps && (
                <div className="mb-8 transition-all duration-200 ease-out">
                  <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-slate-900 transition-all duration-200">
                      {currentStep.title}
                    </h1>
                    <span className="text-sm text-slate-600 transition-all duration-200">
                      Step {currentStep.step} of {currentStep.totalSteps - 1}
                    </span>
                  </div>
                  <LineProgress value={progressPercentage} variant="coral" size="sm" animated={true} />
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
            </div>
          </PageLayout>
        </main>
      </div>
    </SessionGuard>
  );
}
