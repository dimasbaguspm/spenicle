import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { Button } from '../../../../components';

export const Route = createFileRoute('/_protected/_new-user/onboarding/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleGetStarted = async () => {
    setIsNavigating(true);
    try {
      await navigate({ to: '/onboarding/setup/account' });
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(false);
    }
  };

  return (
    <>
      <div className="text-center mb-12">
        <div className="w-24 h-24 mx-auto mb-6 bg-coral-100 rounded-full flex items-center justify-center">
          <span className="text-4xl">💰</span>
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Welcome to <span className="text-coral-600">SpendLess</span>!
        </h1>
        <p className="text-lg text-slate-600 mb-8">
          Let's get you set up with everything you need to start tracking your expenses effectively.
        </p>
      </div>

      {/* Onboarding Steps Preview */}
      <div className="bg-white rounded-lg shadow-sm border border-mist-200 p-8 mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">What we'll set up:</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-coral-100 flex items-center justify-center">
              <span className="text-coral-600 font-semibold">1</span>
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Add Your First Account</h3>
              <p className="text-sm text-slate-600">Set up a bank account, credit card, or cash account</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center">
              <span className="text-sage-600 font-semibold">2</span>
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Create Categories</h3>
              <p className="text-sm text-slate-600">Organize your expenses with custom categories</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="text-center">
        <Button
          variant="coral"
          size="lg"
          onClick={handleGetStarted}
          busy={isNavigating}
          className="px-12 py-4 text-lg font-semibold transition-all duration-150"
        >
          {isNavigating ? 'Starting...' : 'Get Started'}
        </Button>
      </div>

      <div className="text-center mt-6">
        <p className="text-sm text-slate-500">This should only take a couple of minutes to complete.</p>
      </div>
    </>
  );
}
