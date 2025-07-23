import { Icon, Text } from '@dimasbaguspm/versaur/primitive';
import { BarChart3, Shield, TrendingUp } from 'lucide-react';
import type { FC } from 'react';

export const TrustedIndicators: FC = () => {
  return (
    <div className="flex items-center justify-center gap-4 mt-8 ">
      <div className="flex items-center gap-1">
        <Icon as={Shield} size="sm" color="tertiary" />
        <Text as="span" className="text-xs" color="tertiary">
          Secure
        </Text>
      </div>
      <div className="flex items-center gap-1">
        <Icon as={TrendingUp} size="sm" color="tertiary" />
        <Text as="span" className="text-xs" color="tertiary">
          Reliable
        </Text>
      </div>
      <div className="flex items-center gap-1">
        <Icon as={BarChart3} size="sm" color="tertiary" />
        <Text as="span" className="text-xs" color="tertiary">
          Insightful
        </Text>
      </div>
    </div>
  );
};
