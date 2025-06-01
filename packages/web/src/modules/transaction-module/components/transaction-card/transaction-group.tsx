import dayjs, { type Dayjs } from 'dayjs';
import { debounce } from 'lodash';
import { useEffect, useRef } from 'react';

import { Tile } from '../../../../components/tile/tile';
import { cn } from '../../../../libs/utils';

import { TransactionCard, type Transaction } from './transaction-card';

export interface TransactionGroupProps {
  date: Dayjs;
  selectedDate: Dayjs;
  shouldScroll: boolean;
  transactions: Transaction[];
  isParentFinishedToRender?: boolean;
  ribbonElement?: HTMLElement | null;
}

export function TransactionGroup({
  date,
  selectedDate,
  shouldScroll = false,
  isParentFinishedToRender = false,
  transactions,
  ribbonElement,
}: TransactionGroupProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const debouncedScroll = debounce(() => {
      if (!isParentFinishedToRender) return;

      if (shouldScroll && date.isSame(selectedDate, 'date') && groupRef.current && ribbonElement) {
        const ribbonRect = ribbonElement.getBoundingClientRect();
        const dynamicOffset = ribbonRect.height + 16;

        const elementRect = groupRef.current.getBoundingClientRect();
        const targetScrollTop = window.scrollY + elementRect.top - dynamicOffset;

        window.scrollTo({
          top: Math.max(0, targetScrollTop) + 10,
          behavior: 'smooth',
        });
      }
    }, 100); // 100ms debounce delay

    debouncedScroll();

    return () => {
      debouncedScroll.cancel();
    };
  }, [selectedDate, ribbonElement]);

  const formatDate = (dateToFormat: Dayjs) => {
    const today = dayjs();
    const yesterday = dayjs().subtract(1, 'day');

    // Check if it's today
    if (dateToFormat.isSame(today, 'date')) {
      return 'Today';
    }

    // Check if it's yesterday
    if (dateToFormat.isSame(yesterday, 'date')) {
      return 'Yesterday';
    }

    // Format as regular date
    return dateToFormat.toDate().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTotalAmount = () => {
    return transactions.reduce((total, transaction) => {
      if (transaction.type === 'income') {
        return total + transaction.amount;
      } else if (transaction.type === 'expense') {
        return total - transaction.amount;
      } else {
        // For transfers, we can consider them neutral in terms of net worth
        // or handle them differently based on business logic
        return total;
      }
    }, 0);
  };

  const formatTotalAmount = (amount: number) => {
    const prefix = amount >= 0 ? '+' : '';
    return `${prefix}$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const totalAmount = getTotalAmount();

  return (
    <Tile ref={groupRef}>
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-900">{formatDate(date)}</h3>
          <div className="text-right">
            <p className={cn('font-semibold text-sm', totalAmount >= 0 ? 'text-green-600' : 'text-red-600')}>
              {formatTotalAmount(totalAmount)}
            </p>
            <p className="text-xs text-slate-500">
              {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-slate-400 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">No transactions</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {transactions.map((transaction) => (
            <TransactionCard key={transaction.id} transaction={transaction} />
          ))}
        </div>
      )}
    </Tile>
  );
}
