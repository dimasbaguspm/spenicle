import { Clipboard } from 'lucide-react';
import React from 'react';

export interface NoTransactionsCardProps {
  message?: string;
}

export const NoTransactionsCard: React.FC<NoTransactionsCardProps> = ({ message = 'No transactions' }) => (
  <div className="flex flex-col items-center justify-center p-8 bg-cream-50 border border-mist-100">
    <div className="text-mist-700 mb-2">
      <Clipboard className="w-8 h-8" />
    </div>
    <p className="text-mist-800 text-sm">{message}</p>
  </div>
);
