import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { Button, FormLayout } from '../../../../../components';
import { DRAWER_IDS } from '../../../../../constants/drawer-id';
import { useDrawerDispatchListener, useDrawerRouterProvider } from '../../../../../providers/drawer-router';

export const Route = createFileRoute('/_protected/_new-user/onboarding/setup/account')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [accountCreated, setAccountCreated] = useState(false);

  const { openDrawer } = useDrawerRouterProvider();

  useDrawerDispatchListener({
    onSubmit: (drawerId) => {
      if (drawerId === DRAWER_IDS.ADD_ACCOUNT) {
        setAccountCreated(true);
        // Auto-navigate to next step after account creation
        setTimeout(() => {
          void navigate({ to: '/onboarding/setup/category' });
        }, 1500);
      }
    },
  });

  const handleOpenAddAccountDrawer = async () => {
    await openDrawer('add-account');
  };

  const handleSkip = async () => {
    await navigate({ to: '/onboarding/setup/category' });
  };

  return (
    <>
      {/* Account Setup Content */}
      <div className="bg-white rounded-lg shadow-sm border border-mist-200 p-8 mb-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-coral-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">🏦</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Add Your First Account</h2>
          <p className="text-slate-600">
            Start by adding a bank account, credit card, or any account you use for expenses. This helps you track where
            your money is coming from and going to.
          </p>
        </div>

        {accountCreated ? (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-success-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Account Created!</h3>
            <p className="text-slate-600 mb-4">Redirecting to the next step...</p>
          </div>
        ) : (
          <FormLayout>
            <FormLayout.Field span="full">
              <div className="text-center">
                <Button variant="coral" size="lg" onClick={handleOpenAddAccountDrawer} className="min-w-48">
                  Add Your First Account
                </Button>
              </div>
            </FormLayout.Field>
          </FormLayout>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="mist-outline" onClick={() => navigate({ to: '/onboarding' })}>
          Back
        </Button>
        {!accountCreated && (
          <Button variant="slate" onClick={handleSkip} className="text-slate-500 hover:text-slate-700">
            Skip for now
          </Button>
        )}
      </div>
    </>
  );
}
