import { BarChart3, Shield, TrendingUp } from 'lucide-react';
import type { FC } from 'react';

import { RegisterForm } from '../components/register-form';

export const DesktopRegisterPage: FC = () => {
  return (
    <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Register Form */}
        <RegisterForm />

        {/* Trust Indicators */}
        <div className="mt-8 text-center text-sm text-slate-400">
          <p className="mb-2">Join thousands of users who trust SpendLess</p>
          <div className="flex items-center justify-center gap-4">
            <span className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              Secure
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Reliable
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              Insightful
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
