import { type Dayjs } from 'dayjs';
import { debounce } from 'lodash';
import { useEffect, useRef } from 'react';

import { Tile } from '../../../../components/tile/tile';
import type { SeamlessTransaction } from '../../hooks/use-seamless-transactions/types';

import { NoTransactionsCard } from './no-transactions-card';
import { TransactionCard } from './transaction-card';
import { TransactionHeader } from './transaction-header';

export interface TransactionGroupProps {
  date: Dayjs;
  selectedDate: Dayjs;
  shouldScroll: boolean;
  transactions: SeamlessTransaction[];
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
    }, 100);
    debouncedScroll();
    return () => {
      debouncedScroll.cancel();
    };
  }, [selectedDate, ribbonElement]);

  const getTotalAmount = () => {
    return transactions.reduce((total, seamlessTransaction) => {
      const { type, amount } = seamlessTransaction.transaction;

      if (type === 'income') {
        return total + Number(amount ?? 0);
      } else if (type === 'expense') {
        return total - Number(amount ?? 0);
      } else {
        return total;
      }
    }, 0);
  };

  const totalAmount = getTotalAmount();

  return (
    <Tile ref={groupRef}>
      <TransactionHeader date={date} totalAmount={totalAmount} transactionCount={transactions.length} />
      {transactions.length === 0 ? (
        <NoTransactionsCard />
      ) : (
        <div className="divide-y divide-mist-200">
          {transactions.map((seamlessTransaction) => (
            <TransactionCard key={seamlessTransaction.transaction.id} transaction={seamlessTransaction} />
          ))}
        </div>
      )}
    </Tile>
  );
}
