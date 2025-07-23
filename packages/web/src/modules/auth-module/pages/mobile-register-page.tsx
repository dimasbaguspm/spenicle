import { Brand, Text } from '@dimasbaguspm/versaur/primitive';
import type { FC } from 'react';

import { RegisterForm } from '../components/register-form';
import { TrustedIndicators } from '../components/trusted-indicators';

export const MobileRegisterPage: FC = () => {
  return (
    <div className="flex flex-col">
      <div className="flex flex-row items-center gap-4 justify-center mb-8">
        <Brand size="lg" name="spenicle" shape="rounded" />
        <Text as="h2" fontSize="xl" fontWeight="bold">
          Spenicle
        </Text>
      </div>

      {/* Primary Register Form */}
      <div className="w-full">
        <RegisterForm />

        {/* Minimal Trust Indicators */}
        <TrustedIndicators />
      </div>
    </div>
  );
};
