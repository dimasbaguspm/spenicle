import { createFileRoute } from '@tanstack/react-router';
import dayjs, { Dayjs } from 'dayjs';
import { Calendar, Filter } from 'lucide-react';
import { useRef, useState } from 'react';

import { PageLayout, PageHeader, IconButton, DatePicker, Badge } from '../../../components';
import { DRAWER_IDS } from '../../../constants/drawer-id';
import {
  WeeklyDateRibbon,
  SeamlessTransactionList,
  type SeamlessTransactionListRef,
} from '../../../modules/transaction-module';
import { useDrawerRouterProvider } from '../../../providers/drawer-router';

export const Route = createFileRoute('/_protected/_experienced-user/transactions')({
  component: TransactionsComponent,
});

function TransactionsComponent() {
  const { openDrawer } = useDrawerRouterProvider();
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

  const handleOpenFilterDrawer = async () => {
    await openDrawer(DRAWER_IDS.FILTER_TRANSACTION);
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
                <IconButton variant="ghost" size="md" onClick={handleOpenAddTransactionDrawer} title="Select Date">
                  <Calendar className="h-5 w-5" />
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

      <div className="sticky w-full bottom-20 left-0 right-0 translate-y-0 flex justify-center items-center z-3">
        <button className="pointer-events-auto" onClick={handleOpenFilterDrawer} aria-label="Open filter options">
          <Badge variant="info-outline" size="lg" className="bg-white py-2 text-base">
            <Filter className="h-4 w-4 mr-3" />
            Filter
          </Badge>
        </button>
      </div>
    </PageLayout>
  );
}
