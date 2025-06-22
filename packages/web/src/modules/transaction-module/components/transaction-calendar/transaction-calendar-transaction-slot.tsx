import type { Dayjs } from 'dayjs';
import { Plus } from 'lucide-react';

import type { Transaction } from '../../../../types/api';

import type { TransactionCalendarItem } from './types';

interface TransactionCalendarTransactionSlotProps {
  date: Dayjs;
  hour: number;
  transactions: TransactionCalendarItem[];
  onAddTransaction?: (date: Dayjs, hour: number) => void;
  onTransactionClick?: (transaction: Transaction) => void;
}

export const TransactionCalendarTransactionSlot = ({
  date,
  hour,
  transactions,
  onAddTransaction,
  onTransactionClick,
}: TransactionCalendarTransactionSlotProps) => (
  <div
    className="h-16 border-b border-mist-200 p-1 hover:bg-slate-50 cursor-pointer relative group"
    onClick={() => onAddTransaction?.(date, hour)}
  >
    {/* add button on hover */}
    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
      <Plus className="h-4 w-4 text-slate-400" />
    </div>
    {/* items */}
    <div className="space-y-1">
      {transactions.map((item) => (
        <div
          key={item.transaction.id}
          className="text-xs p-1 rounded text-white truncate"
          title={item.transaction.note ?? ''}
          onClick={
            onTransactionClick
              ? (e) => {
                  e.stopPropagation();
                  onTransactionClick(item.transaction);
                }
              : undefined
          }
          role={onTransactionClick ? 'button' : undefined}
          tabIndex={onTransactionClick ? 0 : undefined}
        >
          {item.transaction.note}
        </div>
      ))}
    </div>
  </div>
);
