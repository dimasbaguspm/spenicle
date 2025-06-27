import { Shield, TrendingUp, BarChart3 } from 'lucide-react';
import type { FC } from 'react';

import { Brand } from '../../../components';
import { RegisterForm } from '../components/register-form';

export const MobileRegisterPage: FC = () => {
  return (
    <div className="min-h-screen bg-cream-50 flex flex-col px-6 py-8">
      {/* Compact Brand Section */}
      <div className="text-center mb-8 mt-8">
        <Brand as="div" size="md" className="justify-center mb-4" />
        <p className="text-slate-600 text-sm">Join thousands who track expenses smartly</p>
      </div>

      {/* Primary Register Form */}
      <div className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-start">
        {/* Override register form styling for mobile optimization */}
        <div className="[&_.max-w-2xl]:max-w-none [&_.mx-auto]:mx-0 [&_.p-8]:p-6">
          <RegisterForm />
        </div>

        {/* Minimal Trust Indicators */}
        <div className="mt-6 text-center pb-4">
          <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Secure
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Reliable
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              Trusted
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
