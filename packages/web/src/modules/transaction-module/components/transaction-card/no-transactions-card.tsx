import { Icon, Text } from '@dimasbaguspm/versaur/primitive';
import { Clipboard } from 'lucide-react';
import React from 'react';

export interface NoTransactionsCardProps {
  message?: string;
}

export const NoTransactionsCard: React.FC<NoTransactionsCardProps> = ({ message = 'No transactions' }) => (
  <div className="flex flex-col items-center justify-center p-8">
    <Icon as={Clipboard} size="xl" className="mb-2" color="tertiary" />

    <Text as="p" color="ghost" fontSize="sm">
      {message}
    </Text>
  </div>
);
