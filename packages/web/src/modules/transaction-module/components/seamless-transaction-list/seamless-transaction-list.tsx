import { Alert, Button, Icon, Skeleton, Text } from '@dimasbaguspm/versaur';
import dayjs, { type Dayjs } from 'dayjs';
import { AlertCircleIcon } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import { cn } from '../../../../libs/utils';
import { useSeamlessTransactions, useDateIntersectionObserver, useTransactionFilters } from '../../hooks';
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
    useTransactionFilters();
    const isRender = useRef<boolean>(false);

    const filters = useTransactionFilters();
    const { transactionsByDate, isLoading, isError, error, fetchMore, refreshTransactions } = useSeamlessTransactions({
      ...filters,
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
        <div className="flex flex-col gap-4">
          <Skeleton shape="rounded" height={200} />
          <Skeleton shape="rounded" height={200} />
          <Skeleton shape="rounded" height={200} />
          <Skeleton shape="rounded" height={200} />
        </div>
      );
    }

    if (error || isError) {
      return (
        <div className="flex flex-col gap-4 h-[80vh]">
          <div className="grow">
            <Alert icon={<Icon as={AlertCircleIcon} size="md" />} variant="default" color="danger">
              <Text>Failed to load transactions. Please try again later</Text>
            </Alert>
          </div>
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
          <Button variant="outline" onClick={fetchMore} disabled={isLoading}>
            Load More
          </Button>
        </div>
      </>
    );
  }
);
