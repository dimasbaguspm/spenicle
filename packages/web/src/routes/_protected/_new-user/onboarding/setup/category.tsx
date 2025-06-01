import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { Button, FormLayout } from '../../../../../components';
import { DRAWER_IDS } from '../../../../../constants/drawer-id';
import { useDrawerDispatchListener, useDrawerRouterProvider } from '../../../../../providers/drawer-router';

export const Route = createFileRoute('/_protected/_new-user/onboarding/setup/category')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [categoryCreated, setCategoryCreated] = useState(false);

  const { openDrawer } = useDrawerRouterProvider();

  useDrawerDispatchListener({
    onSubmit: (drawerId) => {
      if (drawerId === DRAWER_IDS.ADD_CATEGORY) {
        setCategoryCreated(true);
        // Auto-navigate to next step after category creation
        setTimeout(() => {
          void navigate({ to: '/onboarding/complete' });
        }, 1500);
      }
    },
  });

  const handleOpenAddCategoryDrawer = async () => {
    await openDrawer('add-category');
  };

  const handleSkip = async () => {
    await navigate({ to: '/onboarding/complete' });
  };

  const handleBack = async () => {
    await navigate({ to: '/onboarding/setup/account' });
  };

  return (
    <>
      {/* Category Setup Content */}
      <div className="bg-white rounded-lg shadow-sm border border-mist-200 p-8 mb-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-sage-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">📂</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Organize with Categories</h2>
          <p className="text-slate-600">
            Categories help you understand where your money goes. Create categories like "Groceries", "Transportation",
            or "Entertainment" to track your spending patterns.
          </p>
        </div>

        {categoryCreated ? (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-success-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Category Created!</h3>
            <p className="text-slate-600 mb-4">Redirecting to completion...</p>
          </div>
        ) : (
          <>
            {/* Quick Category Suggestions */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-slate-700 mb-4">Popular categories to get you started:</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { name: '🍽️ Food & Dining', color: 'coral' },
                  { name: '🚗 Transportation', color: 'sage' },
                  { name: '🛍️ Shopping', color: 'mist' },
                  { name: '🏠 Housing', color: 'coral' },
                  { name: '💊 Healthcare', color: 'sage' },
                  { name: '🎬 Entertainment', color: 'mist' },
                ].map((category, index) => (
                  <div key={index} className="p-3 bg-slate-50 rounded-lg text-center">
                    <span className="text-sm text-slate-700">{category.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <FormLayout>
              <FormLayout.Field span="full">
                <div className="text-center">
                  <Button variant="sage" size="lg" onClick={handleOpenAddCategoryDrawer} className="min-w-48">
                    Create Your First Category
                  </Button>
                </div>
              </FormLayout.Field>
            </FormLayout>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="mist-outline" onClick={handleBack}>
          Previous Step
        </Button>
        {!categoryCreated && (
          <Button variant="slate" onClick={handleSkip} className="text-slate-500 hover:text-slate-700">
            Skip for now
          </Button>
        )}
      </div>
    </>
  );
}
