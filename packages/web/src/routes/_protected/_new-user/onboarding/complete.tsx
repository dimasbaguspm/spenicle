import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { CheckCircle } from 'lucide-react';

import { Button } from '../../../../components';
import { useApiUpdateCurrentUserMutation } from '../../../../hooks';

export const Route = createFileRoute('/_protected/_new-user/onboarding/complete')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [updateUser, , { isPending }] = useApiUpdateCurrentUserMutation();

  const handleClickOpenDashboard = async () => {
    await updateUser({
      isOnboard: true,
    });
    await navigate({ to: '/' });
  };

  return (
    <div className="text-center">
      {/* Success Animation */}
      <div className="mb-8">
        <div className="w-24 h-24 mx-auto mb-6 bg-success-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-success-600" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">You're All Set! 🎉</h1>
        <p className="text-lg text-slate-600 mb-8">
          Congratulations! You've successfully set up your SpendLess account.
        </p>
      </div>

      {/* Setup Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-mist-200 p-8 mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">What you've accomplished:</h2>
        <div className="space-y-4 text-left">
          <div className="flex items-center gap-4">
            <CheckCircle className="w-6 h-6 text-success-600 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-slate-900">Account Created</h3>
              <p className="text-sm text-slate-600">You can add accounts later from the accounts page</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <CheckCircle className="w-6 h-6 text-success-600 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-slate-900">Categories Organized</h3>
              <p className="text-sm text-slate-600">You can create categories later to organize your transactions</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <CheckCircle className="w-6 h-6 text-success-600 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-slate-900">Ready to Track</h3>
              <p className="text-sm text-slate-600">Your financial management journey begins now!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="space-y-4">
        <Button variant="coral" size="lg" className="min-w-48" onClick={handleClickOpenDashboard} busy={isPending}>
          Go to Dashboard
        </Button>
        <div className="text-slate-600">
          <p>Ready to start tracking your expenses and achieving your financial goals!</p>
        </div>
      </div>
    </div>
  );
}
