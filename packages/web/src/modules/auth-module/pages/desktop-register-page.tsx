import type { FC } from 'react';

import { RegisterForm } from '../components/register-form';
import { TrustedIndicators } from '../components/trusted-indicators';

export const DesktopRegisterPage: FC = () => {
  return (
    <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Register Form */}
        <RegisterForm />

        {/* Trust Indicators */}
        <TrustedIndicators />
      </div>
    </div>
  );
};
