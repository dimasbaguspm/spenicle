import { createFileRoute } from '@tanstack/react-router';
import dayjs, { Dayjs } from 'dayjs';
import { Filter, Calendar } from 'lucide-react';
import { useRef, useState } from 'react';

import { PageLayout, PageHeader, IconButton, DatePicker } from '../../../components';
import {
  WeeklyDateRibbon,
  SeamlessTransactionList,
  type SeamlessTransactionListRef,
} from '../../../modules/transaction-module';

export const Route = createFileRoute('/_protected/_experienced-user/transactions')({
  component: TransactionsComponent,
});

function TransactionsComponent() {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [shouldScroll, setShouldScroll] = useState(false);

  const ribbonRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<SeamlessTransactionListRef>(null);

  const handleOpenAddTransactionDrawer = () => {
    setIsDatePickerOpen(true);
  };

  const handleDateSelect = (date: Dayjs) => {
    setSelectedDate(date.startOf('day'));
    setShouldScroll(true);

    listRef.current?.refreshIfNeeded(date);
  };

  const handleOnTopDateChange = (date: Dayjs) => {
    setSelectedDate(date.startOf('day'));
    setShouldScroll(false);
  };

  return (
    <PageLayout
      background="cream"
      mainProps={{ padding: 'none' }}
      header={
        <div>
          <PageHeader
            title="Transactions"
            showBackButton={true}
            rightContent={
              <div className="flex items-center gap-2">
                <IconButton
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    handleOpenAddTransactionDrawer();
                  }}
                  title="Select Date"
                >
                  <Calendar className="h-5 w-5" />
                </IconButton>
                <IconButton
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    // TODO: Open filter drawer
                  }}
                  title="Filter Transactions"
                >
                  <Filter className="h-5 w-5" />
                </IconButton>
              </div>
            }
            className="p-4 pb-0 mb-2"
          />
          <DatePicker
            variant="coral"
            showInput={false}
            isOpen={isDatePickerOpen}
            onOpenChange={setIsDatePickerOpen}
            value={selectedDate.toDate()}
            onChange={(data) => {
              if (data) handleDateSelect(dayjs(data).startOf('day'));
            }}
          />
        </div>
      }
    >
      <WeeklyDateRibbon
        ref={ribbonRef}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        variant="default"
        size="md"
        className="mb-6"
      />
      <div className="px-4 space-y-6">
        <SeamlessTransactionList
          ref={listRef}
          selectedDate={selectedDate}
          shouldScroll={shouldScroll}
          onTopDateChange={handleOnTopDateChange}
          ribbonElement={ribbonRef.current}
        />
      </div>
    </PageLayout>
  );
}
