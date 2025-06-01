import dayjs, { type Dayjs } from 'dayjs';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import { Button, Loader } from '../../../../components';
import { cn } from '../../../../libs/utils';
import { useSeamlessTransactions, useDateIntersectionObserver } from '../../hooks';
import { TransactionGroup } from '../transaction-card';

export interface SeamlessTransactionListProps {
  selectedDate: Dayjs;
  shouldScroll: boolean;
  onTopDateChange?: (date: Dayjs) => void;
  ribbonElement: HTMLElement | null;
}

export interface SeamlessTransactionListRef {
  refreshIfNeeded: (date: Dayjs) => boolean;
}

export const SeamlessTransactionList = forwardRef<SeamlessTransactionListRef, SeamlessTransactionListProps>(
  ({ selectedDate, shouldScroll, onTopDateChange, ribbonElement }, ref) => {
    const isRender = useRef<boolean>(false);

    const { transactionsByDate, isLoading, isError, error, fetchMore, refreshTransactions } = useSeamlessTransactions({
      selectedDate,
      onSuccessLoadInitial: () => {
        isRender.current = true;
      },
    });

    const { setDateGroupRef, initializeObserver, getDateGroupElement } = useDateIntersectionObserver({
      ribbonElement,
      onTopDateChange,
    });

    useImperativeHandle(ref, () => ({
      refreshIfNeeded: (date: Dayjs) => {
        const nodeEl = getDateGroupElement(date.toISOString());
        if (nodeEl) return false;
        refreshTransactions(date.toISOString());
        return true;
      },
    }));

    useEffect(() => {
      const cleanup = initializeObserver();
      return cleanup;
    }, [transactionsByDate, initializeObserver]);

    if (isLoading) {
      return (
        <div className={cn('flex justify-center items-center min-h-[10vh]')}>
          <Loader />
        </div>
      );
    }

    if (isError || error) {
      return (
        <div className={cn('bg-red-50 border border-red-200 rounded-lg p-4')}>
          <p className="text-red-600 text-sm">Failed to load transactions. Please try again.</p>
        </div>
      );
    }

    return (
      <>
        <div className={cn('space-y-4')}>
          {transactionsByDate.map(([dateKey, transactions], index: number) => {
            const date = dayjs(new Date(dateKey)).startOf('day');

            return (
              <div
                key={dateKey}
                ref={setDateGroupRef(dateKey)}
                data-date-key={dateKey}
                className={index > 0 ? 'border-t border-slate-200 pt-4' : undefined}
              >
                <TransactionGroup
                  date={date}
                  shouldScroll={shouldScroll}
                  isParentFinishedToRender={isRender.current}
                  selectedDate={selectedDate}
                  transactions={transactions}
                  ribbonElement={ribbonElement}
                />
              </div>
            );
          })}
        </div>
        <div className={cn('flex justify-center pb-[60vh]')}>
          <Button variant="outline" onClick={fetchMore}>
            Load More Transactions
          </Button>
        </div>
      </>
    );
  }
);
